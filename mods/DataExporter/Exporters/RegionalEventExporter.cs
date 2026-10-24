using System;
using System.Collections.Generic;
using System.Linq;
using DataExporter.Models;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;

namespace DataExporter.Exporters;

/// <summary>
/// Exports the Dynamic Events settings, the city invasion definitions, and what each event region
/// can host.
/// </summary>
/// <remarks>
/// The game loads the definitions with <c>Resources.LoadAll</c> from <c>RegionalEvents</c>, and the
/// exporter reads them the same way. Region activities come from the game's own discovery, which
/// needs the hosted world because it finds each city's boundary among spawned zone triggers.
/// Schedules, goals and rewards are code, not data.
/// Source: server-scripts/RegionalInvasions.cs:Definitions — Resources.LoadAll from RegionalEvents.
/// Source: server-scripts/NetworkManagerMMO.cs:regionalEvents — the server's RegionalEventSettings.
/// Source: server-scripts/RegionalEventActivities.cs:Discover — fishing, cooking and hunting options per region.
/// </remarks>
public class RegionalEventExporter : BaseExporter
{
    public RegionalEventExporter(MelonLogger.Instance logger, string exportPath)
        : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting regional events...");

        var managers = Resources.FindObjectsOfTypeAll(Il2CppType.Of<Il2Cpp.NetworkManagerMMO>())
            .Select(obj => obj.TryCast<Il2Cpp.NetworkManagerMMO>())
            .Where(manager => manager != null && manager.gameObject != null && manager.gameObject.scene.IsValid())
            .ToList();
        if (managers.Count != 1)
            throw new InvalidOperationException($"Expected one scene NetworkManagerMMO, found {managers.Count}.");
        var settings = managers[0].regionalEvents
            ?? throw new InvalidOperationException("NetworkManagerMMO.regionalEvents is missing.");

        var data = new RegionalEventData
        {
            enabled = settings.enabled,
            activity_duration_minutes = settings.activityDurationMinutes,
            prosperity_duration_minutes = settings.prosperityDurationMinutes,
        };

        var ids = new HashSet<string>(StringComparer.Ordinal);
        foreach (var definition in Resources.LoadAll<Il2Cpp.RegionalInvasionDefinition>("RegionalEvents"))
        {
            if (definition == null || string.IsNullOrEmpty(definition.name))
                throw new InvalidOperationException("A regional invasion definition has no name.");
            var id = SanitizeId(definition.name);
            if (!ids.Add(id))
                throw new InvalidOperationException($"Regional invasion {id} is defined twice.");
            if (string.IsNullOrEmpty(definition.cityName))
                throw new InvalidOperationException($"Regional invasion {id} has no city name.");
            if (definition.attackers == null || definition.attackers.Length == 0)
                throw new InvalidOperationException($"Regional invasion {id} has no attackers.");

            var invasion = new RegionalInvasionData
            {
                id = id,
                city = definition.city.ToString(),
                city_name = definition.cityName,
                zone_id = RequiredZoneId(definition.zone, $"Regional invasion {id}"),
                center = new Point2(definition.center.x, definition.center.y),
                radius = definition.radius,
                health_multiplier = definition.healthMultiplier,
                minimum_level = definition.minimumLevel,
                maximum_level = definition.maximumLevel,
            };
            for (var i = 0; i < definition.attackers.Length; i++)
            {
                var attacker = definition.attackers[i];
                if (attacker == null || string.IsNullOrEmpty(attacker.name))
                    throw new InvalidOperationException($"Regional invasion {id} attacker {i} is missing.");
                invasion.attacker_monster_ids.Add(SanitizeId(attacker.name));
            }
            data.invasions.Add(invasion);
        }
        if (data.invasions.Count == 0)
            throw new InvalidOperationException("No regional invasion definitions were found under RegionalEvents.");

        data.invasions.Sort((a, b) => string.CompareOrdinal(a.id, b.id));
        data.regions = ExportRegions(settings, data.invasions);
        WriteJson(data, "regional_events.json");
        Logger.Msg($"✓ Exported {data.invasions.Count} regional invasions and {data.regions.Count} event regions");
    }

    // Source: server-scripts/RegionalEvents.cs:TryStart — the goal counts up to five players in the region.
    private const int MaxCountedPlayers = 5;

    // Source: server-scripts/RegionalEvents.cs:TryStart — discovery runs with 12 + 3 per extra player as the goal.
    private static int ActivityGoal(int players) => 12 + 3 * (players - 1);

    private static List<RegionalEventRegionData> ExportRegions(
        Il2Cpp.RegionalEventSettings settings, IReadOnlyList<RegionalInvasionData> invasions)
    {
        var duration = Il2Cpp.RegionalEvents.Minutes(settings.activityDurationMinutes, 20f);
        var zones = new List<int>();
        foreach (var entry in Il2Cpp.ZoneInfo.zones)
            zones.Add(entry.Key);
        zones.Sort();

        var regions = new List<RegionalEventRegionData>();
        foreach (var zone in zones.Where(Il2Cpp.RegionalEvents.IsRegion))
        {
            var zoneId = RequiredZoneId(zone, $"Regional event region {zone}");
            var region = new RegionalEventRegionData { zone_id = zoneId };
            var huntPlayers = new Dictionary<string, int>(StringComparer.Ordinal);
            for (var players = 1; players <= MaxCountedPlayers; players++)
            {
                var activities = Il2Cpp.RegionalEventActivities.Discover(zone, ActivityGoal(players), duration)
                    ?? throw new InvalidOperationException($"Region {zoneId}: discovery returned nothing.");
                if (players == 1)
                    ReadRequests(activities, region, invasions);
                // A higher goal only removes animals, so the last goal that keeps one is its limit.
                foreach (var choice in activities.huntChoices)
                    huntPlayers[SanitizeId(choice)] = players;
            }
            region.hunt_targets = huntPlayers
                .Select(pair => new RegionalHuntTargetData { monster_id = pair.Key, max_players = pair.Value })
                .OrderBy(target => target.monster_id, StringComparer.Ordinal)
                .ToList();
            regions.Add(region);
        }
        if (regions.Count == 0)
            throw new InvalidOperationException("No zone is a regional event region.");

        // Source: server-scripts/RegionalEvents.cs:CombatRegion — a dungeon's kills count for its evacuation region.
        var byZoneId = new Dictionary<string, RegionalEventRegionData>(StringComparer.Ordinal);
        foreach (var region in regions)
            byZoneId.Add(region.zone_id, region);
        foreach (var zone in zones)
        {
            var info = RequiredZone(zone, $"Zone {zone}");
            if (!info.isDungeon)
                continue;
            var parent = Il2Cpp.RegionalEvents.CombatRegion(zone);
            if (Il2Cpp.RegionalEvents.IsRegion(parent))
                byZoneId[RequiredZoneId(parent, $"Dungeon {zone} region")].dungeon_zone_ids.Add(SanitizeId(info.name));
        }
        foreach (var region in regions)
            region.dungeon_zone_ids.Sort(StringComparer.Ordinal);
        return regions;
    }

    private static void ReadRequests(
        Il2Cpp.RegionalEventActivities activities, RegionalEventRegionData region,
        IReadOnlyList<RegionalInvasionData> invasions)
    {
        var invasion = invasions.SingleOrDefault(candidate => candidate.zone_id == region.zone_id);
        if (invasion != null && activities.cityBoundary == null)
            throw new InvalidOperationException(
                $"Region {region.zone_id}: the zone trigger for {invasion.city_name} is not spawned. Host the world before exporting.");

        var kinds = new Il2CppSystem.Collections.Generic.List<Il2Cpp.RegionalEventKind>();
        activities.AddAvailableKinds(kinds);
        region.fishing = kinds.Contains(Il2Cpp.RegionalEventKind.FishingSupplies);
        if (!kinds.Contains(Il2Cpp.RegionalEventKind.CookingSupplies))
            return;

        region.cooking_city = activities.City.ToString();
        region.cooking_animal = activities.cookingAnimal;
        foreach (var dish in activities.cityDishes)
        {
            if (dish == null || string.IsNullOrEmpty(dish.name))
                throw new InvalidOperationException($"Region {region.zone_id}: a cooking request dish has no name.");
            region.cooking_dish_ids.Add(SanitizeId(dish.name));
        }
        region.cooking_dish_ids.Sort(StringComparer.Ordinal);

        foreach (var obj in Resources.FindObjectsOfTypeAll(Il2CppType.Of<Il2Cpp.ScriptableItem>()))
        {
            var item = obj.TryCast<Il2Cpp.ScriptableItem>();
            if (item == null || string.IsNullOrEmpty(item.name)
                || Il2Cpp.RegionalEventActivities.MeatAnimal(item.name) != region.cooking_animal)
                continue;
            var id = SanitizeId(item.name);
            if (!region.cooking_meat_ids.Contains(id))
                region.cooking_meat_ids.Add(id);
        }
        if (region.cooking_meat_ids.Count == 0)
            throw new InvalidOperationException($"Region {region.zone_id}: no item counts as {region.cooking_animal} meat.");
        region.cooking_meat_ids.Sort(StringComparer.Ordinal);
    }
}

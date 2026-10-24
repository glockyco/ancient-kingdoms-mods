using System;
using System.Collections.Generic;
using System.Linq;
using DataExporter.Models;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;

namespace DataExporter.Exporters;

/// <summary>
/// Exports the Dynamic Events settings and the city invasion definitions.
/// </summary>
/// <remarks>
/// The game loads the definitions with <c>Resources.LoadAll</c> from <c>RegionalEvents</c>, and the
/// exporter reads them the same way. Schedules, goals and rewards are code, not data.
/// Source: server-scripts/RegionalInvasions.cs:Definitions — Resources.LoadAll from RegionalEvents.
/// Source: server-scripts/NetworkManagerMMO.cs:regionalEvents — the server's RegionalEventSettings.
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
                zone_id = ZoneId(definition.zone, id),
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
        WriteJson(data, "regional_events.json");
        Logger.Msg($"✓ Exported {data.invasions.Count} regional invasions");
    }

    private static string ZoneId(int zone, string invasionId)
    {
        if (zone < byte.MinValue || zone > byte.MaxValue
            || Il2Cpp.ZoneInfo.zones == null || !Il2Cpp.ZoneInfo.zones.ContainsKey((byte)zone))
            throw new InvalidOperationException($"Regional invasion {invasionId} names unknown zone {zone}.");
        var info = Il2Cpp.ZoneInfo.zones[(byte)zone];
        if (info == null || string.IsNullOrEmpty(info.name))
            throw new InvalidOperationException($"Regional invasion {invasionId} names unnamed zone {zone}.");
        return SanitizeId(info.name);
    }
}

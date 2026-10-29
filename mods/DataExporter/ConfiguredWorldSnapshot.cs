using System;
using System.Collections.Generic;
using System.Linq;
using DataExporter.Exporters;
using DataExporter.Models;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;

namespace DataExporter;

/// <summary>Captured once at World scene load, before gameplay can create transient providers.</summary>
public sealed class ConfiguredWorldSnapshot
{
    private readonly ConfiguredValues _values;

    private ConfiguredWorldSnapshot(ConfiguredValues values) => _values = values;

    public void Invalidate() => _values.Invalidate();

    public T Read<T>(string key) => _values.Read<T>(key);

    public static ConfiguredWorldSnapshot Capture(MelonLogger.Instance logger)
    {
        // The callback timing must be verified in the installed host. If it is unsuitable,
        // invoke this same routine from a SceneManager.Internal_SceneLoaded postfix instead.
        var capture = new CaptureExporter(logger);
        capture.Export();
        return new ConfiguredWorldSnapshot(new ConfiguredValues(capture.Values));
    }

    private sealed class CaptureExporter : BaseExporter
    {
        public readonly Dictionary<string, object> Values = new(StringComparer.Ordinal);
        private readonly RecipeDefinitionKeys _keys = new();
        private readonly Dictionary<string, CraftingRecipeData> _crafting = new(StringComparer.Ordinal);
        private readonly Dictionary<string, AlchemyRecipeData> _alchemy = new(StringComparer.Ordinal);
        private readonly Dictionary<string, ScribingRecipeData> _scribing = new(StringComparer.Ordinal);
        private readonly Dictionary<int, string> _monsterIds = new();
        private readonly Dictionary<int, string> _npcIds = new();

        public CaptureExporter(MelonLogger.Instance logger) : base(logger, "") { }

        public override void Export()
        {
            PrepareConfiguredZoneGeometry();
            CaptureMonsters();
            CaptureNpcs();
            CaptureSummonTriggers();
            CaptureStations();
            CapturePortals();
            CaptureCatalog();
            // World objects enumerate in an order a new game build can change, so every captured list is sorted.
            Values.Add("crafting_recipes", ExportJson.SortedRows(_crafting.Values, row => row.definition_key, "crafting_recipes"));
            Values.Add("alchemy_recipes", ExportJson.SortedRows(_alchemy.Values, row => row.definition_key, "alchemy_recipes"));
            Values.Add("scribing_recipes", ExportJson.SortedRows(_scribing.Values, row => row.definition_key, "scribing_recipes"));
        }

        private static IEnumerable<T> WorldObjects<T>() where T : Component
        {
            foreach (var obj in Resources.FindObjectsOfTypeAll(Il2CppType.Of<T>()))
            {
                var component = obj.TryCast<T>();
                if (component != null && component.gameObject != null
                    && component.gameObject.scene.IsValid() && component.gameObject.scene.name == "World")
                    yield return component;
            }
        }

        private static string RequiredItem(Il2Cpp.ScriptableItem item, string context)
        {
            if (item == null || string.IsNullOrEmpty(item.name))
                throw new InvalidOperationException($"{context}: missing required item. Reload World.");
            return GameIds.Sanitize(item.name);
        }

        private static Position Point(Vector3 point) => new(point.x, point.y, point.z);

        private void CaptureMonsters()
        {
            var spawns = new List<MonsterSpawnData>();
            var definitions = new Dictionary<string, MonsterData>(StringComparer.Ordinal);
            foreach (var obj in Resources.FindObjectsOfTypeAll(Il2CppType.Of<Il2Cpp.Monster>()))
            {
                var template = obj.TryCast<Il2Cpp.Monster>();
                if (template == null || string.IsNullOrEmpty(template.name)
                    || (template.gameObject != null && template.gameObject.scene.IsValid()))
                    continue;
                var id = SanitizeId(template.name);
                if (!definitions.ContainsKey(id))
                    definitions.Add(id, MonsterExporter.BuildDefinition(template, id));
            }
            foreach (var monster in WorldObjects<Il2Cpp.Monster>())
            {
                // At scene-load time the authored transform is authoritative, including (0,0).
                var placed = monster.transform.position;
                var zone = GetZoneInfoFromPosition(placed);
                var monsterId = SanitizeId(monster.name);
                if (string.IsNullOrEmpty(monsterId))
                    throw new InvalidOperationException("Configured monster has no identity. Reload World.");
                if (!definitions.ContainsKey(monsterId))
                    definitions.Add(monsterId, MonsterExporter.BuildDefinition(monster, monsterId));
                var spawn = new MonsterSpawnData(
                    PlacementId($"{monsterId}_{zone.ZoneId}", placed), monsterId, zone.ZoneId, Point(placed))
                {
                    sub_zone_id = zone.SubZoneId, level = monster.level.current,
                    health = monster.health?.max ?? 0, damage = monster.combat?.damage ?? 0,
                    magic_damage = monster.combat?.magicDamage ?? 0, defense = monster.combat?.defense ?? 0,
                    magic_resist = monster.combat?.magicResist ?? 0, poison_resist = monster.combat?.poisonResist ?? 0,
                    fire_resist = monster.combat?.fireResist ?? 0, cold_resist = monster.combat?.coldResist ?? 0,
                    disease_resist = monster.combat?.diseaseResist ?? 0,
                    move_probability = monster.moveProbability, move_distance = monster.moveDistance,
                    is_patrolling = monster.isPatrolling,
                    loot_zone_number = monster.idZone, loot_respawn = monster.respawn,
                    loot_exp_multiplier = monster.expMultiplier, loot_is_boss = monster.isBoss,
                    loot_is_elite = monster.isElite, loot_is_hunt = monster.isHunt,
                    loot_is_summoned_pet = monster.isSummonedPet,
                    loot_gold_min = monster.lootGoldMin, loot_gold_max = monster.lootGoldMax,
                    loot_gold_probability = monster.probabilityDropGold
                };
                if (monster.dropChances == null)
                    throw new InvalidOperationException($"{spawn.id}: missing configured drop array. Reload World.");
                foreach (var drop in monster.dropChances)
                {
                    if (drop == null)
                        throw new InvalidOperationException($"{spawn.id}: missing configured drop {spawn.loot_drops.Count}. Reload World.");
                    spawn.loot_drops.Add(new ItemDrop(RequiredItem(drop.item, $"{spawn.id} drop {spawn.loot_drops.Count}"))
                    {
                        rate = drop.probability
                    });
                }
                if (monster.waypointsPatrol != null)
                    foreach (var point in monster.waypointsPatrol)
                        spawn.patrol_waypoints.Add(new Position(point.x, point.y, 0));
                _monsterIds.Add(monster.GetInstanceID(), spawn.id);
                spawns.Add(spawn);
            }
            if (spawns.Count == 0)
                throw new InvalidOperationException("World capture contains no authored monsters. Reload World.");
            Values.Add("monster_spawns", ExportJson.SortedRows(spawns, row => row.id, "monster_spawns"));
            Values.Add("monster_definitions", ExportJson.SortedRows(definitions.Values, row => row.id, "monster_definitions"));
        }

        private List<RecipeOfferData> CraftingOffers(Il2Cpp.CraftingStation station, string context)
        {
            if (station.itemsCrafting == null)
                throw new InvalidOperationException($"{context}: missing itemsCrafting. Reload World.");
            var offers = new List<RecipeOfferData>();
            foreach (var native in station.itemsCrafting)
            {
                if (native == null || native.materials == null)
                    throw new InvalidOperationException($"{context}: invalid crafting offer {offers.Count}. Reload World.");
                var result = RequiredItem(native.itemResult, $"{context} result {offers.Count}");
                var materials = native.materials.Select(material => new CraftingMaterial
                {
                    item_id = RequiredItem(material.item, $"{context} material"), amount = material.amount
                }).ToList();
                var tier = (int)native.itemResult.quality;
                var experience = tier switch { 1 => 150, 2 => 750, 3 => 3500, 4 => 10000, _ => 15 };
                var requiredQuest = native.requiredQuest == null ? null : SanitizeId(native.requiredQuest.name);
                var key = _keys.Register("crafting", result, 1,
                    materials.Select(material => (material.item_id, material.amount)), tier,
                    station.isCookingOven, false, experience, requiredQuest);
                _crafting.TryAdd(key, new CraftingRecipeData
                {
                    id = result, definition_key = key, result_item_id = result, result_amount = 1,
                    tier = tier, experience = experience, is_cooking_oven = station.isCookingOven,
                    materials = materials, station_type = station.isCookingOven ? "cooking" : "crafting",
                    required_quest_id = requiredQuest
                });
                offers.Add(new RecipeOfferData(key) { offer_index = offers.Count });
            }
            return offers;
        }

        private List<RecipeOfferData> TableOffers(Il2Cpp.Table table, string context)
        {
            if (table.itemsTable == null)
                throw new InvalidOperationException($"{context}: missing itemsTable. Reload World.");
            var offers = new List<RecipeOfferData>();
            foreach (var native in table.itemsTable)
            {
                if (native == null || native.ingredients == null)
                    throw new InvalidOperationException($"{context}: invalid table offer {offers.Count}. Reload World.");
                var result = RequiredItem(native.itemResult, $"{context} result {offers.Count}");
                var ingredients = native.ingredients.Select(material =>
                    (ItemId: RequiredItem(material.item, $"{context} ingredient"), Amount: material.amount)).ToList();
                var kind = table.isScribingTable ? "scribing" : "alchemy";
                int? experience = table.isScribingTable ? null
                    : native.level switch { 1 => 300, 2 => 2000, 3 => 5000, 4 => 12000, _ => 20 };
                var key = _keys.Register(kind, result, 1, ingredients, native.level, false, table.isScribingTable, experience);
                if (table.isScribingTable)
                    _scribing.TryAdd(key, new ScribingRecipeData
                    {
                        id = result, definition_key = key, result_item_id = result, level_required = native.level,
                        tier = native.level, experience = experience, is_scribing_table = true,
                        materials = ingredients.Select(value => new ScribingMaterial { item_id = value.ItemId, amount = value.Amount }).ToList()
                    });
                else
                    _alchemy.TryAdd(key, new AlchemyRecipeData
                    {
                        id = result, definition_key = key, result_item_id = result, level_required = native.level,
                        tier = native.level, experience = experience,
                        materials = ingredients.Select(value => new AlchemyMaterial { item_id = value.ItemId, amount = value.Amount }).ToList()
                    });
                offers.Add(new RecipeOfferData(key) { offer_index = offers.Count });
            }
            return offers;
        }

        private void CaptureStations()
        {
            var crafting = new List<CraftingStationData>();
            var alchemy = new List<AlchemyTableData>();
            var scribing = new List<ScribingTableData>();
            foreach (var station in WorldObjects<Il2Cpp.CraftingStation>())
            {
                var placed = station.transform.position;
                var zone = GetZoneInfoFromPosition(placed);
                var name = station.nameOverlay != null && !string.IsNullOrEmpty(station.nameOverlay.text)
                    ? station.nameOverlay.text : station.name;
                var id = PlacementId($"{SanitizeId(name)}_{zone.ZoneId}", placed);
                crafting.Add(new CraftingStationData
                {
                    id = id, name = name, zone_id = zone.ZoneId, sub_zone_id = zone.SubZoneId,
                    position = Point(placed), is_cooking_oven = station.isCookingOven,
                    recipe_offers = CraftingOffers(station, id)
                });
            }
            foreach (var table in WorldObjects<Il2Cpp.Table>())
            {
                var placed = table.transform.position;
                var zone = GetZoneInfoFromPosition(placed);
                var name = table.nameOverlay != null && !string.IsNullOrEmpty(table.nameOverlay.text)
                    ? table.nameOverlay.text : table.name;
                var id = PlacementId($"{SanitizeId(name)}_{zone.ZoneId}", placed);
                var offers = TableOffers(table, id);
                if (table.isScribingTable)
                    scribing.Add(new ScribingTableData { id = id, name = name, zone_id = zone.ZoneId,
                        sub_zone_id = zone.SubZoneId, position = Point(placed), recipe_offers = offers });
                else
                    alchemy.Add(new AlchemyTableData { id = id, name = name, zone_id = zone.ZoneId,
                        sub_zone_id = zone.SubZoneId, position = Point(placed), recipe_offers = offers });
            }
            Values.Add("crafting_stations", ExportJson.SortedRows(crafting, row => row.id, "crafting_stations"));
            Values.Add("alchemy_tables", ExportJson.SortedRows(alchemy, row => row.id, "alchemy_tables"));
            Values.Add("scribing_tables", ExportJson.SortedRows(scribing, row => row.id, "scribing_tables"));
        }

        private string RequiredMonster(Il2Cpp.Monster monster, string context)
        {
            if (monster == null) return null;
            if (_monsterIds.TryGetValue(monster.GetInstanceID(), out var id)) return id;
            throw new InvalidOperationException($"{context}: required monster is not a captured authored placement. Reload World.");
        }

        private PortalData Portal(Vector3 placed, Transform destination, bool interactable,
            Il2Cpp.ScriptableItem key, int level, int itemLevel, Vector2 orientation, Il2Cpp.Monster monster,
            bool everyone, bool closed, bool loreTrial)
        {
            if (destination == null)
                throw new InvalidOperationException($"Portal at {placed} has no destination. Reload World.");
            var from = GetZoneInfoFromPosition(placed);
            var to = GetZoneInfoFromPosition(destination.position);
            var id = PlacementId($"{(interactable ? "iportal" : "portal")}_{from.ZoneId}_to_{to.ZoneId}", placed);
            return new PortalData(id, from.ZoneId, Point(placed), to.ZoneId, Point(destination.position),
                new Position(orientation.x, orientation.y, 0))
            {
                is_interactable = interactable,
                from_sub_zone_id = from.SubZoneId, to_sub_zone_id = to.SubZoneId,
                required_item_id = key == null ? null : RequiredItem(key, id),
                level_required = level, item_level_required = itemLevel,
                need_monster_dead_id = monster == null ? null : SanitizeId(monster.name),
                need_monster_dead_spawn_id = RequiredMonster(monster, id),
                requires_everyone_key = everyone, is_closed = closed, requires_lore_trial = loreTrial
            };
        }

        private void CapturePortals()
        {
            var portals = new List<PortalData>();
            foreach (var portal in WorldObjects<Il2Cpp.Portal>())
            {
                // Native portal interaction is a no-op without a configured destination.
                if (portal.destination == null) continue;
                portals.Add(Portal(portal.transform.position, portal.destination, false, portal.key,
                    portal.levelRequired, portal.itemLevelRequired, portal.orientation, portal.needMonsterDead,
                    portal.requiresEveryoneKey, portal.isClosed, portal.requiresLoreTrial));
            }
            foreach (var portal in WorldObjects<Il2Cpp.InteractablePortal>())
            {
                if (portal.destination == null) continue;
                portals.Add(Portal(portal.transform.position, portal.destination, true, portal.key,
                    portal.levelRequired, portal.itemLevelRequired, portal.orientation, portal.needMonsterDead, false, false, false));
            }
            Values.Add("portals", ExportJson.SortedRows(portals, row => row.id, "portals"));
        }

        private void CaptureNpcs()
        {
            var spawns = new List<NpcSpawnData>();
            foreach (var npc in WorldObjects<Il2Cpp.Npc>())
            {
                var placed = npc.transform.position;
                var zone = GetZoneInfoFromPosition(placed);
                var name = SanitizeId(npc.name);
                if (string.IsNullOrEmpty(name))
                    throw new InvalidOperationException("Configured NPC has no identity. Reload World.");
                var followOrigin = npc.originFollowPosition == Vector2.zero
                    ? new Vector2(placed.x, placed.y) : npc.originFollowPosition;
                var spawn = new NpcSpawnData(
                    PlacementId($"{name}_{zone.ZoneId}", placed), name, zone.ZoneId, Point(placed),
                    new Position(followOrigin.x, followOrigin.y, 0))
                {
                    sub_zone_id = zone.SubZoneId,
                    follow_distance = npc.followDistance, move_distance = npc.moveDistance,
                    move_probability = npc.moveProbability
                };
                if (npc.waypointsPatrol != null)
                    foreach (var waypoint in npc.waypointsPatrol)
                        spawn.patrol_waypoints.Add(new Position(waypoint.x, waypoint.y, 0));
                if (npc.teleport != null && npc.teleport.destinationPosition != Vector2.zero)
                {
                    var destination = npc.teleport.destinationPosition;
                    var destinationZone = GetZoneInfoFromPosition(new Vector3(destination.x, destination.y, 0));
                    spawn.teleport_zone_id = destinationZone.ZoneId;
                    spawn.teleport_destination = new Position(destination.x, destination.y, 0);
                    spawn.teleport_price = npc.teleport.priceTravel;
                    spawn.teleport_message = string.IsNullOrEmpty(npc.teleport.messageText)
                        ? null : npc.teleport.messageText;
                }
                _npcIds.Add(npc.GetInstanceID(), spawn.id);
                spawns.Add(spawn);
            }
            Values.Add("npc_spawns", ExportJson.SortedRows(spawns, row => row.id, "npc_spawns"));
        }

        private void CaptureSummonTriggers()
        {
            var triggers = new List<SummonTriggerData>();
            var ids = new HashSet<string>(StringComparer.Ordinal);
            foreach (var trigger in WorldObjects<Il2Cpp.SummonMonster>())
            {
                if (trigger.summonEntity == null || trigger.placeHolders == null || trigger.placeHolders.Count == 0)
                    throw new InvalidOperationException($"Summon trigger {trigger.name}: missing configured target or guard group. Reload World.");
                SummonTriggerData row;
                var monster = trigger.summonEntity.TryCast<Il2Cpp.Monster>();
                var npc = trigger.summonEntity.TryCast<Il2Cpp.Npc>();
                if (monster != null)
                {
                    row = new SummonTriggerData("Monster", SanitizeId(monster.name), monster.name,
                        Point(trigger.transform.position), monster.summonMessage ?? "");
                    row.summoned_monster_spawn_id = RequiredMonster(monster, $"Summon trigger {trigger.name}");
                    row.summoned_is_summonable = monster.isSummonable;
                    row.summoned_respawn_time = monster.respawnTime;
                    row.summoned_respawn_probability = monster.probabilityRespawn;
                    row.summoned_death_time = monster.deathTime;
                }
                else if (npc != null)
                {
                    if (!_npcIds.TryGetValue(npc.GetInstanceID(), out var spawnId))
                        throw new InvalidOperationException($"Summon trigger {trigger.name}: NPC target is not an authored captured placement. Reload World.");
                    row = new SummonTriggerData("Npc", SanitizeId(npc.name), npc.name,
                        Point(trigger.transform.position), "");
                    row.summoned_npc_spawn_id = spawnId;
                    row.summoned_is_summonable = npc.isSummonable;
                    row.summoned_respawn_time = npc.respawnTime;
                    row.summoned_respawn_probability = npc.probabilityRespawn;
                }
                else
                    throw new InvalidOperationException($"Summon trigger {trigger.name}: unsupported target type. Reload World.");
                if (!ids.Add(row.id))
                    throw new InvalidOperationException($"Conflicting summon trigger ID {row.id}. Reload World.");
                foreach (var placeholder in trigger.placeHolders)
                {
                    if (placeholder == null)
                        throw new InvalidOperationException($"{row.id}: missing configured guard. Reload World.");
                    row.placeholder_monster_ids.Add(RequiredMonster(placeholder, row.id));
                }
                row.zone_id = RequiredZoneId(trigger.placeHolders[0].idZone, $"{row.id} guard zone (reload World)");
                triggers.Add(row);
            }
            Values.Add("summon_triggers", ExportJson.SortedRows(triggers, row => row.id, "summon_triggers"));
        }

        private static string ComponentPath<T>(Transform root, T component) where T : Component
        {
            var path = new List<int>();
            var current = component.transform;
            while (current != root)
            {
                if (current == null)
                    throw new InvalidOperationException("Housing workstation lies outside its configured prefab.");
                path.Add(current.GetSiblingIndex());
                current = current.parent;
            }
            path.Reverse();
            var components = component.gameObject.GetComponents<T>();
            for (var index = 0; index < components.Length; index++)
                if (components[index].GetInstanceID() == component.GetInstanceID())
                    return $"{string.Join("/", path)}:{index}";
            throw new InvalidOperationException("Housing workstation component cannot be resolved.");
        }

        private void CaptureCatalog()
        {
            var manager = Il2Cpp.GameManager.singleton;
            var journal = Il2Cpp.UIJournal.singleton;
            var housing = Il2Cpp.HousingManager.singleton;
            if (manager == null || journal == null || housing == null || journal.fish == null
                || manager.randomTrashFish == null || housing.strucItems == null)
                throw new InvalidOperationException("Configured World registries are unavailable. Reload World.");
            Values.Add("lockpicks", RequiredItem(manager.lockpicks, "GameManager.lockpicks"));
            var journalFish = new List<string>();
            foreach (var item in journal.fish)
                journalFish.Add(RequiredItem(item, "UIJournal.fish"));
            Values.Add("journal_fish", journalFish);
            Values.Add("trash_fish", manager.randomTrashFish.Select(item => RequiredItem(item, "GameManager.randomTrashFish")).ToList());
            var catalog = new List<HousingCatalogData>();
            foreach (var item in housing.strucItems)
            {
                var id = RequiredItem(item, "HousingManager.strucItems");
                if (item.struc == null)
                    throw new InvalidOperationException($"Housing catalog {id}: missing structure prefab. Reload World.");
                var row = new HousingCatalogData(id);
                foreach (var station in item.struc.GetComponentsInChildren<Il2Cpp.CraftingStation>(true))
                    row.workstations.Add(new HomeWorkstationData(ComponentPath(item.struc.transform, station), "crafting")
                    {
                        recipe_offers = CraftingOffers(station, $"housing {id}")
                    });
                foreach (var table in item.struc.GetComponentsInChildren<Il2Cpp.Table>(true))
                    row.workstations.Add(new HomeWorkstationData(
                        ComponentPath(item.struc.transform, table), table.isScribingTable ? "scribing" : "alchemy")
                    {
                        recipe_offers = TableOffers(table, $"housing {id}")
                    });
                catalog.Add(row);
            }
            Values.Add("housing_catalog", catalog);
        }
    }
}

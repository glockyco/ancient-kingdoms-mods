using System.Collections.Generic;
using System.Linq;
using DataExporter.Models;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;

namespace DataExporter.Exporters;

public class MonsterExporter : BaseExporter
{
    public MonsterExporter(MelonLogger.Instance logger, string exportPath) : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting monsters...");

        var type = Il2CppType.Of<Il2Cpp.Monster>();
        var monsters = Resources.FindObjectsOfTypeAll(type);

        Logger.Msg($"Found {monsters.Length} monster objects total");

        var monsterList = new List<MonsterData>();
        var templateCount = 0;

        foreach (var obj in monsters)
        {
            var monster = obj.TryCast<Il2Cpp.Monster>();
            if (monster == null || string.IsNullOrEmpty(monster.name))
                continue;

            var isTemplate = monster.gameObject == null || !monster.gameObject.scene.IsValid();
            var zoneId = GetMonsterZoneId(monster);

            if (isTemplate)
                templateCount++;

            var monsterData = new MonsterData
            {
                // Identity
                id = isTemplate
                    ? monster.name.ToLowerInvariant().Replace(" ", "_")
                    : $"{monster.name.ToLowerInvariant().Replace(" ", "_")}_{zoneId}_{monster.GetInstanceID()}",
                name = monster.name,
                zone_id = zoneId,
                position = isTemplate
                    ? null
                    : new Position(
                        monster.transform.position.x,
                        monster.transform.position.y,
                        monster.transform.position.z
                    ),
                is_template = isTemplate,

                // Base stats
                level = monster.level.current,
                health = monster.health.max,
                type_name = monster.typeMonster ?? "Unknown",
                class_name = monster.classMonster ?? "Unknown",

                // Classification flags
                is_boss = monster.isBoss,
                is_elite = monster.isElite,
                is_hunt = monster.isHunt,
                is_dummy = monster.isDummy,
                is_summonable = monster.isSummonable,
                is_halloween = monster.isHalloween,

                // Combat flags
                see_invisibility = monster.seeInvisibility,
                is_immune_debuffs = monster.isImmuneDebuffs,
                yell_friends = monster.yellFriends,
                flee_on_low_hp = monster.fleeOnLowHP,
                no_aggro_monster = monster.noAggroMonster,

                // Spawning and respawn
                does_respawn = monster.respawn,
                respawn_time = (int)monster.respawnTime,
                respawn_probability = monster.probabilityRespawn,
                spawn_time_start = monster.startSpawnTime,
                spawn_time_end = monster.endSpawnTime,
                placeholder_spawn_probability = monster.probSpawnPH,
                placeholder_monster_id = monster.monsterPH != null && !string.IsNullOrEmpty(monster.monsterPH.name)
                    ? monster.monsterPH.name.ToLowerInvariant().Replace(" ", "_")
                    : null,

                // Loot and rewards
                gold_min = monster.lootGoldMin,
                gold_max = monster.lootGoldMax,
                probability_drop_gold = monster.probabilityDropGold,
                exp_multiplier = monster.expMultiplier,

                // Movement and patrol
                move_probability = monster.moveProbability,
                move_distance = monster.moveDistance,
                is_patrolling = monster.isPatrolling,

                // Messages and interactions
                aggro_message_probability = monster.aggroMessageProbability,
                summon_message = monster.summonMessage,

                // Lore and visuals (boss-specific)
                lore_boss = monster.loreBoss
            };

            // Export patrol waypoints
            if (monster.waypointsPatrol != null && monster.waypointsPatrol.Length > 0)
            {
                foreach (var waypoint in monster.waypointsPatrol)
                {
                    monsterData.patrol_waypoints.Add(new Position(waypoint.x, waypoint.y, 0));
                }
            }

            // Export aggro messages
            if (monster.aggroMessages != null && monster.aggroMessages.Count > 0)
            {
                foreach (var msg in monster.aggroMessages)
                {
                    if (!string.IsNullOrEmpty(msg))
                    {
                        monsterData.aggro_messages.Add(msg);
                    }
                }
            }

            // Export faction changes
            if (monster.improveFaction != null && monster.improveFaction.Count > 0)
            {
                foreach (var faction in monster.improveFaction)
                {
                    if (!string.IsNullOrEmpty(faction))
                    {
                        monsterData.improve_faction.Add(faction);
                    }
                }
            }
            if (monster.decreaseFaction != null && monster.decreaseFaction.Count > 0)
            {
                foreach (var faction in monster.decreaseFaction)
                {
                    if (!string.IsNullOrEmpty(faction))
                    {
                        monsterData.decrease_faction.Add(faction);
                    }
                }
            }

            // Export drops
            if (monster.dropChances != null && monster.dropChances.Count > 0)
            {
                foreach (var drop in monster.dropChances)
                {
                    if (drop.item != null)
                    {
                        monsterData.drops.Add(new ItemDrop
                        {
                            item_id = drop.item.name.ToLowerInvariant().Replace(" ", "_"),
                            rate = drop.probability
                        });
                    }
                }
            }

            monsterList.Add(monsterData);
        }

        WriteJson(monsterList, "monsters.json");
        Logger.Msg($"✓ Exported {monsterList.Count} monsters");
    }

    private string GetMonsterZoneId(Il2Cpp.Monster monster)
    {
        return GetZoneIdFromByte((byte)monster.idZone);
    }

    private string GetZoneIdFromByte(byte zoneId)
    {
        if (Il2Cpp.ZoneInfo.zones != null && Il2Cpp.ZoneInfo.zones.ContainsKey(zoneId))
        {
            var zone = Il2Cpp.ZoneInfo.zones[zoneId];
            if (zone != null && !string.IsNullOrEmpty(zone.name))
            {
                return zone.name.ToLowerInvariant().Replace(" ", "_");
            }
        }

        return "unknown";
    }
}

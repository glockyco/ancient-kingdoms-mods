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

        // Group monsters by name to identify canonical entities
        var monstersByName = new Dictionary<string, List<Il2Cpp.Monster>>();
        var templateCount = 0;
        var spawnCount = 0;

        foreach (var obj in monsters)
        {
            var monster = obj.TryCast<Il2Cpp.Monster>();
            if (monster == null || string.IsNullOrEmpty(monster.name))
                continue;

            var sanitizedName = SanitizeId(monster.name);
            if (!monstersByName.ContainsKey(sanitizedName))
            {
                monstersByName[sanitizedName] = new List<Il2Cpp.Monster>();
            }
            monstersByName[sanitizedName].Add(monster);

            var isTemplate = monster.gameObject == null || !monster.gameObject.scene.IsValid();
            if (isTemplate)
                templateCount++;
            else
                spawnCount++;
        }

        Logger.Msg($"Found {monstersByName.Count} unique monsters ({templateCount} templates, {spawnCount} spawns)");

        var monsterList = new List<MonsterData>();
        var spawnList = new List<MonsterSpawnData>();

        // Process each monster group
        foreach (var (name, group) in monstersByName)
        {
            // Find canonical monster (prefer template)
            Il2Cpp.Monster canonical = group.FirstOrDefault(m => m.gameObject == null || !m.gameObject.scene.IsValid())
                                     ?? group.First();

            var monsterData = new MonsterData
            {
                // Identity
                id = name,  // canonical ID (sanitized name)
                name = canonical.name,

                // Base stats
                level = canonical.level.current,
                health = canonical.health.max,
                type_name = canonical.typeMonster ?? "Unknown",
                class_name = canonical.classMonster ?? "Unknown",
                zone_bestiary = canonical.zoneMonster ?? "",

                // Combat stats (calculated at base level)
                damage = canonical.combat?.damage ?? 0,
                magic_damage = canonical.combat?.magicDamage ?? 0,
                defense = canonical.combat?.defense ?? 0,
                magic_resist = canonical.combat?.magicResist ?? 0,
                poison_resist = canonical.combat?.poisonResist ?? 0,
                fire_resist = canonical.combat?.fireResist ?? 0,
                cold_resist = canonical.combat?.coldResist ?? 0,
                disease_resist = canonical.combat?.diseaseResist ?? 0,
                block_chance = canonical.combat?.blockChance ?? 0,
                critical_chance = canonical.combat?.criticalChance ?? 0,

                // Stat scaling (LinearInt: actual = base + bonus_per_level * (level - 1))
                health_base = canonical.health?.baseHealth.baseValue ?? 0,
                health_per_level = canonical.health?.baseHealth.bonusPerLevel ?? 0,
                damage_base = canonical.combat?.baseDamage.baseValue ?? 0,
                damage_per_level = canonical.combat?.baseDamage.bonusPerLevel ?? 0,
                magic_damage_base = canonical.combat?.baseMagicDamage.baseValue ?? 0,
                magic_damage_per_level = canonical.combat?.baseMagicDamage.bonusPerLevel ?? 0,
                defense_base = canonical.combat?.baseDefense.baseValue ?? 0,
                defense_per_level = canonical.combat?.baseDefense.bonusPerLevel ?? 0,
                magic_resist_base = canonical.combat?.baseMagicResist.baseValue ?? 0,
                magic_resist_per_level = canonical.combat?.baseMagicResist.bonusPerLevel ?? 0,
                poison_resist_base = canonical.combat?.basePoisonResist.baseValue ?? 0,
                poison_resist_per_level = canonical.combat?.basePoisonResist.bonusPerLevel ?? 0,
                fire_resist_base = canonical.combat?.baseFireResist.baseValue ?? 0,
                fire_resist_per_level = canonical.combat?.baseFireResist.bonusPerLevel ?? 0,
                cold_resist_base = canonical.combat?.baseColdResist.baseValue ?? 0,
                cold_resist_per_level = canonical.combat?.baseColdResist.bonusPerLevel ?? 0,
                disease_resist_base = canonical.combat?.baseDiseaseResist.baseValue ?? 0,
                disease_resist_per_level = canonical.combat?.baseDiseaseResist.bonusPerLevel ?? 0,

                // Classification flags
                is_boss = canonical.isBoss,
                is_elite = canonical.isElite,
                is_hunt = canonical.isHunt,
                is_dummy = canonical.isDummy,
                is_summonable = canonical.isSummonable,
                is_halloween = canonical.isHalloween,
                is_forgotten_altar_event = canonical.isForgotttenAltarEvent,

                // Combat flags
                see_invisibility = canonical.seeInvisibility,
                is_immune_debuffs = canonical.isImmuneDebuffs,
                yell_friends = canonical.yellFriends,
                flee_on_low_hp = canonical.fleeOnLowHP,
                no_aggro_monster = canonical.noAggroMonster,
                has_aura = canonical.hasAura,
                follow_distance = canonical.followDistance,

                // Spawning and respawn
                does_respawn = canonical.respawn,
                death_time = canonical.deathTime,
                respawn_time = canonical.respawnTime,
                respawn_probability = canonical.probabilityRespawn,
                spawn_time_start = canonical.startSpawnTime,
                spawn_time_end = canonical.endSpawnTime,
                placeholder_spawn_probability = canonical.probSpawnPH,
                placeholder_monster_id = canonical.monsterPH != null && !string.IsNullOrEmpty(canonical.monsterPH.name)
                    ? SanitizeId(canonical.monsterPH.name)
                    : null,

                // Loot and rewards
                gold_min = canonical.lootGoldMin,
                gold_max = canonical.lootGoldMax,
                probability_drop_gold = canonical.probabilityDropGold,
                exp_multiplier = canonical.expMultiplier,

                // Messages and interactions
                aggro_message_probability = canonical.aggroMessageProbability,
                summon_message = canonical.summonMessage,

                // Lore and visuals (boss-specific)
                lore_boss = canonical.loreBoss
            };

            // Export aggro messages
            if (canonical.aggroMessages != null && canonical.aggroMessages.Count > 0)
            {
                foreach (var msg in canonical.aggroMessages)
                {
                    if (!string.IsNullOrEmpty(msg))
                    {
                        monsterData.aggro_messages.Add(msg);
                    }
                }
            }

            // Export faction changes
            if (canonical.improveFaction != null && canonical.improveFaction.Count > 0)
            {
                foreach (var faction in canonical.improveFaction)
                {
                    if (!string.IsNullOrEmpty(faction))
                    {
                        monsterData.improve_faction.Add(faction);
                    }
                }
            }
            if (canonical.decreaseFaction != null && canonical.decreaseFaction.Count > 0)
            {
                foreach (var faction in canonical.decreaseFaction)
                {
                    if (!string.IsNullOrEmpty(faction))
                    {
                        monsterData.decrease_faction.Add(faction);
                    }
                }
            }

            // Export drops
            if (canonical.dropChances != null && canonical.dropChances.Count > 0)
            {
                foreach (var drop in canonical.dropChances)
                {
                    if (drop.item != null)
                    {
                        monsterData.drops.Add(new ItemDrop
                        {
                            item_id = SanitizeId(drop.item.name),
                            rate = drop.probability
                        });
                    }
                }
            }

            // Export skill IDs (skill_ids[0] is default attack, [1+] are special abilities)
            if (canonical.skills != null && canonical.skills.skillTemplates != null)
            {
                foreach (var skillTemplate in canonical.skills.skillTemplates)
                {
                    if (skillTemplate != null && !string.IsNullOrEmpty(skillTemplate.name))
                    {
                        monsterData.skill_ids.Add(SanitizeId(skillTemplate.name));
                    }
                }
            }

            monsterList.Add(monsterData);

            // Export spawn points for all instances (including non-templates)
            foreach (var monster in group)
            {
                var isTemplate = monster.gameObject == null || !monster.gameObject.scene.IsValid();
                if (isTemplate)
                    continue;  // Skip templates - they don't have spawn locations

                var zoneInfo = GetZoneInfoFromPosition(monster.transform.position);
                var spawnData = new MonsterSpawnData
                {
                    id = $"{name}_{zoneInfo.ZoneId}_{monster.GetInstanceID()}",
                    monster_id = name,  // reference to canonical monster
                    zone_id = zoneInfo.ZoneId,
                    sub_zone_id = zoneInfo.SubZoneId,
                    position = new Position(
                        monster.transform.position.x,
                        monster.transform.position.y,
                        monster.transform.position.z
                    ),
                    level = monster.level.current,
                    move_probability = monster.moveProbability,
                    move_distance = monster.moveDistance,
                    is_patrolling = monster.isPatrolling
                };

                // Export patrol waypoints for this spawn
                if (monster.waypointsPatrol != null && monster.waypointsPatrol.Length > 0)
                {
                    foreach (var waypoint in monster.waypointsPatrol)
                    {
                        spawnData.patrol_waypoints.Add(new Position(waypoint.x, waypoint.y, 0));
                    }
                }

                spawnList.Add(spawnData);
            }
        }

        WriteJson(monsterList, "monsters.json");
        WriteJson(spawnList, "monster_spawns.json");
        Logger.Msg($"✓ Exported {monsterList.Count} canonical monsters and {spawnList.Count} spawn points");
    }
}

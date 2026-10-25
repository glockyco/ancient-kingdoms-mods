using System.Collections.Generic;
using System.Linq;
using DataExporter.Models;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;

namespace DataExporter.Exporters;

public class MonsterExporter : BaseExporter
{
    private readonly ConfiguredWorldSnapshot _snapshot;
    public MonsterExporter(MelonLogger.Instance logger, string exportPath, VisualAssetRegistry visualAssets,
        ConfiguredWorldSnapshot snapshot) : base(logger, exportPath, visualAssets)
    {
        _snapshot = snapshot;
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
        var capturedDefinitions = new Dictionary<string, MonsterData>(System.StringComparer.Ordinal);
        foreach (var definition in _snapshot.Read<List<MonsterData>>("monster_definitions"))
            capturedDefinitions.Add(definition.id, definition);

        foreach (var obj in monsters)
        {
            var monster = obj.TryCast<Il2Cpp.Monster>();
            if (monster == null || string.IsNullOrEmpty(monster.name))
                continue;
            // Live instances can supply artwork, never definition facts or placement membership.
            if (!capturedDefinitions.ContainsKey(SanitizeId(monster.name)))
                continue;

            var sanitizedName = SanitizeId(monster.name);
            if (!monstersByName.ContainsKey(sanitizedName))
            {
                monstersByName[sanitizedName] = new List<Il2Cpp.Monster>();
            }
            monstersByName[sanitizedName].Add(monster);

            if (monster.gameObject == null || !monster.gameObject.scene.IsValid())
                templateCount++;
        }

        Logger.Msg($"Found {monstersByName.Count} unique configured monsters ({templateCount} templates)");

        var monsterList = new List<MonsterData>();
        var spawnList = _snapshot.Read<List<MonsterSpawnData>>("monster_spawns");

        // Process each monster group
        foreach (var (name, group) in monstersByName)
        {
            var template = group.FirstOrDefault(m => m.gameObject == null || !m.gameObject.scene.IsValid());
            var canonical = template ?? group.First();
            var monsterData = capturedDefinitions[name];


            var sceneVisualSource = group.FirstOrDefault(m =>
                m.gameObject != null && m.gameObject.scene.IsValid());
            var visualSource = SelectEntityVisualSource(
                canonical.gameObject,
                sceneVisualSource?.gameObject);
            ExportEntitySprite("monster", name, "Monster.gameObject", visualSource);
            VisualAssets?.ExportSprite(
                "monster",
                name,
                "portrait",
                "Monster.portraitBoss",
                canonical.portraitBoss != null ? canonical.portraitBoss.GetType().FullName : "UnityEngine.Sprite",
                canonical.portraitBoss != null ? canonical.portraitBoss.name : null,
                canonical.portraitBoss);
            VisualAssets?.ExportSprite(
                "monster",
                name,
                "bestiary",
                "Monster.imageBossBestiary",
                canonical.imageBossBestiary != null ? canonical.imageBossBestiary.GetType().FullName : "UnityEngine.Sprite",
                canonical.imageBossBestiary != null ? canonical.imageBossBestiary.name : null,
                canonical.imageBossBestiary);


            monsterList.Add(monsterData);

        }
        foreach (var definition in capturedDefinitions.Values)
            if (!monstersByName.ContainsKey(definition.id))
                monsterList.Add(definition);

        WriteJson(ExportJson.SortedRows(monsterList, row => row.id, "monsters"), "monsters.json");
        WriteJson(spawnList, "monster_spawns.json");
        Logger.Msg($"✓ Exported {monsterList.Count} canonical monsters and {spawnList.Count} spawn points");
    }

    internal static MonsterData BuildDefinition(Il2Cpp.Monster canonical, string name)
    {
            var monsterData = new MonsterData(name, canonical.name,
                canonical.typeMonster ?? "Unknown", canonical.classMonster ?? "Unknown", canonical.zoneMonster ?? "")
            {
                // Identity
                loot_zone_number = canonical.idZone,
                is_summoned_pet = canonical.isSummonedPet,

                // Base stats
                level = canonical.level.current,
                health = canonical.health.max,

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
                accuracy = canonical.combat?.accuracy ?? 0,
                fear_immune = canonical.combat?.fearImmune ?? false,

                // Stat scaling (LinearInt/LinearFloat: actual = base + bonus_per_level * (level - 1))
                health_base = canonical.health?.baseHealth.baseValue ?? 0,
                health_per_level = canonical.health?.baseHealth.bonusPerLevel ?? 0,
                health_multiplier = canonical.health?.multiplierHealth ?? 1f,
                health_regen_base = canonical.health?.baseRecoveryRate ?? 0,
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
                block_chance_base = canonical.combat?.baseBlockChance.baseValue ?? 0,
                block_chance_per_level = canonical.combat?.baseBlockChance.bonusPerLevel ?? 0,
                critical_chance_base = canonical.combat?.baseCriticalChance.baseValue ?? 0,
                critical_chance_per_level = canonical.combat?.baseCriticalChance.bonusPerLevel ?? 0,
                accuracy_base = canonical.combat?.baseAccuracy.baseValue ?? 0,
                accuracy_per_level = canonical.combat?.baseAccuracy.bonusPerLevel ?? 0,

                // Mana scaling
                mana = canonical.mana?.max ?? 0,
                mana_base = canonical.mana?.baseMana.baseValue ?? 0,
                mana_per_level = canonical.mana?.baseMana.bonusPerLevel ?? 0,

                // Movement and detection
                speed = canonical._speed,

                // Classification flags
                is_boss = canonical.isBoss,
                is_world_boss = Il2Cpp.Utils.worldBosses.Contains(canonical.name),
                is_elite = canonical.isElite,
                is_fabled = canonical.isFabled,
                is_hunt = canonical.isHunt,
                is_dummy = canonical.isDummy,
                is_summonable = canonical.isSummonable,
                // Monster.isHalloween is the game's only monster season gate (Monster.cs:UpdateServer_DEAD).
                season = canonical.isHalloween ? "halloween" : null,
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

            // Export aggro range from AggroArea child component's CircleCollider2D
            var aggroArea = canonical.GetComponentInChildren<Il2Cpp.AggroArea>();
            if (aggroArea != null)
            {
                var collider = aggroArea.GetComponent<CircleCollider2D>();
                if (collider != null)
                {
                    monsterData.aggro_range = collider.radius;
                }
            }

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

            if (canonical.dropChances == null)
                throw new System.InvalidOperationException($"{name}: missing template drop array. Reload World.");
            foreach (var drop in canonical.dropChances)
            {
                if (drop == null || drop.item == null || string.IsNullOrEmpty(drop.item.name))
                    throw new System.InvalidOperationException($"{name}: missing template drop item. Reload World.");
                monsterData.drops.Add(new ItemDrop(SanitizeId(drop.item.name))
                {
                    rate = drop.probability
                });
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
        return monsterData;
    }
}

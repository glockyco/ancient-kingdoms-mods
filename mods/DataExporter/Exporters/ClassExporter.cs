using System.Collections.Generic;
using DataExporter.Models;
using MelonLoader;

namespace DataExporter.Exporters;

public class ClassExporter : BaseExporter
{
    public ClassExporter(MelonLogger.Instance logger, string exportPath) : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting class combat stats...");

        var networkManager = Il2CppMirror.NetworkManager.singleton;
        if (networkManager == null)
        {
            Logger.Warning("NetworkManager.singleton is null, cannot export classes");
            return;
        }

        var nmmo = networkManager.TryCast<Il2Cpp.NetworkManagerMMO>();
        if (nmmo == null)
        {
            Logger.Warning("Could not cast to NetworkManagerMMO, cannot export classes");
            return;
        }

        var playerClasses = nmmo.playerClasses;
        if (playerClasses == null)
        {
            Logger.Warning("playerClasses is null, cannot export classes");
            return;
        }

        Logger.Msg($"Found {playerClasses.Count} player classes");

        var classList = new List<ClassCombatData>();

        foreach (var player in playerClasses)
        {
            if (player == null) continue;

            var rawName = player.name;
            if (string.IsNullOrEmpty(rawName)) continue;

            // Sanitize class name: "Player Cleric" -> "cleric"
            var classId = rawName.ToLowerInvariant()
                .Replace("player ", "")
                .Replace(" ", "_")
                .Trim();

            // Derive display name from the class ID portion
            var displayName = rawName.Replace("Player ", "");

            // Determine resource type from which resource pool has meaningful scaling
            // Warriors and Rogues use energy; Clerics, Wizards, Druids, Rangers use mana
            var resourceType = "mana";
            if (player.energy != null && player.energy.baseEnergy.bonusPerLevel > 0
                && (player.mana == null || player.mana.baseMana.bonusPerLevel == 0))
            {
                resourceType = "energy";
            }

            var data = new ClassCombatData
            {
                id = classId,
                name = displayName,
                resource_type = resourceType,

                // Health scaling (from Health component)
                base_health_value = player.health?.baseHealth.baseValue ?? 0,
                base_health_per_level = player.health?.baseHealth.bonusPerLevel ?? 0,

                // Mana scaling (from Mana component)
                base_mana_value = player.mana?.baseMana.baseValue ?? 0,
                base_mana_per_level = player.mana?.baseMana.bonusPerLevel ?? 0,

                // Energy scaling (from Energy component)
                base_energy_value = player.energy?.baseEnergy.baseValue ?? 0,
                base_energy_per_level = player.energy?.baseEnergy.bonusPerLevel ?? 0,

                // Combat stat scaling (from Combat component)
                base_damage_value = player.combat?.baseDamage.baseValue ?? 0,
                base_damage_per_level = player.combat?.baseDamage.bonusPerLevel ?? 0,
                base_magic_damage_value = player.combat?.baseMagicDamage.baseValue ?? 0,
                base_magic_damage_per_level = player.combat?.baseMagicDamage.bonusPerLevel ?? 0,
                base_defense_value = player.combat?.baseDefense.baseValue ?? 0,
                base_defense_per_level = player.combat?.baseDefense.bonusPerLevel ?? 0,
                base_magic_resist_value = player.combat?.baseMagicResist.baseValue ?? 0,
                base_magic_resist_per_level = player.combat?.baseMagicResist.bonusPerLevel ?? 0,
                base_poison_resist_value = player.combat?.basePoisonResist.baseValue ?? 0,
                base_poison_resist_per_level = player.combat?.basePoisonResist.bonusPerLevel ?? 0,
                base_fire_resist_value = player.combat?.baseFireResist.baseValue ?? 0,
                base_fire_resist_per_level = player.combat?.baseFireResist.bonusPerLevel ?? 0,
                base_cold_resist_value = player.combat?.baseColdResist.baseValue ?? 0,
                base_cold_resist_per_level = player.combat?.baseColdResist.bonusPerLevel ?? 0,
                base_disease_resist_value = player.combat?.baseDiseaseResist.baseValue ?? 0,
                base_disease_resist_per_level = player.combat?.baseDiseaseResist.bonusPerLevel ?? 0,
                base_block_chance_value = player.combat?.baseBlockChance.baseValue ?? 0,
                base_block_chance_per_level = player.combat?.baseBlockChance.bonusPerLevel ?? 0,
                base_accuracy_value = player.combat?.baseAccuracy.baseValue ?? 0,
                base_accuracy_per_level = player.combat?.baseAccuracy.bonusPerLevel ?? 0,
                base_critical_chance_value = player.combat?.baseCriticalChance.baseValue ?? 0,
                base_critical_chance_per_level = player.combat?.baseCriticalChance.bonusPerLevel ?? 0,
            };

            Logger.Msg($"  {displayName}: damage={data.base_damage_value}+{data.base_damage_per_level}/lvl, " +
                       $"magic_damage={data.base_magic_damage_value}+{data.base_magic_damage_per_level}/lvl, " +
                       $"health={data.base_health_value}+{data.base_health_per_level}/lvl");

            classList.Add(data);
        }

        // Write to classes_combat.json (separate from manually curated classes.json)
        WriteJson(classList, "classes_combat.json");
        Logger.Msg($"Exported {classList.Count} class combat stat sets");
    }
}

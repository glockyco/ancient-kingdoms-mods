using System.Collections.Generic;
using System.Linq;
using DataExporter.Models;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;

namespace DataExporter.Exporters;

public class PetExporter : BaseExporter
{
    public PetExporter(MelonLogger.Instance logger, string exportPath) : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting pets...");

        var type = Il2CppType.Of<Il2Cpp.Pet>();
        var pets = Resources.FindObjectsOfTypeAll(type);

        Logger.Msg($"Found {pets.Length} pet objects total");

        // Collect only template pets (prefabs not in a valid scene).
        // Scene instances are per-character runtime objects and must not be exported.
        var petsByName = new Dictionary<string, Il2Cpp.Pet>();

        foreach (var obj in pets)
        {
            var pet = obj.TryCast<Il2Cpp.Pet>();
            if (pet == null || string.IsNullOrEmpty(pet.name))
                continue;

            var isTemplate = pet.gameObject == null || !pet.gameObject.scene.IsValid();
            if (!isTemplate)
                continue;

            var sanitizedName = SanitizeId(pet.name);
            petsByName[sanitizedName] = pet;
        }

        Logger.Msg($"Found {petsByName.Count} template pets");

        var petList = new List<PetData>();

        foreach (var (name, pet) in petsByName)
        {
            var petData = new PetData
            {
                id = name,
                name = pet.name,
                is_familiar = pet.isFamiliar,
                is_mercenary = pet.isMercenary,
                type_monster = pet.typeMonster ?? "Creature",
                has_buffs = pet.hasBuffs,
                has_heals = pet.hasHeals,
                level = pet.level?.current ?? 0,
                health = pet.health?.max ?? 0,
                damage = pet.combat?.damage ?? 0,
                magic_damage = pet.combat?.magicDamage ?? 0,
                defense = pet.combat?.defense ?? 0,
                magic_resist = pet.combat?.magicResist ?? 0,
                poison_resist = pet.combat?.poisonResist ?? 0,
                fire_resist = pet.combat?.fireResist ?? 0,
                cold_resist = pet.combat?.coldResist ?? 0,
                disease_resist = pet.combat?.diseaseResist ?? 0,
                block_chance = pet.combat?.blockChance ?? 0,
                critical_chance = pet.combat?.criticalChance ?? 0,

                // Stat scaling (LinearInt/LinearFloat: actual = base + per_level * (level - 1))
                health_base = pet.health?.baseHealth.baseValue ?? 0,
                health_per_level = pet.health?.baseHealth.bonusPerLevel ?? 0,
                damage_base = pet.combat?.baseDamage.baseValue ?? 0,
                damage_per_level = pet.combat?.baseDamage.bonusPerLevel ?? 0,
                magic_damage_base = pet.combat?.baseMagicDamage.baseValue ?? 0,
                magic_damage_per_level = pet.combat?.baseMagicDamage.bonusPerLevel ?? 0,
                defense_base = pet.combat?.baseDefense.baseValue ?? 0,
                defense_per_level = pet.combat?.baseDefense.bonusPerLevel ?? 0,
                magic_resist_base = pet.combat?.baseMagicResist.baseValue ?? 0,
                magic_resist_per_level = pet.combat?.baseMagicResist.bonusPerLevel ?? 0,
                poison_resist_base = pet.combat?.basePoisonResist.baseValue ?? 0,
                poison_resist_per_level = pet.combat?.basePoisonResist.bonusPerLevel ?? 0,
                fire_resist_base = pet.combat?.baseFireResist.baseValue ?? 0,
                fire_resist_per_level = pet.combat?.baseFireResist.bonusPerLevel ?? 0,
                cold_resist_base = pet.combat?.baseColdResist.baseValue ?? 0,
                cold_resist_per_level = pet.combat?.baseColdResist.bonusPerLevel ?? 0,
                disease_resist_base = pet.combat?.baseDiseaseResist.baseValue ?? 0,
                disease_resist_per_level = pet.combat?.baseDiseaseResist.bonusPerLevel ?? 0,
                block_chance_base = pet.combat?.baseBlockChance.baseValue ?? 0,
                block_chance_per_level = pet.combat?.baseBlockChance.bonusPerLevel ?? 0,
                critical_chance_base = pet.combat?.baseCriticalChance.baseValue ?? 0,
                critical_chance_per_level = pet.combat?.baseCriticalChance.bonusPerLevel ?? 0,

                icon_path = pet.portraitIcon != null ? pet.portraitIcon.name : null
            };

            // Export skill IDs from PetSkills component
            if (pet.skills != null && pet.skills.skillTemplates != null)
            {
                foreach (var skillTemplate in pet.skills.skillTemplates)
                {
                    if (skillTemplate != null && !string.IsNullOrEmpty(skillTemplate.name))
                    {
                        petData.skill_ids.Add(SanitizeId(skillTemplate.name));
                    }
                }
            }

            petList.Add(petData);
        }

        WriteJson(petList, "pets.json");
        Logger.Msg($"✓ Exported {petList.Count} pets");
    }
}

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

        // Group pets by name to identify unique definitions (prefer templates)
        var petsByName = new Dictionary<string, Il2Cpp.Pet>();
        var templateCount = 0;

        foreach (var obj in pets)
        {
            var pet = obj.TryCast<Il2Cpp.Pet>();
            if (pet == null || string.IsNullOrEmpty(pet.name))
                continue;

            var isTemplate = pet.gameObject == null || !pet.gameObject.scene.IsValid();
            var sanitizedName = SanitizeId(pet.name);

            // Prefer templates over scene instances for base stats
            if (!petsByName.ContainsKey(sanitizedName) || isTemplate)
            {
                petsByName[sanitizedName] = pet;
                if (isTemplate) templateCount++;
            }
        }

        Logger.Msg($"Found {petsByName.Count} unique pets ({templateCount} templates)");

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

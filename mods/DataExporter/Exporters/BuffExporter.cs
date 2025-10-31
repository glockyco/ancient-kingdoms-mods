using System.Collections.Generic;
using DataExporter.Models;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;

namespace DataExporter.Exporters;

public class BuffExporter : BaseExporter
{
    public BuffExporter(MelonLogger.Instance logger, string exportPath)
        : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting buffs/debuffs...");

        var type = Il2CppType.Of<Il2Cpp.BuffSkill>();
        var buffs = Resources.FindObjectsOfTypeAll(type);

        var buffList = new List<BuffData>();

        foreach (var obj in buffs)
        {
            var buff = obj.TryCast<Il2Cpp.BuffSkill>();
            if (buff == null || string.IsNullOrEmpty(buff.name))
                continue;

            var buffData = new BuffData
            {
                id = buff.name.ToLowerInvariant().Replace(" ", "_"),
                name = buff.nameSkill ?? buff.name,
                duration_base = buff.buffTime.baseValue,
                duration_per_level = buff.buffTime.bonusPerLevel,
                remain_after_death = buff.remainAfterDeath,
                category = buff.categoryBuff ?? "unknown",

                // Behavior flags
                is_invisibility = buff.invisibility,
                is_undead_illusion = buff.undeadIlussion,
                is_poison_debuff = buff.isPoisonDebuff,
                is_fire_debuff = buff.isFireDebuff,
                is_cold_debuff = buff.isColdDebuff,
                is_disease_debuff = buff.isDiseaseDebuff,
                is_melee_debuff = buff.isMeleeDebuff,
                is_cleanse = buff.isCleanseSpell,
                is_dispel = buff.isDispel,
                is_ward = buff.isWard,
                is_blindness = buff.isBlindness,
                is_avatar_war = buff.isAvatarWar,
                is_only_for_magic_classes = buff.isOnlyForMagicClasses,
                is_permanent = buff.isPermanent,
                prob_ignore_cleanse = buff.probIgnoreCleanse,

                // Stat bonuses
                health_max_bonus = new LinearStatBonus { base_value = buff.healthMaxBonus.baseValue, bonus_per_level = buff.healthMaxBonus.bonusPerLevel },
                health_max_percent_bonus = new LinearStatBonusFloat { base_value = buff.healthMaxPercentBonus.baseValue, bonus_per_level = buff.healthMaxPercentBonus.bonusPerLevel },
                mana_max_bonus = new LinearStatBonus { base_value = buff.manaMaxBonus.baseValue, bonus_per_level = buff.manaMaxBonus.bonusPerLevel },
                mana_max_percent_bonus = new LinearStatBonusFloat { base_value = buff.manaMaxPercentBonus.baseValue, bonus_per_level = buff.manaMaxPercentBonus.bonusPerLevel },
                energy_max_bonus = new LinearStatBonus { base_value = buff.energyMaxBonus.baseValue, bonus_per_level = buff.energyMaxBonus.bonusPerLevel },
                damage_bonus = new LinearStatBonus { base_value = buff.damageBonus.baseValue, bonus_per_level = buff.damageBonus.bonusPerLevel },
                damage_percent_bonus = new LinearStatBonusFloat { base_value = buff.damagePercentBonus.baseValue, bonus_per_level = buff.damagePercentBonus.bonusPerLevel },
                magic_damage_percent_bonus = new LinearStatBonusFloat { base_value = buff.magicDamagePercentBonus.baseValue, bonus_per_level = buff.magicDamagePercentBonus.bonusPerLevel },
                magic_damage_bonus = new LinearStatBonus { base_value = buff.magicDamageBonus.baseValue, bonus_per_level = buff.magicDamageBonus.bonusPerLevel },
                defense_bonus = new LinearStatBonus { base_value = buff.defenseBonus.baseValue, bonus_per_level = buff.defenseBonus.bonusPerLevel },
                magic_resist_bonus = new LinearStatBonus { base_value = buff.magicResistBonus.baseValue, bonus_per_level = buff.magicResistBonus.bonusPerLevel },
                poison_resist_bonus = new LinearStatBonus { base_value = buff.poisonResistBonus.baseValue, bonus_per_level = buff.poisonResistBonus.bonusPerLevel },
                fire_resist_bonus = new LinearStatBonus { base_value = buff.fireResistBonus.baseValue, bonus_per_level = buff.fireResistBonus.bonusPerLevel },
                cold_resist_bonus = new LinearStatBonus { base_value = buff.coldResistBonus.baseValue, bonus_per_level = buff.coldResistBonus.bonusPerLevel },
                disease_resist_bonus = new LinearStatBonus { base_value = buff.diseaseResistBonus.baseValue, bonus_per_level = buff.diseaseResistBonus.bonusPerLevel },
                block_chance_bonus = new LinearStatBonusFloat { base_value = buff.blockChanceBonus.baseValue, bonus_per_level = buff.blockChanceBonus.bonusPerLevel },
                accuracy_bonus = new LinearStatBonusFloat { base_value = buff.accuracyBonus.baseValue, bonus_per_level = buff.accuracyBonus.bonusPerLevel },
                critical_chance_bonus = new LinearStatBonusFloat { base_value = buff.criticalChanceBonus.baseValue, bonus_per_level = buff.criticalChanceBonus.bonusPerLevel },
                haste_bonus = new LinearStatBonusFloat { base_value = buff.hasteBonus.baseValue, bonus_per_level = buff.hasteBonus.bonusPerLevel },
                spell_haste_bonus = new LinearStatBonusFloat { base_value = buff.spellHasteBonus.baseValue, bonus_per_level = buff.spellHasteBonus.bonusPerLevel },
                health_percent_per_second_bonus = new LinearStatBonusFloat { base_value = buff.healthPercentPerSecondBonus.baseValue, bonus_per_level = buff.healthPercentPerSecondBonus.bonusPerLevel },
                healing_per_second_bonus = new LinearStatBonus { base_value = buff.healingPerSecondBonus.baseValue, bonus_per_level = buff.healingPerSecondBonus.bonusPerLevel },
                mana_percent_per_second_bonus = new LinearStatBonusFloat { base_value = buff.manaPercentPerSecondBonus.baseValue, bonus_per_level = buff.manaPercentPerSecondBonus.bonusPerLevel },
                mana_per_second_bonus = new LinearStatBonus { base_value = buff.manaPerSecondBonus.baseValue, bonus_per_level = buff.manaPerSecondBonus.bonusPerLevel },
                energy_percent_per_second_bonus = new LinearStatBonusFloat { base_value = buff.energyPercentPerSecondBonus.baseValue, bonus_per_level = buff.energyPercentPerSecondBonus.bonusPerLevel },
                speed_bonus = new LinearStatBonusFloat { base_value = buff.speedBonus.baseValue, bonus_per_level = buff.speedBonus.bonusPerLevel },
                damage_shield = new LinearStatBonus { base_value = buff.damageShield.baseValue, bonus_per_level = buff.damageShield.bonusPerLevel },
                cooldown_reduction_percent = new LinearStatBonusFloat { base_value = buff.cooldownReductionPercent.baseValue, bonus_per_level = buff.cooldownReductionPercent.bonusPerLevel },

                // Attribute bonuses
                strength_bonus = new LinearStatBonus { base_value = buff.strengthBonus.baseValue, bonus_per_level = buff.strengthBonus.bonusPerLevel },
                intelligence_bonus = new LinearStatBonus { base_value = buff.intelligenceBonus.baseValue, bonus_per_level = buff.intelligenceBonus.bonusPerLevel },
                dexterity_bonus = new LinearStatBonus { base_value = buff.dexterityBonus.baseValue, bonus_per_level = buff.dexterityBonus.bonusPerLevel },
                charisma_bonus = new LinearStatBonus { base_value = buff.charismaBonus.baseValue, bonus_per_level = buff.charismaBonus.bonusPerLevel },
                wisdom_bonus = new LinearStatBonus { base_value = buff.wisdomBonus.baseValue, bonus_per_level = buff.wisdomBonus.bonusPerLevel },
                constitution_bonus = new LinearStatBonus { base_value = buff.constitutionBonus.baseValue, bonus_per_level = buff.constitutionBonus.bonusPerLevel }
            };

            buffList.Add(buffData);
        }

        WriteJson(buffList, "buffs.json");
        Logger.Msg($"✓ Exported {buffList.Count} buffs/debuffs");
    }
}

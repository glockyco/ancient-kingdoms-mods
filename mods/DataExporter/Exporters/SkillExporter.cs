using System.Collections.Generic;
using DataExporter.Models;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;

namespace DataExporter.Exporters;

public class SkillExporter : BaseExporter
{
    public SkillExporter(MelonLogger.Instance logger, string exportPath) : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting skills...");

        var type = Il2CppType.Of<Il2Cpp.ScriptableSkill>();
        var skills = Resources.FindObjectsOfTypeAll(type);

        var skillList = new List<SkillData>();

        foreach (var obj in skills)
        {
            var skill = obj.TryCast<Il2Cpp.ScriptableSkill>();
            if (skill == null || string.IsNullOrEmpty(skill.name))
                continue;

            var skillData = new SkillData
            {
                // Base ScriptableSkill fields
                id = skill.name.ToLowerInvariant().Replace(" ", "_"),
                name = skill.nameSkill ?? skill.name,
                skill_type = DetermineSkillType(skill),
                tier = skill.tier,
                max_level = skill.maxLevel,
                level_required = skill.requiredLevel.Get(1),
                required_skill_points = skill.requiredSkillPoints.Get(1),
                required_spent_points = skill.requiredSpentPoints,
                prerequisite_skill_id = skill.predecessor != null && !string.IsNullOrEmpty(skill.predecessor.name)
                    ? skill.predecessor.name.ToLowerInvariant().Replace(" ", "_")
                    : null,
                prerequisite_level = skill.predecessorLevel,
                prerequisite2_skill_id = skill.predecessor2 != null && !string.IsNullOrEmpty(skill.predecessor2.name)
                    ? skill.predecessor2.name.ToLowerInvariant().Replace(" ", "_")
                    : null,
                prerequisite2_level = skill.predecessorLevel2,
                required_weapon_category = skill.requiredWeaponCategory ?? "",
                mana_cost = skill.manaCosts.Get(1),
                energy_cost = skill.energyCosts.Get(1),
                cooldown = skill.cooldown.Get(1),
                cast_time = skill.castTime.Get(1),
                cast_range = skill.castRange.Get(1),
                learn_default = skill.learnDefault,
                show_cast_bar = skill.showCastBar,
                cancel_cast_if_target_died = skill.cancelCastIfTargetDied,
                allow_dungeon = skill.allowDungeon,
                is_spell = skill.isSpell,
                is_veteran = skill.isVeteran,
                is_mercenary_skill = skill.isMercenarySkill,
                is_pet_skill = skill.isPetSkill,
                followup_default_attack = skill.followupDefaultAttack,
                skill_aggro_message = skill.skillAggroMessage ?? "",
                tooltip = skill.ToolTip(1, false, false) ?? "",
                icon_path = skill.image != null ? skill.image.name : ""
            };

            // Try to cast to specific skill types and populate type-specific fields
            PopulateDamageSkillFields(skill, skillData);
            PopulateHealSkillFields(skill, skillData);
            PopulateBonusSkillFields(skill, skillData);  // Covers BuffSkill and PassiveSkill
            PopulateSummonSkillFields(skill, skillData);

            skillList.Add(skillData);
        }

        WriteJson(skillList, "skills.json");
        Logger.Msg($"✓ Exported {skillList.Count} skills");
    }

    private string DetermineSkillType(Il2Cpp.ScriptableSkill skill)
    {
        // Check specific types in order of specificity
        var damageSkill = skill.TryCast<Il2Cpp.DamageSkill>();
        if (damageSkill != null)
        {
            if (skill.TryCast<Il2Cpp.AreaDamageSkill>() != null) return "area_damage";
            if (skill.TryCast<Il2Cpp.FrontalDamageSkill>() != null) return "frontal_damage";
            if (skill.TryCast<Il2Cpp.FrontalProjectilesSkill>() != null) return "frontal_projectiles";
            if (skill.TryCast<Il2Cpp.TargetDamageSkill>() != null) return "target_damage";
            if (skill.TryCast<Il2Cpp.TargetProjectileSkill>() != null) return "target_projectile";
            return "damage";  // Generic DamageSkill
        }

        var healSkill = skill.TryCast<Il2Cpp.HealSkill>();
        if (healSkill != null)
        {
            if (skill.TryCast<Il2Cpp.AreaHealSkill>() != null) return "area_heal";
            if (skill.TryCast<Il2Cpp.TargetHealSkill>() != null) return "target_heal";
            return "heal";  // Generic HealSkill
        }

        var buffSkill = skill.TryCast<Il2Cpp.BuffSkill>();
        if (buffSkill != null)
        {
            // Check debuff flags to classify as buff or debuff
            bool isDebuff = buffSkill.isPoisonDebuff || buffSkill.isFireDebuff ||
                           buffSkill.isColdDebuff || buffSkill.isDiseaseDebuff ||
                           buffSkill.isMeleeDebuff;

            if (skill.TryCast<Il2Cpp.AreaBuffSkill>() != null) return isDebuff ? "area_debuff" : "area_buff";
            if (skill.TryCast<Il2Cpp.AreaDebuffSkill>() != null) return "area_debuff";
            if (skill.TryCast<Il2Cpp.TargetBuffSkill>() != null) return isDebuff ? "target_debuff" : "target_buff";
            if (skill.TryCast<Il2Cpp.TargetDebuffSkill>() != null) return "target_debuff";
            return isDebuff ? "debuff" : "buff";
        }

        var passiveSkill = skill.TryCast<Il2Cpp.PassiveSkill>();
        if (passiveSkill != null) return "passive";

        var summonSkill = skill.TryCast<Il2Cpp.SummonSkill>();
        if (summonSkill != null) return "summon";

        return "unknown";
    }

    private void PopulateDamageSkillFields(Il2Cpp.ScriptableSkill skill, SkillData skillData)
    {
        var damageSkill = skill.TryCast<Il2Cpp.DamageSkill>();
        if (damageSkill == null) return;

        skillData.damage = new LinearStatBonus
        {
            base_value = damageSkill.damage.baseValue,
            bonus_per_level = damageSkill.damage.bonusPerLevel
        };
        skillData.damage_percent = new LinearStatBonusFloat
        {
            base_value = damageSkill.damagePercent.baseValue,
            bonus_per_level = damageSkill.damagePercent.bonusPerLevel
        };
        skillData.damage_type = damageSkill.damageType.ToString();
        skillData.is_assassination_skill = damageSkill.isAssasinationSkill;
        skillData.is_manaburn_skill = damageSkill.isManaburnSkill;
        skillData.lifetap_percent = new LinearStatBonusFloat
        {
            base_value = damageSkill.lifetapPercent.baseValue,
            bonus_per_level = damageSkill.lifetapPercent.bonusPerLevel
        };
        skillData.base_skill = damageSkill.baseSkill;
        skillData.knockback_chance = new LinearStatBonusFloat
        {
            base_value = damageSkill.knockbackChance.baseValue,
            bonus_per_level = damageSkill.knockbackChance.bonusPerLevel
        };
        skillData.stun_chance = new LinearStatBonusFloat
        {
            base_value = damageSkill.stunChance.baseValue,
            bonus_per_level = damageSkill.stunChance.bonusPerLevel
        };
        skillData.stun_time = new LinearStatBonusFloat
        {
            base_value = damageSkill.stunTime.baseValue,
            bonus_per_level = damageSkill.stunTime.bonusPerLevel
        };
        skillData.fear_chance = new LinearStatBonusFloat
        {
            base_value = damageSkill.fearChance.baseValue,
            bonus_per_level = damageSkill.fearChance.bonusPerLevel
        };
        skillData.fear_time = new LinearStatBonusFloat
        {
            base_value = damageSkill.fearTime.baseValue,
            bonus_per_level = damageSkill.fearTime.bonusPerLevel
        };
        skillData.aggro = new LinearStatBonus
        {
            base_value = damageSkill.aggro.baseValue,
            bonus_per_level = damageSkill.aggro.bonusPerLevel
        };
        skillData.break_armor_prob = damageSkill.breakArmorProb;

        // AreaDamageSkill specific
        var areaDamageSkill = skill.TryCast<Il2Cpp.AreaDamageSkill>();
        if (areaDamageSkill != null)
        {
            skillData.affects_random_target = areaDamageSkill.affectsRandomTarget;
        }
    }

    private void PopulateHealSkillFields(Il2Cpp.ScriptableSkill skill, SkillData skillData)
    {
        var healSkill = skill.TryCast<Il2Cpp.HealSkill>();
        if (healSkill == null) return;

        skillData.heals_health = new LinearStatBonus
        {
            base_value = healSkill.healsHealth.baseValue,
            bonus_per_level = healSkill.healsHealth.bonusPerLevel
        };
        skillData.heals_mana = new LinearStatBonus
        {
            base_value = healSkill.healsMana.baseValue,
            bonus_per_level = healSkill.healsMana.bonusPerLevel
        };
        skillData.is_balance_health = healSkill.isBalanceHealth;

        // TargetHealSkill specific
        var targetHealSkill = skill.TryCast<Il2Cpp.TargetHealSkill>();
        if (targetHealSkill != null)
        {
            skillData.is_resurrect_skill = targetHealSkill.isResurrectSkill;
            skillData.can_heal_self = targetHealSkill.canHealSelf;
            skillData.can_heal_others = targetHealSkill.canHealOthers;
        }
    }

    private void PopulateBonusSkillFields(Il2Cpp.ScriptableSkill skill, SkillData skillData)
    {
        var bonusSkill = skill.TryCast<Il2Cpp.BonusSkill>();
        if (bonusSkill == null) return;

        // Stat bonuses (shared by BuffSkill and PassiveSkill)
        skillData.health_max_bonus = new LinearStatBonus { base_value = bonusSkill.healthMaxBonus.baseValue, bonus_per_level = bonusSkill.healthMaxBonus.bonusPerLevel };
        skillData.health_max_percent_bonus = new LinearStatBonusFloat { base_value = bonusSkill.healthMaxPercentBonus.baseValue, bonus_per_level = bonusSkill.healthMaxPercentBonus.bonusPerLevel };
        skillData.mana_max_bonus = new LinearStatBonus { base_value = bonusSkill.manaMaxBonus.baseValue, bonus_per_level = bonusSkill.manaMaxBonus.bonusPerLevel };
        skillData.mana_max_percent_bonus = new LinearStatBonusFloat { base_value = bonusSkill.manaMaxPercentBonus.baseValue, bonus_per_level = bonusSkill.manaMaxPercentBonus.bonusPerLevel };
        skillData.energy_max_bonus = new LinearStatBonus { base_value = bonusSkill.energyMaxBonus.baseValue, bonus_per_level = bonusSkill.energyMaxBonus.bonusPerLevel };
        skillData.damage_bonus = new LinearStatBonus { base_value = bonusSkill.damageBonus.baseValue, bonus_per_level = bonusSkill.damageBonus.bonusPerLevel };
        skillData.damage_percent_bonus = new LinearStatBonusFloat { base_value = bonusSkill.damagePercentBonus.baseValue, bonus_per_level = bonusSkill.damagePercentBonus.bonusPerLevel };
        skillData.magic_damage_percent_bonus = new LinearStatBonusFloat { base_value = bonusSkill.magicDamagePercentBonus.baseValue, bonus_per_level = bonusSkill.magicDamagePercentBonus.bonusPerLevel };
        skillData.magic_damage_bonus = new LinearStatBonus { base_value = bonusSkill.magicDamageBonus.baseValue, bonus_per_level = bonusSkill.magicDamageBonus.bonusPerLevel };
        skillData.defense_bonus = new LinearStatBonus { base_value = bonusSkill.defenseBonus.baseValue, bonus_per_level = bonusSkill.defenseBonus.bonusPerLevel };
        skillData.magic_resist_bonus = new LinearStatBonus { base_value = bonusSkill.magicResistBonus.baseValue, bonus_per_level = bonusSkill.magicResistBonus.bonusPerLevel };
        skillData.poison_resist_bonus = new LinearStatBonus { base_value = bonusSkill.poisonResistBonus.baseValue, bonus_per_level = bonusSkill.poisonResistBonus.bonusPerLevel };
        skillData.fire_resist_bonus = new LinearStatBonus { base_value = bonusSkill.fireResistBonus.baseValue, bonus_per_level = bonusSkill.fireResistBonus.bonusPerLevel };
        skillData.cold_resist_bonus = new LinearStatBonus { base_value = bonusSkill.coldResistBonus.baseValue, bonus_per_level = bonusSkill.coldResistBonus.bonusPerLevel };
        skillData.disease_resist_bonus = new LinearStatBonus { base_value = bonusSkill.diseaseResistBonus.baseValue, bonus_per_level = bonusSkill.diseaseResistBonus.bonusPerLevel };
        skillData.block_chance_bonus = new LinearStatBonusFloat { base_value = bonusSkill.blockChanceBonus.baseValue, bonus_per_level = bonusSkill.blockChanceBonus.bonusPerLevel };
        skillData.accuracy_bonus = new LinearStatBonusFloat { base_value = bonusSkill.accuracyBonus.baseValue, bonus_per_level = bonusSkill.accuracyBonus.bonusPerLevel };
        skillData.critical_chance_bonus = new LinearStatBonusFloat { base_value = bonusSkill.criticalChanceBonus.baseValue, bonus_per_level = bonusSkill.criticalChanceBonus.bonusPerLevel };
        skillData.haste_bonus = new LinearStatBonusFloat { base_value = bonusSkill.hasteBonus.baseValue, bonus_per_level = bonusSkill.hasteBonus.bonusPerLevel };
        skillData.spell_haste_bonus = new LinearStatBonusFloat { base_value = bonusSkill.spellHasteBonus.baseValue, bonus_per_level = bonusSkill.spellHasteBonus.bonusPerLevel };
        skillData.health_percent_per_second_bonus = new LinearStatBonusFloat { base_value = bonusSkill.healthPercentPerSecondBonus.baseValue, bonus_per_level = bonusSkill.healthPercentPerSecondBonus.bonusPerLevel };
        skillData.healing_per_second_bonus = new LinearStatBonus { base_value = bonusSkill.healingPerSecondBonus.baseValue, bonus_per_level = bonusSkill.healingPerSecondBonus.bonusPerLevel };
        skillData.mana_percent_per_second_bonus = new LinearStatBonusFloat { base_value = bonusSkill.manaPercentPerSecondBonus.baseValue, bonus_per_level = bonusSkill.manaPercentPerSecondBonus.bonusPerLevel };
        skillData.mana_per_second_bonus = new LinearStatBonus { base_value = bonusSkill.manaPerSecondBonus.baseValue, bonus_per_level = bonusSkill.manaPerSecondBonus.bonusPerLevel };
        skillData.energy_percent_per_second_bonus = new LinearStatBonusFloat { base_value = bonusSkill.energyPercentPerSecondBonus.baseValue, bonus_per_level = bonusSkill.energyPercentPerSecondBonus.bonusPerLevel };
        skillData.speed_bonus = new LinearStatBonusFloat { base_value = bonusSkill.speedBonus.baseValue, bonus_per_level = bonusSkill.speedBonus.bonusPerLevel };
        skillData.damage_shield = new LinearStatBonus { base_value = bonusSkill.damageShield.baseValue, bonus_per_level = bonusSkill.damageShield.bonusPerLevel };
        skillData.cooldown_reduction_percent = new LinearStatBonusFloat { base_value = bonusSkill.cooldownReductionPercent.baseValue, bonus_per_level = bonusSkill.cooldownReductionPercent.bonusPerLevel };
        skillData.strength_bonus = new LinearStatBonus { base_value = bonusSkill.strengthBonus.baseValue, bonus_per_level = bonusSkill.strengthBonus.bonusPerLevel };
        skillData.intelligence_bonus = new LinearStatBonus { base_value = bonusSkill.intelligenceBonus.baseValue, bonus_per_level = bonusSkill.intelligenceBonus.bonusPerLevel };
        skillData.dexterity_bonus = new LinearStatBonus { base_value = bonusSkill.dexterityBonus.baseValue, bonus_per_level = bonusSkill.dexterityBonus.bonusPerLevel };
        skillData.charisma_bonus = new LinearStatBonus { base_value = bonusSkill.charismaBonus.baseValue, bonus_per_level = bonusSkill.charismaBonus.bonusPerLevel };
        skillData.wisdom_bonus = new LinearStatBonus { base_value = bonusSkill.wisdomBonus.baseValue, bonus_per_level = bonusSkill.wisdomBonus.bonusPerLevel };
        skillData.constitution_bonus = new LinearStatBonus { base_value = bonusSkill.constitutionBonus.baseValue, bonus_per_level = bonusSkill.constitutionBonus.bonusPerLevel };

        // BuffSkill-specific fields
        var buffSkill = skill.TryCast<Il2Cpp.BuffSkill>();
        if (buffSkill != null)
        {
            skillData.duration_base = buffSkill.buffTime.baseValue;
            skillData.duration_per_level = buffSkill.buffTime.bonusPerLevel;
            skillData.remain_after_death = buffSkill.remainAfterDeath;
            skillData.buff_category = buffSkill.categoryBuff ?? "unknown";
            skillData.is_invisibility = buffSkill.invisibility;
            skillData.is_undead_illusion = buffSkill.undeadIlussion;
            skillData.is_poison_debuff = buffSkill.isPoisonDebuff;
            skillData.is_fire_debuff = buffSkill.isFireDebuff;
            skillData.is_cold_debuff = buffSkill.isColdDebuff;
            skillData.is_disease_debuff = buffSkill.isDiseaseDebuff;
            skillData.is_melee_debuff = buffSkill.isMeleeDebuff;
            skillData.is_cleanse = buffSkill.isCleanseSpell;
            skillData.is_dispel = buffSkill.isDispel;
            skillData.is_ward = buffSkill.isWard;
            skillData.is_blindness = buffSkill.isBlindness;
            skillData.is_avatar_war = buffSkill.isAvatarWar;
            skillData.is_only_for_magic_classes = buffSkill.isOnlyForMagicClasses;
            skillData.is_permanent = buffSkill.isPermanent;
            skillData.prob_ignore_cleanse = buffSkill.probIgnoreCleanse;
        }

        // PassiveSkill-specific fields
        var passiveSkill = skill.TryCast<Il2Cpp.PassiveSkill>();
        if (passiveSkill != null)
        {
            skillData.is_enrage = passiveSkill.isEnrage;
        }
    }

    private void PopulateSummonSkillFields(Il2Cpp.ScriptableSkill skill, SkillData skillData)
    {
        var summonSkill = skill.TryCast<Il2Cpp.SummonSkill>();
        if (summonSkill == null) return;

        skillData.is_familiar = summonSkill.isFamiliar;
    }
}

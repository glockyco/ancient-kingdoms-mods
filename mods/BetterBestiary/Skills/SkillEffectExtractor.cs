using BetterBestiary.Data;
using Il2Cpp;

namespace BetterBestiary.Skills;

/// <summary>
/// Builds a <see cref="SkillEffectInput"/> from a live <c>ScriptableSkill</c>, reading
/// the same fields the DataExporter's <c>SkillExporter</c> does but emitting the
/// formatter input directly. This is what lets the panel summarize skills present in
/// NO data export (unreleased/dev game versions): every value comes straight off the
/// in-memory game object.
///
/// Field selection mirrors the website's <c>skillRowToEffectInput</c> — INCLUDING its
/// omissions. <c>is_double_exp_spell</c>, <c>is_permanent</c> and <c>duration_per_level</c>
/// exist on the game object but the website never feeds them to <c>formatSkillEffect</c>,
/// so they are deliberately left unset here, keeping the panel output identical to the
/// site (and to the parity corpus).
/// </summary>
internal static class SkillEffectExtractor
{
    public static SkillEffectInput From(ScriptableSkill skill)
    {
        var input = new SkillEffectInput
        {
            id = SkillId.Sanitize(skill.name),
            skill_type = DetermineSkillType(skill),
            damage_type = null,
        };

        PopulateDamage(skill, input);
        PopulateHeal(skill, input);
        PopulateTargetBuff(skill, input);
        PopulateBonus(skill, input);
        PopulateSummon(skill, input);

        return input;
    }

    // Mirror of SkillExporter.DetermineSkillType.
    private static string DetermineSkillType(ScriptableSkill skill)
    {
        if (skill.TryCast<DamageSkill>() != null)
        {
            if (skill.TryCast<AreaObjectSpawnSkill>() != null) return "area_object_spawn";
            if (skill.TryCast<AreaDamageSkill>() != null) return "area_damage";
            if (skill.TryCast<FrontalDamageSkill>() != null) return "frontal_damage";
            if (skill.TryCast<FrontalProjectilesSkill>() != null) return "frontal_projectiles";
            if (skill.TryCast<TargetDamageSkill>() != null) return "target_damage";
            if (skill.TryCast<TargetProjectileSkill>() != null) return "target_projectile";
            return "damage";
        }

        if (skill.TryCast<HealSkill>() != null)
        {
            if (skill.TryCast<AreaHealSkill>() != null) return "area_heal";
            if (skill.TryCast<TargetHealSkill>() != null) return "target_heal";
            return "heal";
        }

        var buffSkill = skill.TryCast<BuffSkill>();
        if (buffSkill != null)
        {
            var isDebuff = buffSkill.isPoisonDebuff || buffSkill.isFireDebuff ||
                           buffSkill.isColdDebuff || buffSkill.isDiseaseDebuff ||
                           buffSkill.isMeleeDebuff || buffSkill.isMagicDebuff;

            if (skill.TryCast<AreaBuffSkill>() != null) return isDebuff ? "area_debuff" : "area_buff";
            if (skill.TryCast<AreaDebuffSkill>() != null) return "area_debuff";
            if (skill.TryCast<TargetBuffSkill>() != null) return isDebuff ? "target_debuff" : "target_buff";
            if (skill.TryCast<TargetDebuffSkill>() != null) return "target_debuff";
            return isDebuff ? "debuff" : "buff";
        }

        if (skill.TryCast<PassiveSkill>() != null) return "passive";
        if (skill.TryCast<SummonSkill>() != null) return "summon";
        if (skill.TryCast<SummonSkillMonsters>() != null) return "summon_monsters";

        return "unknown";
    }

    private static void PopulateDamage(ScriptableSkill skill, SkillEffectInput input)
    {
        var damageSkill = skill.TryCast<DamageSkill>();
        if (damageSkill == null)
            return;

        input.damage = new LinearValue(damageSkill.damage.baseValue, damageSkill.damage.bonusPerLevel);
        input.damage_percent = new LinearValue(damageSkill.damagePercent.baseValue, damageSkill.damagePercent.bonusPerLevel);
        input.damage_type = damageSkill.damageType.ToString();
        input.is_assassination_skill = damageSkill.isAssasinationSkill;
        input.is_manaburn_skill = damageSkill.isManaburnSkill;
        input.lifetap_percent = new LinearValue(damageSkill.lifetapPercent.baseValue, damageSkill.lifetapPercent.bonusPerLevel);
        input.knockback_chance = new LinearValue(damageSkill.knockbackChance.baseValue, damageSkill.knockbackChance.bonusPerLevel);
        input.stun_chance = new LinearValue(damageSkill.stunChance.baseValue, damageSkill.stunChance.bonusPerLevel);
        input.stun_time = new LinearValue(damageSkill.stunTime.baseValue, damageSkill.stunTime.bonusPerLevel);
        input.fear_chance = new LinearValue(damageSkill.fearChance.baseValue, damageSkill.fearChance.bonusPerLevel);
        input.fear_time = new LinearValue(damageSkill.fearTime.baseValue, damageSkill.fearTime.bonusPerLevel);
        input.aggro = new LinearValue(damageSkill.aggro.baseValue, damageSkill.aggro.bonusPerLevel);
        input.break_armor_prob = damageSkill.breakArmorProb;

        var areaDamageSkill = skill.TryCast<AreaDamageSkill>();
        if (areaDamageSkill != null)
            input.affects_random_target = areaDamageSkill.affectsRandomTarget;

        var areaObjectSpawnSkill = skill.TryCast<AreaObjectSpawnSkill>();
        if (areaObjectSpawnSkill != null)
        {
            input.area_object_size = areaObjectSpawnSkill.sizeObject;
            input.area_objects_to_spawn = areaObjectSpawnSkill.objectsToSpawn;
        }
    }

    private static void PopulateHeal(ScriptableSkill skill, SkillEffectInput input)
    {
        var healSkill = skill.TryCast<HealSkill>();
        if (healSkill == null)
            return;

        input.heals_health = new LinearValue(healSkill.healsHealth.baseValue, healSkill.healsHealth.bonusPerLevel);
        input.heals_mana = new LinearValue(healSkill.healsMana.baseValue, healSkill.healsMana.bonusPerLevel);
        input.is_balance_health = healSkill.isBalanceHealth;

        var targetHealSkill = skill.TryCast<TargetHealSkill>();
        if (targetHealSkill != null)
            input.is_resurrect_skill = targetHealSkill.isResurrectSkill;
    }

    private static void PopulateTargetBuff(ScriptableSkill skill, SkillEffectInput input)
    {
        var targetBuffSkill = skill.TryCast<TargetBuffSkill>();
        if (targetBuffSkill == null)
            return;

        input.is_mana_shield = targetBuffSkill.isManaShield;
    }

    private static void PopulateBonus(ScriptableSkill skill, SkillEffectInput input)
    {
        var bonusSkill = skill.TryCast<BonusSkill>();
        if (bonusSkill == null)
            return;

        input.health_max_bonus = new LinearValue(bonusSkill.healthMaxBonus.baseValue, bonusSkill.healthMaxBonus.bonusPerLevel);
        input.health_max_percent_bonus = new LinearValue(bonusSkill.healthMaxPercentBonus.baseValue, bonusSkill.healthMaxPercentBonus.bonusPerLevel);
        input.mana_max_bonus = new LinearValue(bonusSkill.manaMaxBonus.baseValue, bonusSkill.manaMaxBonus.bonusPerLevel);
        input.mana_max_percent_bonus = new LinearValue(bonusSkill.manaMaxPercentBonus.baseValue, bonusSkill.manaMaxPercentBonus.bonusPerLevel);
        input.energy_max_bonus = new LinearValue(bonusSkill.energyMaxBonus.baseValue, bonusSkill.energyMaxBonus.bonusPerLevel);
        input.damage_bonus = new LinearValue(bonusSkill.damageBonus.baseValue, bonusSkill.damageBonus.bonusPerLevel);
        input.damage_percent_bonus = new LinearValue(bonusSkill.damagePercentBonus.baseValue, bonusSkill.damagePercentBonus.bonusPerLevel);
        input.magic_damage_percent_bonus = new LinearValue(bonusSkill.magicDamagePercentBonus.baseValue, bonusSkill.magicDamagePercentBonus.bonusPerLevel);
        input.magic_damage_bonus = new LinearValue(bonusSkill.magicDamageBonus.baseValue, bonusSkill.magicDamageBonus.bonusPerLevel);
        input.defense_bonus = new LinearValue(bonusSkill.defenseBonus.baseValue, bonusSkill.defenseBonus.bonusPerLevel);
        input.magic_resist_bonus = new LinearValue(bonusSkill.magicResistBonus.baseValue, bonusSkill.magicResistBonus.bonusPerLevel);
        input.poison_resist_bonus = new LinearValue(bonusSkill.poisonResistBonus.baseValue, bonusSkill.poisonResistBonus.bonusPerLevel);
        input.fire_resist_bonus = new LinearValue(bonusSkill.fireResistBonus.baseValue, bonusSkill.fireResistBonus.bonusPerLevel);
        input.cold_resist_bonus = new LinearValue(bonusSkill.coldResistBonus.baseValue, bonusSkill.coldResistBonus.bonusPerLevel);
        input.disease_resist_bonus = new LinearValue(bonusSkill.diseaseResistBonus.baseValue, bonusSkill.diseaseResistBonus.bonusPerLevel);
        input.block_chance_bonus = new LinearValue(bonusSkill.blockChanceBonus.baseValue, bonusSkill.blockChanceBonus.bonusPerLevel);
        input.accuracy_bonus = new LinearValue(bonusSkill.accuracyBonus.baseValue, bonusSkill.accuracyBonus.bonusPerLevel);
        input.critical_chance_bonus = new LinearValue(bonusSkill.criticalChanceBonus.baseValue, bonusSkill.criticalChanceBonus.bonusPerLevel);
        input.haste_bonus = new LinearValue(bonusSkill.hasteBonus.baseValue, bonusSkill.hasteBonus.bonusPerLevel);
        input.spell_haste_bonus = new LinearValue(bonusSkill.spellHasteBonus.baseValue, bonusSkill.spellHasteBonus.bonusPerLevel);
        input.health_percent_per_second_bonus = new LinearValue(bonusSkill.healthPercentPerSecondBonus.baseValue, bonusSkill.healthPercentPerSecondBonus.bonusPerLevel);
        input.healing_per_second_bonus = new LinearValue(bonusSkill.healingPerSecondBonus.baseValue, bonusSkill.healingPerSecondBonus.bonusPerLevel);
        input.mana_percent_per_second_bonus = new LinearValue(bonusSkill.manaPercentPerSecondBonus.baseValue, bonusSkill.manaPercentPerSecondBonus.bonusPerLevel);
        input.mana_per_second_bonus = new LinearValue(bonusSkill.manaPerSecondBonus.baseValue, bonusSkill.manaPerSecondBonus.bonusPerLevel);
        input.energy_percent_per_second_bonus = new LinearValue(bonusSkill.energyPercentPerSecondBonus.baseValue, bonusSkill.energyPercentPerSecondBonus.bonusPerLevel);
        input.energy_per_second_bonus = new LinearValue(bonusSkill.energyPerSecondBonus.baseValue, bonusSkill.energyPerSecondBonus.bonusPerLevel);
        input.speed_bonus = new LinearValue(bonusSkill.speedBonus.baseValue, bonusSkill.speedBonus.bonusPerLevel);
        input.damage_shield = new LinearValue(bonusSkill.damageShield.baseValue, bonusSkill.damageShield.bonusPerLevel);
        input.cooldown_reduction_percent = new LinearValue(bonusSkill.cooldownReductionPercent.baseValue, bonusSkill.cooldownReductionPercent.bonusPerLevel);
        input.strength_bonus = new LinearValue(bonusSkill.strengthBonus.baseValue, bonusSkill.strengthBonus.bonusPerLevel);
        input.intelligence_bonus = new LinearValue(bonusSkill.intelligenceBonus.baseValue, bonusSkill.intelligenceBonus.bonusPerLevel);
        input.dexterity_bonus = new LinearValue(bonusSkill.dexterityBonus.baseValue, bonusSkill.dexterityBonus.bonusPerLevel);
        input.charisma_bonus = new LinearValue(bonusSkill.charismaBonus.baseValue, bonusSkill.charismaBonus.bonusPerLevel);
        input.wisdom_bonus = new LinearValue(bonusSkill.wisdomBonus.baseValue, bonusSkill.wisdomBonus.bonusPerLevel);
        input.constitution_bonus = new LinearValue(bonusSkill.constitutionBonus.baseValue, bonusSkill.constitutionBonus.bonusPerLevel);
        input.heal_on_hit_percent = new LinearValue(bonusSkill.healOnHitPercent.baseValue, bonusSkill.healOnHitPercent.bonusPerLevel);

        var buffSkill = skill.TryCast<BuffSkill>();
        if (buffSkill != null)
        {
            input.duration_base = buffSkill.buffTime.baseValue;
            input.is_invisibility = buffSkill.invisibility;
            input.is_poison_debuff = buffSkill.isPoisonDebuff;
            input.is_fire_debuff = buffSkill.isFireDebuff;
            input.is_cold_debuff = buffSkill.isColdDebuff;
            input.is_disease_debuff = buffSkill.isDiseaseDebuff;
            input.is_melee_debuff = buffSkill.isMeleeDebuff;
            input.is_magic_debuff = buffSkill.isMagicDebuff;
            input.is_cleanse = buffSkill.isCleanseSpell;
            input.is_dispel = buffSkill.isDispel;
            input.ward_bonus = new LinearValue(buffSkill.wardBonus.baseValue, buffSkill.wardBonus.bonusPerLevel);
            input.fear_resist_chance_bonus = new LinearValue(buffSkill.fearResistChanceBonus.baseValue, buffSkill.fearResistChanceBonus.bonusPerLevel);
            input.is_blindness = buffSkill.isBlindness;
            input.prob_ignore_cleanse = buffSkill.probIgnoreCleanse;

            var areaBuffSkill = skill.TryCast<AreaBuffSkill>();
            if (areaBuffSkill != null)
                input.is_teleport = areaBuffSkill.isTeleport;
        }

        var passiveSkill = skill.TryCast<PassiveSkill>();
        if (passiveSkill != null)
            input.is_enrage = passiveSkill.isEnrage;
    }

    private static void PopulateSummon(ScriptableSkill skill, SkillEffectInput input)
    {
        var summonSkill = skill.TryCast<SummonSkill>();
        if (summonSkill != null)
        {
            input.is_familiar = summonSkill.isFamiliar;
            input.pet_name = summonSkill.petPrefab != null ? summonSkill.petPrefab.name : null;
            return;
        }

        var summonMonstersSkill = skill.TryCast<SummonSkillMonsters>();
        if (summonMonstersSkill != null)
        {
            var monster = summonMonstersSkill.monster;
            input.summoned_monster_id = monster != null ? SkillId.Sanitize(monster.name) : null;
            input.summoned_monster_name = monster != null ? monster.name : null;
            input.summoned_monster_level = summonMonstersSkill.levelMonster;
            input.summon_count_per_cast = summonMonstersSkill.numberPetsBySummon;
            input.max_active_summons = summonMonstersSkill.maxActivePets;
        }
    }
}

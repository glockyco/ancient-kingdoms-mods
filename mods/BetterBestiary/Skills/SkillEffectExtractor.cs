using System.Collections.Generic;
using DataExporter;
using DataExporter.Skills;
using Il2Cpp;

namespace BetterBestiary.Skills;

/// <summary>
/// Builds a <see cref="SkillEffectInput"/> from a live <c>ScriptableSkill</c>, reading
/// the same fields the DataExporter's <c>SkillExporter</c> does but emitting the
/// formatter input directly. This is what lets the panel summarize skills present in
/// NO data export (unreleased/dev game versions): every value comes straight off the
/// in-memory game object.
///
/// Field selection mirrors the website's <c>skillEffectInput</c> for a monster
/// caster, the only caster the panel describes: damage adds the monster's stats,
/// an area heal reaches monsters, and no notes about a reader's attributes apply.
/// Every field read by <c>formatSkillEffect</c> is populated so the live panel and
/// website use the same effect contract.
/// </summary>
internal static class SkillEffectExtractor
{
    public static SkillEffectInput From(ScriptableSkill skill)
    {
        var input = new SkillEffectInput
        {
            id = GameIds.Sanitize(skill.name),
            skill_type = SkillClassification.DetermineSkillType(skill),
            damage_type = null,
            is_pet_skill = skill.isPetSkill,
            is_mercenary_skill = skill.isMercenarySkill,
            required_weapon_category = string.IsNullOrEmpty(skill.requiredWeaponCategory)
                ? null
                : skill.requiredWeaponCategory,
            cast_range = skill.castRange.baseValue,
        };

        PopulateDamage(skill, input);
        PopulateHeal(skill, input);
        PopulateTargetBuff(skill, input);
        PopulateBonus(skill, input);
        PopulateBard(skill, input);
        PopulateNecromancer(skill, input);
        PopulateSummon(skill, input);

        return input;
    }


    private static void PopulateDamage(ScriptableSkill skill, SkillEffectInput input)
    {
        var damageSkill = skill.TryCast<DamageSkill>();
        if (damageSkill == null)
            return;

        input.damage = new LinearValue(damageSkill.damage.baseValue, damageSkill.damage.bonusPerLevel);
        input.damage_percent = new LinearValue(damageSkill.damagePercent.baseValue, damageSkill.damagePercent.bonusPerLevel);
        input.damage_type = SkillClassification.ExportDamageType(damageSkill.damageType);
        input.is_assassination_skill = damageSkill.isAssasinationSkill;
        input.is_manaburn_skill = damageSkill.isManaburnSkill;
        input.lifetap_percent = new LinearValue(damageSkill.lifetapPercent.baseValue, damageSkill.lifetapPercent.bonusPerLevel);
        input.knockback_chance = new LinearValue(damageSkill.knockbackChance.baseValue, damageSkill.knockbackChance.bonusPerLevel);
        input.knockback_distance = damageSkill.knockbackDistance;
        input.stun_chance = new LinearValue(damageSkill.stunChance.baseValue, damageSkill.stunChance.bonusPerLevel);
        input.stun_time = new LinearValue(damageSkill.stunTime.baseValue, damageSkill.stunTime.bonusPerLevel);
        input.fear_chance = new LinearValue(damageSkill.fearChance.baseValue, damageSkill.fearChance.bonusPerLevel);
        input.fear_time = new LinearValue(damageSkill.fearTime.baseValue, damageSkill.fearTime.bonusPerLevel);
        input.aggro = new LinearValue(damageSkill.aggro.baseValue, damageSkill.aggro.bonusPerLevel);
        input.break_armor_prob = damageSkill.breakArmorProb;
        var channel = skill.TryCast<ChanneledTargetDamageSkill>();
        if (channel != null)
            input.channel_pulses = channel.channelPulses;

        var areaDamageSkill = skill.TryCast<AreaDamageSkill>();
        if (areaDamageSkill != null)
        {
            input.affects_random_target = areaDamageSkill.affectsRandomTarget;
            input.area_projectile = areaDamageSkill.projectile != null;
        }

        // The panel only describes monster casts, so both term lists use the monster rule.
        input.monster_damage_terms = MonsterDamageTerms(skill, input.skill_type, input.damage_type);
        input.damage_terms = input.monster_damage_terms;

        var areaObjectSpawnSkill = skill.TryCast<AreaObjectSpawnSkill>();
        if (areaObjectSpawnSkill != null)
        {
            input.area_object_size = areaObjectSpawnSkill.sizeObject;
            input.area_objects_to_spawn = areaObjectSpawnSkill.objectsToSpawn;
        }
    }

    /// <summary>Mirror of the website's <c>monsterDamageStats</c>: the stats a monster's damage
    /// handler adds to the skill's listed damage.</summary>
    // Source: server-scripts/TargetDamageSkill.cs:180-236; TargetProjectileSkill.cs:181-219; FrontalDamageSkill.cs:60-102; AreaDamageSkill.cs:85-106; FrontalProjectilesSkill.cs:94-114 — monsters add Spell Power for elemental hits, plus Attack Power for magic weapon attacks, and Attack Power otherwise.
    private static List<string> MonsterDamageTerms(ScriptableSkill skill, string skillType, string damageType)
    {
        var stats = new List<string>();
        if (skill.isScroll || skillType is not ("target_damage" or "area_damage" or "frontal_damage" or "target_projectile" or "frontal_projectiles"))
            return stats;
        var elemental = damageType is "Magic" or "Fire" or "Cold" or "Disease";
        var poisonMagic = damageType == "Poison"
            && skillType is "target_damage" or "target_projectile" or "frontal_projectiles";
        if (!elemental && !poisonMagic)
        {
            stats.Add("attack_power");
            return stats;
        }
        stats.Add("spell_power");
        var weaponMagic = damageType == "Magic"
            && !skill.isSpell
            && skill.requiredWeaponCategory != null
            && skill.requiredWeaponCategory.StartsWith("Weapon")
            && skillType is "target_damage" or "target_projectile" or "frontal_damage";
        if (weaponMagic)
            stats.Add("attack_power");
        return stats;
    }

    private static void PopulateHeal(ScriptableSkill skill, SkillEffectInput input)
    {
        var healSkill = skill.TryCast<HealSkill>();
        if (healSkill == null)
            return;

        input.heals_health = new LinearValue(healSkill.healsHealth.baseValue, healSkill.healsHealth.bonusPerLevel);
        input.heals_mana = new LinearValue(healSkill.healsMana.baseValue, healSkill.healsMana.bonusPerLevel);
        input.is_balance_health = healSkill.isBalanceHealth;
        // Source: server-scripts/AreaHealSkill.cs:Apply — an unflagged area heal reaches the caster's own kind, and the panel describes monster casters.
        if (input.skill_type == "area_heal" && !skill.isMercenarySkill && !skill.isPetSkill)
            input.area_heal_caster = "monster";

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
        input.is_double_exp_spell = targetBuffSkill.isDoubleExpSpell;
        input.also_buff_active_pet = targetBuffSkill.alsoBuffActivePet;
        input.can_buff_self = targetBuffSkill.canBuffSelf;
        input.can_buff_others = targetBuffSkill.canBuffOthers;
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
        input.critical_resist_bonus = new LinearValue(bonusSkill.criticalResistBonus.baseValue, bonusSkill.criticalResistBonus.bonusPerLevel);
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
            input.duration_per_level = buffSkill.buffTime.bonusPerLevel;
            input.is_permanent = buffSkill.isPermanent;
            input.is_invisibility = buffSkill.invisibility;
            input.ignores_see_invisibility = buffSkill.ignoreSeeInvisibility;
            input.is_undead_illusion = buffSkill.undeadIlussion;
            input.illusion_race = string.IsNullOrWhiteSpace(buffSkill.illusionRace)
                ? null
                : buffSkill.illusionRace;
            input.is_poison_debuff = buffSkill.isPoisonDebuff;
            input.is_fire_debuff = buffSkill.isFireDebuff;
            input.is_cold_debuff = buffSkill.isColdDebuff;
            input.is_disease_debuff = buffSkill.isDiseaseDebuff;
            input.is_melee_debuff = buffSkill.isMeleeDebuff;
            input.is_magic_debuff = buffSkill.isMagicDebuff;
            input.is_cleanse = buffSkill.isCleanseSpell;
            input.is_dispel = buffSkill.isDispel;
            input.damage_over_time_type = SkillClassification.ResolveDamageOverTimeType(buffSkill);
            input.damage_shield_type = SkillClassification.ResolveDamageShieldType(buffSkill);
            input.ward_bonus = new LinearValue(buffSkill.wardBonus.baseValue, buffSkill.wardBonus.bonusPerLevel);
            input.fear_resist_chance_bonus = new LinearValue(buffSkill.fearResistChanceBonus.baseValue, buffSkill.fearResistChanceBonus.bonusPerLevel);
            input.fear_resist_chance_bonus_cap = buffSkill.fearResistChanceBonusCap;
            input.is_blindness = buffSkill.isBlindness;
            input.prob_ignore_cleanse = buffSkill.probIgnoreCleanse;
            input.is_only_for_magic_classes = buffSkill.isOnlyForMagicClasses;
            input.lifetap_healing_percent_bonus = new LinearValue(buffSkill.lifetapHealingPercentBonus.baseValue, buffSkill.lifetapHealingPercentBonus.bonusPerLevel);

            var areaBuffSkill = skill.TryCast<AreaBuffSkill>();
            if (areaBuffSkill != null)
                input.is_teleport = areaBuffSkill.isTeleport;
        }

        var passiveSkill = skill.TryCast<PassiveSkill>();
        if (passiveSkill != null)
        {
            input.is_enrage = passiveSkill.isEnrage;
            input.additional_active_bard_songs = passiveSkill.additionalActiveBardSongs;
            input.unlimited_active_bard_songs = passiveSkill.unlimitedActiveBardSongs;
            input.bard_song_duration_bonus_per_level = passiveSkill.bardSongDurationBonusPerLevel;
            input.extra_gather_item_chance = passiveSkill.extraGatherItemChance;
            input.food_and_drink_buff_duration_bonus_per_level = passiveSkill.foodAndDrinkBuffDurationBonusPerLevel;
            input.damage_over_time_execute_bonus = new LinearValue(passiveSkill.damageOverTimeExecuteBonus.baseValue, passiveSkill.damageOverTimeExecuteBonus.bonusPerLevel);
        }
    }

    private static void PopulateBard(ScriptableSkill skill, SkillEffectInput input)
    {
        var bardCharm = skill.TryCast<BardCharmSongSkill>();
        input.is_bard_song = skill.TryCast<BardSongSkill>() != null
            || skill.TryCast<BardAreaSongSkill>() != null
            || bardCharm != null;

        if (bardCharm != null)
        {
            input.is_bard_charm = true;
            input.charmed_damage_percent = new LinearValue(
                bardCharm.charmedDamagePercent.baseValue,
                bardCharm.charmedDamagePercent.bonusPerLevel);
        }

        var finalCadence = skill.TryCast<BardFinalCadenceSkill>();
        if (finalCadence != null)
        {
            input.is_bard_final_cadence = true;
            input.heals_health = new LinearValue(
                finalCadence.healsHealth.baseValue,
                finalCadence.healsHealth.bonusPerLevel);
        }

        var virtuosity = skill.TryCast<BardVirtuositySkill>();
        if (virtuosity != null)
        {
            input.is_bard_virtuosity = true;
            input.additional_damage_percent_per_song = virtuosity.additionalDamagePercentPerSong;
        }
    }

    private static void PopulateNecromancer(ScriptableSkill skill, SkillEffectInput input)
    {
        var bloodPact = skill.TryCast<NecromancerBloodPactSkill>();
        if (bloodPact != null)
        {
            input.is_necromancer_blood_pact = true;
            input.health_cost_percent = new LinearValue(bloodPact.healthCostPercent.baseValue, bloodPact.healthCostPercent.bonusPerLevel);
            input.mana_restored_percent = new LinearValue(bloodPact.manaRestoredPercent.baseValue, bloodPact.manaRestoredPercent.bonusPerLevel);
        }

        var deathBloom = skill.TryCast<NecromancerDeathBloomSkill>();
        if (deathBloom != null)
        {
            input.is_necromancer_death_bloom = true;
            input.health_cost_percent = new LinearValue(deathBloom.healthCostPercent, 0);
            input.healing_percent = new LinearValue(deathBloom.healingPercent.baseValue, deathBloom.healingPercent.bonusPerLevel);
            input.healing_percent_per_intelligence = deathBloom.healingPercentPerIntelligence;
        }

        input.is_necromancer_pet_buff = skill.TryCast<NecromancerPetBuffSkill>() != null;
        input.is_necromancer_reaper_form = skill.TryCast<NecromancerReaperFormSkill>() != null;
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
            input.summoned_monster_id = monster != null ? GameIds.Sanitize(monster.name) : null;
            input.summoned_monster_name = monster != null ? monster.name : null;
            input.summoned_monster_level = summonMonstersSkill.levelMonster;
            input.summon_count_per_cast = summonMonstersSkill.numberPetsBySummon;
            input.max_active_summons = summonMonstersSkill.maxActivePets;
        }
    }
}

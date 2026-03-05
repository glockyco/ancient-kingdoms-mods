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

        // Build skill-to-classes mapping from NetworkManagerMMO.playerClasses
        // A skill can appear in multiple class skill trees (e.g., shared veteran skills)
        var skillToClasses = BuildSkillToClassesMapping();
        Logger.Msg($"Built skill-to-classes mapping with {skillToClasses.Count} entries");

        var type = Il2CppType.Of<Il2Cpp.ScriptableSkill>();
        var skills = Resources.FindObjectsOfTypeAll(type);

        Logger.Msg($"Found {skills.Length} skill objects total");

        var skillList = new List<SkillData>();

        foreach (var obj in skills)
        {
            var skill = obj.TryCast<Il2Cpp.ScriptableSkill>();
            if (skill == null || string.IsNullOrEmpty(skill.name))
                continue;

            var skillId = SanitizeId(skill.name);
            skillToClasses.TryGetValue(skillId, out var playerClasses);

            var skillData = new SkillData
            {
                player_classes = playerClasses ?? new List<string>(),
                // Base ScriptableSkill fields
                id = SanitizeId(skill.name),
                name = skill.nameSkill ?? skill.name,
                skill_type = DetermineSkillType(skill),
                tier = skill.tier,
                max_level = skill.maxLevel,
                level_required = skill.requiredLevel.Get(1),
                required_skill_points = skill.requiredSkillPoints.Get(1),
                required_spent_points = skill.requiredSpentPoints,
                prerequisite_skill_id = skill.predecessor != null && !string.IsNullOrEmpty(skill.predecessor.name)
                    ? SanitizeId(skill.predecessor.name)
                    : null,
                prerequisite_level = skill.predecessorLevel,
                prerequisite2_skill_id = skill.predecessor2 != null && !string.IsNullOrEmpty(skill.predecessor2.name)
                    ? SanitizeId(skill.predecessor2.name)
                    : null,
                prerequisite2_level = skill.predecessorLevel2,
                required_weapon_category = skill.requiredWeaponCategory ?? "",
                required_weapon_category2 = skill.requiredWeaponCategory2 ?? "",
                mana_cost = new LinearStatBonus
                {
                    base_value = skill.manaCosts.baseValue,
                    bonus_per_level = skill.manaCosts.bonusPerLevel
                },
                energy_cost = new LinearStatBonus
                {
                    base_value = skill.energyCosts.baseValue,
                    bonus_per_level = skill.energyCosts.bonusPerLevel
                },
                cooldown = new LinearStatBonusFloat
                {
                    base_value = skill.cooldown.baseValue,
                    bonus_per_level = skill.cooldown.bonusPerLevel
                },
                cast_time = new LinearStatBonusFloat
                {
                    base_value = skill.castTime.baseValue,
                    bonus_per_level = skill.castTime.bonusPerLevel
                },
                cast_range = new LinearStatBonusFloat
                {
                    base_value = skill.castRange.baseValue,
                    bonus_per_level = skill.castRange.bonusPerLevel
                },
                learn_default = skill.learnDefault,
                show_cast_bar = skill.showCastBar,
                cancel_cast_if_target_died = skill.cancelCastIfTargetDied,
                allow_dungeon = skill.allowDungeon,
                is_spell = skill.isSpell,
                is_veteran = skill.isVeteran,
                is_mercenary_skill = skill.isMercenarySkill,
                is_pet_skill = skill.isPetSkill,
                is_scroll = skill.isScroll,
                followup_default_attack = skill.followupDefaultAttack,
                skill_aggro_message = skill.skillAggroMessage ?? "",
                tooltip_template = skill.toolTip ?? "",
                icon_path = skill.image != null ? skill.image.name : null
            };

            // Try to cast to specific skill types and populate type-specific fields
            PopulateDamageSkillFields(skill, skillData);
            PopulateHealSkillFields(skill, skillData);
            PopulateTargetBuffSkillFields(skill, skillData);  // TargetBuffSkill-specific fields
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
            if (skill.TryCast<Il2Cpp.AreaObjectSpawnSkill>() != null) return "area_object_spawn";
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
                           buffSkill.isMeleeDebuff || buffSkill.isMagicDebuff;

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

        // SummonSkillMonsters inherits from ScriptableSkill directly, NOT from SummonSkill
        var summonMonstersSkill = skill.TryCast<Il2Cpp.SummonSkillMonsters>();
        if (summonMonstersSkill != null) return "summon_monsters";

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

        // AreaObjectSpawnSkill specific
        var areaObjectSpawnSkill = skill.TryCast<Il2Cpp.AreaObjectSpawnSkill>();
        if (areaObjectSpawnSkill != null)
        {
            skillData.area_object_size = areaObjectSpawnSkill.sizeObject;
            skillData.area_object_delay_damage = areaObjectSpawnSkill.delayDamage;
            skillData.area_objects_to_spawn = areaObjectSpawnSkill.objectsToSpawn;
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

    private void PopulateTargetBuffSkillFields(Il2Cpp.ScriptableSkill skill, SkillData skillData)
    {
        var targetBuffSkill = skill.TryCast<Il2Cpp.TargetBuffSkill>();
        if (targetBuffSkill == null) return;

        skillData.is_mana_shield = targetBuffSkill.isManaShield;
        skillData.can_buff_self = targetBuffSkill.canBuffSelf;
        skillData.can_buff_others = targetBuffSkill.canBuffOthers;
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
        skillData.energy_per_second_bonus = new LinearStatBonus { base_value = bonusSkill.energyPerSecondBonus.baseValue, bonus_per_level = bonusSkill.energyPerSecondBonus.bonusPerLevel };
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
            skillData.is_magic_debuff = buffSkill.isMagicDebuff;
            skillData.is_cleanse = buffSkill.isCleanseSpell;
            skillData.is_dispel = buffSkill.isDispel;
            skillData.ward_bonus = new LinearStatBonus { base_value = buffSkill.wardBonus.baseValue, bonus_per_level = buffSkill.wardBonus.bonusPerLevel };
            skillData.fear_resist_chance_bonus = new LinearStatBonusFloat { base_value = buffSkill.fearResistChanceBonus.baseValue, bonus_per_level = buffSkill.fearResistChanceBonus.bonusPerLevel };
            skillData.is_blindness = buffSkill.isBlindness;
            skillData.is_avatar_war = buffSkill.isAvatarWar;
            skillData.is_only_for_magic_classes = buffSkill.isOnlyForMagicClasses;
            skillData.is_permanent = buffSkill.isPermanent;
            skillData.prob_ignore_cleanse = buffSkill.probIgnoreCleanse;
            skillData.is_decrease_resists_skill = buffSkill.isDecreaseResistsSkill;

            var areaBuffSkill = skill.TryCast<Il2Cpp.AreaBuffSkill>();
            if (areaBuffSkill != null)
                skillData.is_aura = areaBuffSkill.isAura;

            var areaDebuffSkill = skill.TryCast<Il2Cpp.AreaDebuffSkill>();
            if (areaDebuffSkill != null)
                skillData.is_aura = areaDebuffSkill.isAura;
        }

        // heal_on_hit_percent is on BonusSkill
        skillData.heal_on_hit_percent = new LinearStatBonusFloat
        {
            base_value = bonusSkill.healOnHitPercent.baseValue,
            bonus_per_level = bonusSkill.healOnHitPercent.bonusPerLevel
        };

        // PassiveSkill-specific fields
        var passiveSkill = skill.TryCast<Il2Cpp.PassiveSkill>();
        if (passiveSkill != null)
        {
            skillData.is_enrage = passiveSkill.isEnrage;
        }
    }

    private void PopulateSummonSkillFields(Il2Cpp.ScriptableSkill skill, SkillData skillData)
    {
        // Handle SummonSkill (player pet summoning)
        var summonSkill = skill.TryCast<Il2Cpp.SummonSkill>();
        if (summonSkill != null)
        {
            skillData.is_familiar = summonSkill.isFamiliar;
            skillData.pet_prefab_name = summonSkill.petPrefab != null ? summonSkill.petPrefab.name : null;
            return;
        }

        // Handle SummonSkillMonsters (boss monster summoning)
        var summonMonstersSkill = skill.TryCast<Il2Cpp.SummonSkillMonsters>();
        if (summonMonstersSkill != null)
        {
            skillData.summoned_monster_id = summonMonstersSkill.monster != null
                ? SanitizeId(summonMonstersSkill.monster.name)
                : null;
            skillData.summoned_monster_level = summonMonstersSkill.levelMonster;
            skillData.summon_count_per_cast = summonMonstersSkill.numberPetsBySummon;
            skillData.max_active_summons = summonMonstersSkill.maxActivePets;
        }
    }

    private Dictionary<string, List<string>> BuildSkillToClassesMapping()
    {
        var mapping = new Dictionary<string, List<string>>();

        try
        {
            var networkManager = Il2CppMirror.NetworkManager.singleton;
            if (networkManager == null)
            {
                Logger.Warning("NetworkManager.singleton is null, cannot build skill-to-classes mapping");
                return mapping;
            }

            var nmmo = networkManager.TryCast<Il2Cpp.NetworkManagerMMO>();
            if (nmmo == null)
            {
                Logger.Warning("Could not cast to NetworkManagerMMO, cannot build skill-to-classes mapping");
                return mapping;
            }

            var playerClasses = nmmo.playerClasses;
            if (playerClasses == null)
            {
                Logger.Warning("playerClasses is null, cannot build skill-to-classes mapping");
                return mapping;
            }

            Logger.Msg($"Found {playerClasses.Count} player classes");

            foreach (var player in playerClasses)
            {
                if (player == null) continue;

                var className = player.name;
                if (string.IsNullOrEmpty(className)) continue;

                // Sanitize class name (e.g., "Player Cleric" -> "cleric")
                var sanitizedClass = className.ToLowerInvariant()
                    .Replace("player ", "")
                    .Replace(" ", "_")
                    .Trim();

                var playerSkills = player.skills;
                if (playerSkills == null)
                {
                    Logger.Msg($"  {className}: skills component is null");
                    continue;
                }

                var skillTemplates = playerSkills.skillTemplates;
                if (skillTemplates == null)
                {
                    Logger.Msg($"  {className}: skillTemplates is null");
                    continue;
                }

                Logger.Msg($"  {className}: {skillTemplates.Length} skills");

                foreach (var skillTemplate in skillTemplates)
                {
                    if (skillTemplate == null || string.IsNullOrEmpty(skillTemplate.name)) continue;

                    var skillId = SanitizeId(skillTemplate.name);

                    // Add this class to the skill's class list
                    if (!mapping.ContainsKey(skillId))
                    {
                        mapping[skillId] = new List<string>();
                    }
                    if (!mapping[skillId].Contains(sanitizedClass))
                    {
                        mapping[skillId].Add(sanitizedClass);
                    }
                }
            }

            // Log skills that appear in multiple classes
            var multiClassSkills = 0;
            foreach (var kvp in mapping)
            {
                if (kvp.Value.Count > 1)
                {
                    multiClassSkills++;
                }
            }
            Logger.Msg($"  Skills shared across multiple classes: {multiClassSkills}");
        }
        catch (System.Exception ex)
        {
            Logger.Error($"Error building skill-to-classes mapping: {ex.Message}");
        }

        return mapping;
    }
}

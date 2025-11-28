namespace DataExporter.Models;

public class LinearStatBonus
{
    public int base_value { get; set; }
    public int bonus_per_level { get; set; }
}

public class LinearStatBonusFloat
{
    public float base_value { get; set; }
    public float bonus_per_level { get; set; }
}

public class SkillData
{
    // === Base ScriptableSkill fields (always present) ===
    public string id { get; set; }
    public string name { get; set; }
    public string skill_type { get; set; }  // damage/heal/buff/debuff/passive/summon
    public int tier { get; set; }
    public int max_level { get; set; }

    // Requirements
    public int level_required { get; set; }
    public int required_skill_points { get; set; }
    public int required_spent_points { get; set; }
    public string prerequisite_skill_id { get; set; }
    public int prerequisite_level { get; set; }
    public string prerequisite2_skill_id { get; set; }
    public int prerequisite2_level { get; set; }
    public string required_weapon_category { get; set; }
    public string required_weapon_category2 { get; set; }

    // Costs and timing (Linear values for per-level calculation)
    public LinearStatBonus mana_cost { get; set; }
    public LinearStatBonus energy_cost { get; set; }
    public LinearStatBonusFloat cooldown { get; set; }
    public LinearStatBonusFloat cast_time { get; set; }
    public LinearStatBonusFloat cast_range { get; set; }

    // Behavior flags
    public bool learn_default { get; set; }
    public bool show_cast_bar { get; set; }
    public bool cancel_cast_if_target_died { get; set; }
    public bool allow_dungeon { get; set; }
    public bool is_spell { get; set; }
    public bool is_veteran { get; set; }
    public bool is_mercenary_skill { get; set; }
    public bool is_pet_skill { get; set; }
    public bool followup_default_attack { get; set; }

    // UI
    public string skill_aggro_message { get; set; }
    public string tooltip_template { get; set; }  // Raw tooltip with placeholders like {DAMAGE}, {MANACOSTS}
    public string icon_path { get; set; }

    // === DamageSkill fields (when skill_type contains "damage") ===
    public LinearStatBonus damage { get; set; }
    public LinearStatBonusFloat damage_percent { get; set; }
    public string damage_type { get; set; }  // Normal/Magic/Poison/Fire/Cold/Disease
    public bool is_assassination_skill { get; set; }
    public bool is_manaburn_skill { get; set; }
    public LinearStatBonusFloat lifetap_percent { get; set; }
    public bool base_skill { get; set; }
    public LinearStatBonusFloat knockback_chance { get; set; }
    public LinearStatBonusFloat stun_chance { get; set; }
    public LinearStatBonusFloat stun_time { get; set; }
    public LinearStatBonusFloat fear_chance { get; set; }
    public LinearStatBonusFloat fear_time { get; set; }
    public LinearStatBonus aggro { get; set; }
    public float break_armor_prob { get; set; }
    public bool affects_random_target { get; set; }  // AreaDamageSkill only
    public float area_object_size { get; set; }  // AreaObjectSpawnSkill only
    public float area_object_delay_damage { get; set; }  // AreaObjectSpawnSkill only
    public int area_objects_to_spawn { get; set; }  // AreaObjectSpawnSkill only

    // === HealSkill fields (when skill_type contains "heal") ===
    public LinearStatBonus heals_health { get; set; }
    public LinearStatBonus heals_mana { get; set; }
    public bool is_balance_health { get; set; }
    public bool is_resurrect_skill { get; set; }  // TargetHealSkill only
    public bool can_heal_self { get; set; }  // TargetHealSkill only
    public bool can_heal_others { get; set; }  // TargetHealSkill only

    // === BuffSkill fields (when skill_type = buff or debuff) ===
    public float duration_base { get; set; }
    public float duration_per_level { get; set; }
    public bool remain_after_death { get; set; }
    public string buff_category { get; set; }

    // Buff behavior flags
    public bool is_invisibility { get; set; }
    public bool is_undead_illusion { get; set; }
    public bool is_poison_debuff { get; set; }
    public bool is_fire_debuff { get; set; }
    public bool is_cold_debuff { get; set; }
    public bool is_disease_debuff { get; set; }
    public bool is_melee_debuff { get; set; }
    public bool is_magic_debuff { get; set; }
    public bool is_cleanse { get; set; }
    public bool is_dispel { get; set; }
    public bool is_ward { get; set; }
    public bool is_blindness { get; set; }
    public bool is_avatar_war { get; set; }
    public bool is_only_for_magic_classes { get; set; }
    public bool is_permanent { get; set; }
    public float prob_ignore_cleanse { get; set; }

    // Buff/Passive stat bonuses (BonusSkill = BuffSkill + PassiveSkill)
    public LinearStatBonus health_max_bonus { get; set; }
    public LinearStatBonusFloat health_max_percent_bonus { get; set; }
    public LinearStatBonus mana_max_bonus { get; set; }
    public LinearStatBonusFloat mana_max_percent_bonus { get; set; }
    public LinearStatBonus energy_max_bonus { get; set; }
    public LinearStatBonus damage_bonus { get; set; }
    public LinearStatBonusFloat damage_percent_bonus { get; set; }
    public LinearStatBonusFloat magic_damage_percent_bonus { get; set; }
    public LinearStatBonus magic_damage_bonus { get; set; }
    public LinearStatBonus defense_bonus { get; set; }
    public LinearStatBonus magic_resist_bonus { get; set; }
    public LinearStatBonus poison_resist_bonus { get; set; }
    public LinearStatBonus fire_resist_bonus { get; set; }
    public LinearStatBonus cold_resist_bonus { get; set; }
    public LinearStatBonus disease_resist_bonus { get; set; }
    public LinearStatBonusFloat block_chance_bonus { get; set; }
    public LinearStatBonusFloat accuracy_bonus { get; set; }
    public LinearStatBonusFloat critical_chance_bonus { get; set; }
    public LinearStatBonusFloat haste_bonus { get; set; }
    public LinearStatBonusFloat spell_haste_bonus { get; set; }
    public LinearStatBonusFloat health_percent_per_second_bonus { get; set; }
    public LinearStatBonus healing_per_second_bonus { get; set; }
    public LinearStatBonusFloat mana_percent_per_second_bonus { get; set; }
    public LinearStatBonus mana_per_second_bonus { get; set; }
    public LinearStatBonusFloat energy_percent_per_second_bonus { get; set; }
    public LinearStatBonusFloat speed_bonus { get; set; }
    public LinearStatBonus damage_shield { get; set; }
    public LinearStatBonusFloat cooldown_reduction_percent { get; set; }
    public LinearStatBonus strength_bonus { get; set; }
    public LinearStatBonus intelligence_bonus { get; set; }
    public LinearStatBonus dexterity_bonus { get; set; }
    public LinearStatBonus charisma_bonus { get; set; }
    public LinearStatBonus wisdom_bonus { get; set; }
    public LinearStatBonus constitution_bonus { get; set; }

    // === PassiveSkill fields (when skill_type = passive) ===
    public bool is_enrage { get; set; }

    // === SummonSkill fields (when skill_type = summon) ===
    public bool is_familiar { get; set; }
    public string pet_prefab_name { get; set; }
}

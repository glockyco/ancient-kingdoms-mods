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

public class BuffData
{
    public string id { get; set; }
    public string name { get; set; }
    public float duration_base { get; set; }
    public float duration_per_level { get; set; }
    public bool remain_after_death { get; set; }
    public string category { get; set; }

    // Behavior flags
    public bool is_invisibility { get; set; }
    public bool is_undead_illusion { get; set; }
    public bool is_poison_debuff { get; set; }
    public bool is_fire_debuff { get; set; }
    public bool is_cold_debuff { get; set; }
    public bool is_disease_debuff { get; set; }
    public bool is_melee_debuff { get; set; }
    public bool is_cleanse { get; set; }
    public bool is_dispel { get; set; }
    public bool is_ward { get; set; }
    public bool is_blindness { get; set; }
    public bool is_avatar_war { get; set; }
    public bool is_only_for_magic_classes { get; set; }
    public bool is_permanent { get; set; }
    public float prob_ignore_cleanse { get; set; }

    // Stat bonuses
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

    // Attribute bonuses
    public LinearStatBonus strength_bonus { get; set; }
    public LinearStatBonus intelligence_bonus { get; set; }
    public LinearStatBonus dexterity_bonus { get; set; }
    public LinearStatBonus charisma_bonus { get; set; }
    public LinearStatBonus wisdom_bonus { get; set; }
    public LinearStatBonus constitution_bonus { get; set; }
}

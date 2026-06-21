#nullable disable
namespace BetterBestiary.Skills;

/// <summary>
/// Plain input for <see cref="SkillEffectFormatter"/> — the C# mirror of the
/// website's <c>Skill</c> interface (the no-monsterContext fields used by
/// <c>formatSkillEffect</c>). Field names match the website's <c>skillRowToEffectInput</c>
/// output verbatim so the golden parity corpus deserializes straight onto it, and
/// the runtime <see cref="SkillEffectExtractor"/> fills the same shape from a live
/// <c>ScriptableSkill</c>. Fields the website mapper omits (e.g.
/// <c>is_double_exp_spell</c>) keep their default here, matching its behaviour.
///
/// Nullable is disabled: this type is compiled into the mod against the stripped
/// Il2Cpp mscorlib, which lacks the NullableContext attributes.
/// </summary>
internal sealed class SkillEffectInput
{
    public string id { get; set; }
    public string skill_type { get; set; }
    public string damage_type { get; set; }
    public int? max_level { get; set; }

    // Damage
    public LinearValue damage { get; set; }
    public LinearValue damage_percent { get; set; }
    public LinearValue lifetap_percent { get; set; }
    public LinearValue knockback_chance { get; set; }
    public LinearValue stun_chance { get; set; }
    public LinearValue stun_time { get; set; }
    public LinearValue fear_chance { get; set; }
    public LinearValue fear_time { get; set; }
    public LinearValue aggro { get; set; }
    public bool is_assassination_skill { get; set; }
    public bool is_manaburn_skill { get; set; }
    public double? break_armor_prob { get; set; }

    // Healing
    public LinearValue heals_health { get; set; }
    public LinearValue heals_mana { get; set; }
    public bool is_resurrect_skill { get; set; }
    public bool is_balance_health { get; set; }

    // Buff/debuff stat bonuses
    public LinearValue health_max_bonus { get; set; }
    public LinearValue health_max_percent_bonus { get; set; }
    public LinearValue mana_max_bonus { get; set; }
    public LinearValue mana_max_percent_bonus { get; set; }
    public LinearValue energy_max_bonus { get; set; }
    public LinearValue defense_bonus { get; set; }
    public LinearValue ward_bonus { get; set; }
    public LinearValue magic_resist_bonus { get; set; }
    public LinearValue poison_resist_bonus { get; set; }
    public LinearValue fire_resist_bonus { get; set; }
    public LinearValue cold_resist_bonus { get; set; }
    public LinearValue disease_resist_bonus { get; set; }
    public LinearValue damage_bonus { get; set; }
    public LinearValue damage_percent_bonus { get; set; }
    public LinearValue magic_damage_bonus { get; set; }
    public LinearValue magic_damage_percent_bonus { get; set; }
    public LinearValue haste_bonus { get; set; }
    public LinearValue spell_haste_bonus { get; set; }
    public LinearValue speed_bonus { get; set; }
    public LinearValue critical_chance_bonus { get; set; }
    public LinearValue accuracy_bonus { get; set; }
    public LinearValue block_chance_bonus { get; set; }
    public LinearValue fear_resist_chance_bonus { get; set; }
    public LinearValue damage_shield { get; set; }
    public LinearValue cooldown_reduction_percent { get; set; }
    public LinearValue heal_on_hit_percent { get; set; }
    public LinearValue healing_per_second_bonus { get; set; }
    public LinearValue health_percent_per_second_bonus { get; set; }
    public LinearValue mana_per_second_bonus { get; set; }
    public LinearValue mana_percent_per_second_bonus { get; set; }
    public LinearValue energy_per_second_bonus { get; set; }
    public LinearValue energy_percent_per_second_bonus { get; set; }
    public LinearValue strength_bonus { get; set; }
    public LinearValue intelligence_bonus { get; set; }
    public LinearValue dexterity_bonus { get; set; }
    public LinearValue constitution_bonus { get; set; }
    public LinearValue wisdom_bonus { get; set; }
    public LinearValue charisma_bonus { get; set; }

    // Duration
    public double duration_base { get; set; }
    public double? duration_per_level { get; set; }
    public bool is_permanent { get; set; }

    // Special flags
    public bool is_double_exp_spell { get; set; }
    public bool is_invisibility { get; set; }
    public bool is_mana_shield { get; set; }
    public bool is_cleanse { get; set; }
    public bool is_dispel { get; set; }
    public bool is_teleport { get; set; }
    public bool is_blindness { get; set; }
    public bool is_enrage { get; set; }

    // Summon
    public string summoned_monster_id { get; set; }
    public string summoned_monster_name { get; set; }
    public int? summoned_monster_level { get; set; }
    public int? summon_count_per_cast { get; set; }
    public int? max_active_summons { get; set; }
    public string pet_name { get; set; }
    public bool is_familiar { get; set; }

    // AoE
    public bool affects_random_target { get; set; }
    public double? area_object_size { get; set; }
    public int? area_objects_to_spawn { get; set; }

    // Debuff type flags
    public bool is_poison_debuff { get; set; }
    public bool is_fire_debuff { get; set; }
    public bool is_cold_debuff { get; set; }
    public bool is_disease_debuff { get; set; }
    public bool is_melee_debuff { get; set; }
    public bool is_magic_debuff { get; set; }

    // Cleanse resistance
    public double? prob_ignore_cleanse { get; set; }
}

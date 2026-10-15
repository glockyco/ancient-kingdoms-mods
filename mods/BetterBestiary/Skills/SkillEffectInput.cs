#nullable disable
using System;
using System.Collections.Generic;
using System.Reflection;

namespace BetterBestiary.Skills;

/// <summary>
/// Plain input for <see cref="SkillEffectFormatter"/>, the C# mirror of the
/// website's <c>Skill</c> interface. Field names match the website's
/// <c>skillEffectInput</c> output verbatim so the golden parity corpus
/// deserializes straight onto it, and the runtime <see cref="SkillEffectExtractor"/>
/// fills the same shape from a live <c>ScriptableSkill</c>. An omitted field
/// keeps its default, which the formatter reads as "no value".
///
/// Nullable is disabled: this type is compiled into the mod against the stripped
/// Il2Cpp mscorlib, which lacks the NullableContext attributes.
/// </summary>
internal sealed class SkillEffectInput
{
    private static readonly PropertyInfo[] LinearProperties = Array.FindAll(
        typeof(SkillEffectInput).GetProperties(BindingFlags.Instance | BindingFlags.Public),
        property => property.PropertyType == typeof(LinearValue));

    public string id { get; set; }
    public string skill_type { get; set; }
    public string damage_type { get; set; }
    public string damage_over_time_type { get; set; }
    public string damage_shield_type { get; set; }
    public int? max_level { get; set; }

    // Casters and delivery
    /// <summary>Only monsters and NPCs cast the skill, at their fixed rank.</summary>
    public bool npc_caster_only { get; set; }
    public bool is_mercenary_skill { get; set; }
    public string required_weapon_category { get; set; }
    /// <summary>Base cast range in yd.</summary>
    public double cast_range { get; set; }
    public bool can_buff_self { get; set; }
    public bool can_buff_others { get; set; }
    public bool area_projectile { get; set; }
    public bool is_only_for_magic_classes { get; set; }
    public bool is_undead_illusion { get; set; }
    public bool ignores_see_invisibility { get; set; }
    /// <summary>The buff level of the potions that apply the skill, or null when none does.</summary>
    public int? potion_buff_level { get; set; }
    /// <summary>Whose kind an unflagged area heal reaches: "player", "pet" or "monster".</summary>
    public string area_heal_caster { get; set; }
    /// <summary>How the summary's casters' attributes change each listed value, keyed by field.</summary>
    public Dictionary<string, string> notes { get; set; }

    // Damage
    public LinearValue damage { get; set; }
    public LinearValue damage_percent { get; set; }
    /// <summary>Terms the summary's casters add to or subtract from listed damage. Empty means listed damage only.</summary>
    public List<string> damage_terms { get; set; }
    /// <summary>Terms a monster caster adds to listed damage.</summary>
    public List<string> monster_damage_terms { get; set; }
    public LinearValue lifetap_percent { get; set; }
    public LinearValue knockback_chance { get; set; }
    public double? knockback_distance { get; set; }
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
    public LinearValue charmed_damage_percent { get; set; }
    public bool is_resurrect_skill { get; set; }
    public bool is_balance_health { get; set; }
    public LinearValue health_cost_percent { get; set; }
    public LinearValue mana_restored_percent { get; set; }
    public LinearValue healing_percent { get; set; }
    public double healing_percent_per_intelligence { get; set; }

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
    public LinearValue critical_resist_bonus { get; set; }
    public LinearValue accuracy_bonus { get; set; }
    public LinearValue block_chance_bonus { get; set; }
    public LinearValue fear_resist_chance_bonus { get; set; }
    public double fear_resist_chance_bonus_cap { get; set; }
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
    public string illusion_race { get; set; }
    public bool is_mana_shield { get; set; }
    public bool is_cleanse { get; set; }
    public bool is_dispel { get; set; }
    public bool is_teleport { get; set; }
    public bool is_blindness { get; set; }
    public bool is_enrage { get; set; }
    public bool is_bard_song { get; set; }
    public bool is_bard_charm { get; set; }
    public bool is_bard_final_cadence { get; set; }
    public bool is_bard_virtuosity { get; set; }
    public double additional_damage_percent_per_song { get; set; }
    public int additional_active_bard_songs { get; set; }
    public bool unlimited_active_bard_songs { get; set; }
    public double bard_song_duration_bonus_per_level { get; set; }
    public double extra_gather_item_chance { get; set; }
    public double food_and_drink_buff_duration_bonus_per_level { get; set; }
    public bool is_pet_skill { get; set; }
    public int channel_pulses { get; set; }
    public bool also_buff_active_pet { get; set; }
    public bool is_necromancer_blood_pact { get; set; }
    public bool is_necromancer_death_bloom { get; set; }
    public bool is_necromancer_pet_buff { get; set; }
    public bool is_necromancer_reaper_form { get; set; }
    public LinearValue lifetap_healing_percent_bonus { get; set; }
    public LinearValue damage_over_time_execute_bonus { get; set; }

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

    public void ResolveAtLevel(int level)
    {
        if (duration_per_level.HasValue)
        {
            duration_base += duration_per_level.Value * (level - 1);
            duration_per_level = 0;
        }

        foreach (var property in LinearProperties)
        {
            var value = (LinearValue)property.GetValue(this);
            if (value == null)
                continue;

            property.SetValue(this, new LinearValue(
                value.base_value + value.bonus_per_level * (level - 1),
                0));
        }
    }
}

#nullable disable

using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using DataExporter.Models;

namespace DataExporter;

public sealed class StatDefinition
{
    public string Id { get; }
    public string NameKey { get; }
    public string ItemLabel { get; }
    public string Format { get; }
    public IReadOnlyList<StatFieldData> Fields { get; }
    public double? Min { get; }
    public double? Max { get; }
    public IReadOnlyList<StatPerPointData> PerPointOf { get; }
    public string PoolId { get; }
    public string SiteName { get; }
    public string OverrideReason { get; }

    public StatDefinition(
        string Id, string NameKey, string ItemLabel, string Format, IReadOnlyList<StatFieldData> Fields,
        double? Min = null, double? Max = null, IReadOnlyList<StatPerPointData> PerPointOf = null,
        string PoolId = null, string SiteName = null, string OverrideReason = null)
    {
        this.Id = Id;
        this.NameKey = NameKey;
        this.ItemLabel = ItemLabel;
        this.Format = Format;
        this.Fields = Fields;
        this.Min = Min;
        this.Max = Max;
        this.PerPointOf = PerPointOf;
        this.PoolId = PoolId;
        this.SiteName = SiteName;
        this.OverrideReason = OverrideReason;
    }
}

public static class StatCatalog
{
    private static StatFieldData Item(string field, string modifier = "flat") => new("item", field, modifier);
    private static StatFieldData Skill(string field, string modifier = "flat") => new("skill", field, modifier);
    private static StatFieldData Class(string field, string curve = null, string modifier = "flat") => new("class", field, modifier, curve);
    private static StatFieldData Pet(string field, string curve = null, string modifier = "flat") => new("pet", field, modifier, curve);

    // Source: server-scripts/ScriptableItem.cs:LocalizedStatLabel — ItemLabel records the input to the game's item label lookup.
    // Source: server-scripts/UICharacterInfo.cs:Update — Attributes, pools, powers, armor and resists display whole numbers. Regeneration and movement display at most two decimals. Fractions display percentages.
    // Source: server-scripts/PlayerAttribute.cs:value — Attribute values are stored without a clamp.
    // Character window prefab bindings supply NameKey and catalogue order. Attributes and pools precede PanelStats.
    // Unbound pool titles are set by UICharacterInfo.Update. HP is fixed text and Fear Resist is absent.
    public static IReadOnlyList<StatDefinition> Stats { get; } = new StatDefinition[]
    {
        // Source: server-scripts/Health.cs:max — Maximum Hit Points sums the base, flat bonuses and percent bonuses without a clamp.
        // Source: server-scripts/Constitution.cs:GetHealthBonus — Each Constitution point adds 25 Hit Points.
        new("health", null, "Hit Points", "integer", new[]
        {
            Item(nameof(ItemStats.health_bonus)), Skill(nameof(SkillData.health_max_bonus)), Skill(nameof(SkillData.health_max_percent_bonus), "percent"),
            Class(nameof(ClassCombatData.base_health_value), "base"), Class(nameof(ClassCombatData.base_health_per_level), "per_level"),
            Pet(nameof(PetData.health_base), "base"), Pet(nameof(PetData.health_per_level), "per_level"),
        }, PerPointOf: new[] { new StatPerPointData("constitution", 25) }),
        // Source: server-scripts/Mana.cs:max — Maximum Mana sums the base, flat bonuses and percent bonuses without a clamp.
        // Source: server-scripts/Intelligence.cs:GetManaBonus — Each Intelligence point adds 20 Mana.
        new("mana", "mana", "Mana", "integer", new[]
        {
            Item(nameof(ItemStats.mana_bonus)), Skill(nameof(SkillData.mana_max_bonus)), Skill(nameof(SkillData.mana_max_percent_bonus), "percent"),
            Class(nameof(ClassCombatData.base_mana_value), "base"), Class(nameof(ClassCombatData.base_mana_per_level), "per_level"),
            Pet(nameof(PetData.mana)), Pet(nameof(PetData.mana_base), "base"), Pet(nameof(PetData.mana_per_level), "per_level"),
        }, PerPointOf: new[] { new StatPerPointData("intelligence", 20) }),
        // Source: server-scripts/Energy.cs:max — Maximum Rage sums the base and flat bonuses without a clamp.
        // Source: server-scripts/Strength.cs:GetEnergyBonus — Each Strength point adds 10 Rage.
        new("rage", "rage", "Rage", "integer", new[]
        {
            Item(nameof(ItemStats.energy_bonus)), Skill(nameof(SkillData.energy_max_bonus)),
            Class(nameof(ClassCombatData.base_energy_value), "base"), Class(nameof(ClassCombatData.base_energy_per_level), "per_level"),
            Pet(nameof(PetData.energy)), Pet(nameof(PetData.energy_base), "base"), Pet(nameof(PetData.energy_per_level), "per_level"),
        }, PerPointOf: new[] { new StatPerPointData("strength", 10) }),
        new("strength", "strength", "Strength", "integer", new[] { Item(nameof(ItemStats.strength)), Skill(nameof(SkillData.strength_bonus)) }),
        new("constitution", "constitution", "Constitution", "integer", new[] { Item(nameof(ItemStats.constitution)), Skill(nameof(SkillData.constitution_bonus)) }),
        new("intelligence", "intelligence", "Intelligence", "integer", new[] { Item(nameof(ItemStats.intelligence)), Skill(nameof(SkillData.intelligence_bonus)) }),
        new("dexterity", "dexterity", "Dexterity", "integer", new[] { Item(nameof(ItemStats.dexterity)), Skill(nameof(SkillData.dexterity_bonus)) }),
        new("wisdom", "wisdom", "Wisdom", "integer", new[] { Item(nameof(ItemStats.wisdom)), Skill(nameof(SkillData.wisdom_bonus)) }),
        new("charisma", "charisma", "Charisma", "integer", new[] { Item(nameof(ItemStats.charisma)), Skill(nameof(SkillData.charisma_bonus)) }),
        // Source: server-scripts/Combat.cs:defense — Armor Class has a minimum of zero and no maximum.
        new("armor_class", "defense", "AC", "integer", new[]
        {
            Item(nameof(ItemStats.defense)), Skill(nameof(SkillData.defense_bonus)),
            Class(nameof(ClassCombatData.base_defense_value), "base"), Class(nameof(ClassCombatData.base_defense_per_level), "per_level"),
            Pet(nameof(PetData.defense)), Pet(nameof(PetData.defense_base), "base"), Pet(nameof(PetData.defense_per_level), "per_level"),
        }, Min: 0),
        // Source: server-scripts/Combat.cs:magicResist — Magic Resist has a minimum of zero and no maximum.
        new("magic_resist", "magic_resist", "Magic Resist", "integer", new[]
        {
            Item(nameof(ItemStats.magic_resist)), Skill(nameof(SkillData.magic_resist_bonus)),
            Class(nameof(ClassCombatData.base_magic_resist_value), "base"), Class(nameof(ClassCombatData.base_magic_resist_per_level), "per_level"),
            Pet(nameof(PetData.magic_resist)), Pet(nameof(PetData.magic_resist_base), "base"), Pet(nameof(PetData.magic_resist_per_level), "per_level"),
        }, Min: 0),
        // Source: server-scripts/Combat.cs:fireResist — Fire Resist has a minimum of zero and no maximum.
        new("fire_resist", "fire_resist", "Fire Resist", "integer", new[]
        {
            Item(nameof(ItemStats.fire_resist)), Skill(nameof(SkillData.fire_resist_bonus)),
            Class(nameof(ClassCombatData.base_fire_resist_value), "base"), Class(nameof(ClassCombatData.base_fire_resist_per_level), "per_level"),
            Pet(nameof(PetData.fire_resist)), Pet(nameof(PetData.fire_resist_base), "base"), Pet(nameof(PetData.fire_resist_per_level), "per_level"),
        }, Min: 0),
        // Source: server-scripts/Combat.cs:coldResist — Cold Resist has a minimum of zero and no maximum.
        new("cold_resist", "cold_resist", "Cold Resist", "integer", new[]
        {
            Item(nameof(ItemStats.cold_resist)), Skill(nameof(SkillData.cold_resist_bonus)),
            Class(nameof(ClassCombatData.base_cold_resist_value), "base"), Class(nameof(ClassCombatData.base_cold_resist_per_level), "per_level"),
            Pet(nameof(PetData.cold_resist)), Pet(nameof(PetData.cold_resist_base), "base"), Pet(nameof(PetData.cold_resist_per_level), "per_level"),
        }, Min: 0),
        // Source: server-scripts/Combat.cs:diseaseResist — Disease Resist has a minimum of zero and no maximum.
        new("disease_resist", "disease_resist", "Disease Resist", "integer", new[]
        {
            Item(nameof(ItemStats.disease_resist)), Skill(nameof(SkillData.disease_resist_bonus)),
            Class(nameof(ClassCombatData.base_disease_resist_value), "base"), Class(nameof(ClassCombatData.base_disease_resist_per_level), "per_level"),
            Pet(nameof(PetData.disease_resist)), Pet(nameof(PetData.disease_resist_base), "base"), Pet(nameof(PetData.disease_resist_per_level), "per_level"),
        }, Min: 0),
        // Source: server-scripts/Combat.cs:poisonResist — Poison Resist has a minimum of zero and no maximum.
        // Source: server-scripts/Constitution.cs:GetPoisonResistBonus — Each Constitution point adds 0.25 Poison Resist before rounding.
        new("poison_resist", "poison_resist", "Poison Resist", "integer", new[]
        {
            Item(nameof(ItemStats.poison_resist)), Skill(nameof(SkillData.poison_resist_bonus)),
            Class(nameof(ClassCombatData.base_poison_resist_value), "base"), Class(nameof(ClassCombatData.base_poison_resist_per_level), "per_level"),
            Pet(nameof(PetData.poison_resist)), Pet(nameof(PetData.poison_resist_base), "base"), Pet(nameof(PetData.poison_resist_per_level), "per_level"),
        }, Min: 0, PerPointOf: new[] { new StatPerPointData("constitution", 0.25) }),
        // Source: server-scripts/Combat.cs:damage — Attack Power has a minimum of zero and no maximum.
        // Source: server-scripts/Strength.cs:GetDamageBonus — Each Strength point adds one Attack Power.
        new("attack_power", "attack_power", "Attack Power", "integer", new[]
        {
            Item(nameof(ItemStats.damage)), Skill(nameof(SkillData.damage_bonus)), Skill(nameof(SkillData.damage_percent_bonus), "percent"),
            Class(nameof(ClassCombatData.base_damage_value), "base"), Class(nameof(ClassCombatData.base_damage_per_level), "per_level"),
            Pet(nameof(PetData.damage)), Pet(nameof(PetData.damage_base), "base"), Pet(nameof(PetData.damage_per_level), "per_level"),
        }, Min: 0, PerPointOf: new[] { new StatPerPointData("strength", 1) }),
        // Source: server-scripts/Combat.cs:magicDamage — Spell Power has a minimum of zero and no maximum.
        // Source: server-scripts/Intelligence.cs:GetMagicDamageBonus — Each Intelligence point adds 1.5 Spell Power before rounding.
        new("spell_power", "spell_power", "Spell Power", "integer", new[]
        {
            Item(nameof(ItemStats.magic_damage)), Skill(nameof(SkillData.magic_damage_bonus)), Skill(nameof(SkillData.magic_damage_percent_bonus), "percent"),
            Class(nameof(ClassCombatData.base_magic_damage_value), "base"), Class(nameof(ClassCombatData.base_magic_damage_per_level), "per_level"),
            Pet(nameof(PetData.magic_damage)), Pet(nameof(PetData.magic_damage_base), "base"), Pet(nameof(PetData.magic_damage_per_level), "per_level"),
        }, Min: 0, PerPointOf: new[] { new StatPerPointData("intelligence", 1.5) }),
        // Source: server-scripts/Combat.cs:haste — Haste clamps to [-0.8, 0.8].
        new("haste", "haste", "Haste", "percent", new[] { Item(nameof(ItemStats.haste)), Skill(nameof(SkillData.haste_bonus)) }, Min: -0.8, Max: 0.8),
        // Source: server-scripts/Combat.cs:spellHaste — The displayed Spell Casting Haste clamps to [-0.5, 0.5].
        new("spell_haste", "spell_haste", "Spell Casting Haste", "percent", new[] { Item(nameof(ItemStats.spell_haste)), Skill(nameof(SkillData.spell_haste_bonus)) }, Min: -0.5, Max: 0.5),
        // Source: server-scripts/Combat.cs:criticalChance — Critical Strike clamps to [0, 0.7].
        // Source: server-scripts/Dexterity.cs:GetCriticalChanceBonus — Each Dexterity point adds 0.0003 Critical Strike.
        new("critical_chance", "critical_strike", "Critical Chance", "percent", new[]
        {
            Item(nameof(ItemStats.critical_chance)), Skill(nameof(SkillData.critical_chance_bonus)),
            Class(nameof(ClassCombatData.base_critical_chance_value), "base"), Class(nameof(ClassCombatData.base_critical_chance_per_level), "per_level"),
            Pet(nameof(PetData.critical_chance)), Pet(nameof(PetData.critical_chance_base), "base"), Pet(nameof(PetData.critical_chance_per_level), "per_level"),
        }, Min: 0, Max: 0.7, PerPointOf: new[] { new StatPerPointData("dexterity", 0.0003) }),
        // Source: server-scripts/Combat.cs:blockChance — Block Chance adds 0.0001 per Armor Class point and clamps to [0, 0.8].
        // Source: server-scripts/Constitution.cs:GetBlockChanceBonus — Each Constitution point adds 0.0003 Block Chance.
        new("block_chance", "block_chance", "Block Chance", "percent", new[]
        {
            Item(nameof(ItemStats.block_chance)), Skill(nameof(SkillData.block_chance_bonus)),
            Class(nameof(ClassCombatData.base_block_chance_value), "base"), Class(nameof(ClassCombatData.base_block_chance_per_level), "per_level"),
            Pet(nameof(PetData.block_chance)), Pet(nameof(PetData.block_chance_base), "base"), Pet(nameof(PetData.block_chance_per_level), "per_level"),
        }, Min: 0, Max: 0.8, PerPointOf: new[] { new StatPerPointData("armor_class", 0.0001), new StatPerPointData("constitution", 0.0003) }),
        // Source: server-scripts/Health.cs:recoveryRate — Health Regeneration adds recovery bonuses without a clamp.
        // Source: server-scripts/Skills.cs:GetPassiveHealthRecoveryBonus — Percent Health Regeneration uses maximum Hit Points.
        new("health_regen", "hp_regen", "Health Regen", "decimal", new[]
        {
            Item(nameof(ItemStats.hp_regen_bonus), "per_second"), Skill(nameof(SkillData.healing_per_second_bonus), "per_second"),
            Skill(nameof(SkillData.health_percent_per_second_bonus), "percent_of_max_per_second"),
        }, PoolId: "health"),
        // Source: server-scripts/Mana.cs:recoveryRate — Mana Regeneration adds recovery bonuses without a clamp.
        // Source: server-scripts/Skills.cs:GetManaRecoveryBonus — Percent Mana Regeneration uses maximum Mana.
        new("mana_regen", "mana_regen", "Mana Regen", "decimal", new[]
        {
            Item(nameof(ItemStats.mana_regen_bonus), "per_second"), Skill(nameof(SkillData.mana_per_second_bonus), "per_second"),
            Skill(nameof(SkillData.mana_percent_per_second_bonus), "percent_of_max_per_second"),
            Class(nameof(ClassCombatData.base_mana_recovery_rate), modifier: "per_second"), Pet(nameof(PetData.base_mana_recovery_rate), modifier: "per_second"),
        }, PoolId: "mana"),
        // Source: server-scripts/Energy.cs:recoveryRate — Rage Regeneration adds recovery bonuses without a clamp.
        // Source: server-scripts/Skills.cs:GetEnergyRecoveryBonus — Percent Rage Regeneration uses maximum Rage.
        new("rage_regen", "rage_regen", null, "decimal", new[]
        {
            Skill(nameof(SkillData.energy_per_second_bonus), "per_second"), Skill(nameof(SkillData.energy_percent_per_second_bonus), "percent_of_max_per_second"),
            Class(nameof(ClassCombatData.base_energy_recovery_rate), modifier: "per_second"), Pet(nameof(PetData.base_energy_recovery_rate), modifier: "per_second"),
        }, PoolId: "rage"),
        // Source: server-scripts/Combat.cs:accuracy — Accuracy clamps to [-0.5, 1].
        // Source: server-scripts/Dexterity.cs:GetAccuracyBonus — Each Dexterity point adds 0.0005 Accuracy.
        new("accuracy", "accuracy", "Accuracy", "percent", new[]
        {
            Item(nameof(ItemStats.accuracy)), Skill(nameof(SkillData.accuracy_bonus)),
            Class(nameof(ClassCombatData.base_accuracy_value), "base"), Class(nameof(ClassCombatData.base_accuracy_per_level), "per_level"),
            Pet(nameof(PetData.accuracy)), Pet(nameof(PetData.accuracy_base), "base"), Pet(nameof(PetData.accuracy_per_level), "per_level"),
        }, Min: -0.5, Max: 1, PerPointOf: new[] { new StatPerPointData("dexterity", 0.0005) }),
        // Source: server-scripts/Combat.cs:criticalResist — Critical Resist clamps to [0, 1].
        // Source: server-scripts/Dexterity.cs:GetCriticalResistBonus — Each Dexterity point adds 0.0005 Critical Resist.
        new("critical_resist", "critical_resist", "Critical Resist", "percent", new[] { Item(nameof(ItemStats.critical_resist)), Skill(nameof(SkillData.critical_resist_bonus)) },
            Min: 0, Max: 1, PerPointOf: new[] { new StatPerPointData("dexterity", 0.0005) }),
        // Source: server-scripts/Player.cs:speed — Movement Speed sums bonuses without a clamp.
        new("movement_speed", "movement_speed", null, "decimal", new[] { Item(nameof(ItemStats.speed_bonus)), Skill(nameof(SkillData.speed_bonus)) }),
        // Source: server-scripts/Combat.cs:fearResistChance — Fear Resist clamps to [0, 1].
        // Source: server-scripts/EquipmentItem.cs:ToolTip — Fear Resist is displayed as a percentage.
        new("fear_resist", null, "Fear Resist", "percent", new[] { Item(nameof(ItemStats.resist_fear_chance)), Skill(nameof(SkillData.fear_resist_chance_bonus)) }, Min: 0, Max: 1),
        // Source: server-scripts/Combat.cs:DealDamageAt — Ward, Damage Shield and Heal on Hit are read from individual buffs, not clamped summed stat getters.
        // Source: server-scripts/BonusSkill.cs:ToolTipUpgrade — Ward and Damage Shield display whole amounts.
        // Source: server-scripts/BonusSkill.cs:ToolTip — Heal on Hit and Cooldown Reduction display percentages.
        new("ward", null, null, "integer", new[] { Skill(nameof(SkillData.ward_bonus)) }, SiteName: "Ward", OverrideReason: "This hit-time effect appears in neither stat window. The site keeps its existing name."),
        new("damage_shield", null, null, "integer", new[] { Skill(nameof(SkillData.damage_shield)) }, SiteName: "Damage Shield", OverrideReason: "This hit-time effect appears in neither stat window. The site keeps its existing name."),
        new("heal_on_hit", null, null, "percent", new[] { Skill(nameof(SkillData.heal_on_hit_percent)) }, SiteName: "Heal on Hit", OverrideReason: "This hit-time effect appears in neither stat window. The site keeps its existing name."),
        // Source: server-scripts/TargetBuffSkill.cs:Apply — Cooldown Reduction acts on remaining cooldown when cast, not through a clamped stat getter.
        new("cooldown_reduction", null, null, "percent", new[] { Skill(nameof(SkillData.cooldown_reduction_percent)) }, SiteName: "Cooldown Reduction", OverrideReason: "This cast-time effect appears in neither stat window. The site keeps its existing name."),
    };

    public static IReadOnlyList<NonStatFieldData> NonStatFields { get; } = new NonStatFieldData[]
    {
        new("item", nameof(ItemStats.max_durability), "Item durability, not a character stat"),
        new("pet", nameof(PetData.level), "Prefab snapshot level, not a stat bonus"),
        new("pet", nameof(PetData.level_max), "Summoning level cap, not a stat bonus"),
        new("pet", nameof(PetData.health_multiplier), "Multiplier on the base Health curve, not an additive stat bonus"),
        new("skill", nameof(SkillData.tier), "Skill progression tier"),
        new("skill", nameof(SkillData.max_level), "Skill rank cap"),
        new("skill", nameof(SkillData.level_required), "Learning requirement"),
        new("skill", nameof(SkillData.level_requirement), "Learning requirement curve"),
        new("skill", nameof(SkillData.required_skill_points), "Learning cost"),
        new("skill", nameof(SkillData.skill_point_cost), "Learning cost curve"),
        new("skill", nameof(SkillData.required_spent_points), "Learning requirement"),
        new("skill", nameof(SkillData.prerequisite_level), "Prerequisite skill rank"),
        new("skill", nameof(SkillData.prerequisite2_level), "Prerequisite skill rank"),
        new("skill", nameof(SkillData.mana_cost), "Resource spent on a cast"),
        new("skill", nameof(SkillData.energy_cost), "Resource spent on a cast"),
        new("skill", nameof(SkillData.cooldown), "Skill cooldown, not a character stat"),
        new("skill", nameof(SkillData.cast_time), "Skill cast time, not a character stat"),
        new("skill", nameof(SkillData.cast_range), "Skill range, not a character stat"),
        new("skill", nameof(SkillData.damage), "Damage dealt by the skill, not Attack Power"),
        new("skill", nameof(SkillData.damage_percent), "Skill damage scaling, not an Attack Power bonus"),
        new("skill", nameof(SkillData.lifetap_percent), "Skill lifetap healing fraction"),
        new("skill", nameof(SkillData.knockback_chance), "Skill knockback chance"),
        new("skill", nameof(SkillData.knockback_distance), "Skill knockback distance"),
        new("skill", nameof(SkillData.stun_chance), "Skill stun chance"),
        new("skill", nameof(SkillData.stun_time), "Skill stun duration"),
        new("skill", nameof(SkillData.fear_chance), "Skill fear chance"),
        new("skill", nameof(SkillData.fear_time), "Skill fear duration"),
        new("skill", nameof(SkillData.aggro), "Threat generated by the skill"),
        new("skill", nameof(SkillData.break_armor_prob), "Skill armor-break chance"),
        new("skill", nameof(SkillData.area_object_size), "Area object size"),
        new("skill", nameof(SkillData.area_object_delay_damage), "Area damage timing"),
        new("skill", nameof(SkillData.area_objects_to_spawn), "Area object count"),
        new("skill", nameof(SkillData.heals_health), "Hit Points restored by the skill, not maximum Hit Points"),
        new("skill", nameof(SkillData.heals_mana), "Mana restored by the skill, not maximum Mana"),
        new("skill", nameof(SkillData.healing_percent), "Death Bloom healing fraction"),
        new("skill", nameof(SkillData.healing_percent_per_intelligence), "Death Bloom healing scaling"),
        new("skill", nameof(SkillData.mana_restored_percent), "Blood Pact Mana restoration fraction"),
        new("skill", nameof(SkillData.health_cost_percent), "Hit Points spent on a cast"),
        new("skill", nameof(SkillData.channel_pulses), "Channel damage pulse count"),
        new("skill", nameof(SkillData.duration_base), "Buff duration, not a stat curve"),
        new("skill", nameof(SkillData.duration_per_level), "Buff duration scaling, not a stat curve"),
        new("skill", nameof(SkillData.fear_resist_chance_bonus_cap), "Cap on an individual buff's Fear Resist bonus"),
        new("skill", nameof(SkillData.prob_ignore_cleanse), "Buff cleanse resistance chance"),
        new("skill", nameof(SkillData.damage_over_time_bonus_per_charisma_point), "Damage-over-time scaling per caster Charisma"),
        new("skill", nameof(SkillData.charisma_power_bonus_multiplier), "Multiplier on a buff's Charisma scaling"),
        new("skill", nameof(SkillData.damage_over_time_bonus_per_intelligence_point), "Damage-over-time scaling per caster Intelligence"),
        new("skill", nameof(SkillData.lifetap_healing_percent_bonus), "Lifetap-specific healing multiplier"),
        new("skill", nameof(SkillData.additional_damage_percent_per_song), "Conditional Virtuosity damage scaling"),
        new("skill", nameof(SkillData.charmed_damage_percent), "Damage scaling for charmed targets"),
        new("skill", nameof(SkillData.additional_active_bard_songs), "Active song limit bonus"),
        new("skill", nameof(SkillData.bard_song_duration_bonus_per_level), "Song duration scaling"),
        new("skill", nameof(SkillData.extra_gather_item_chance), "Gathering utility chance"),
        new("skill", nameof(SkillData.food_and_drink_buff_duration_bonus_per_level), "Food and drink duration scaling"),
        new("skill", nameof(SkillData.damage_over_time_execute_bonus), "Conditional damage-over-time multiplier"),
        new("skill", nameof(SkillData.summoned_monster_level), "Summoned monster level"),
        new("skill", nameof(SkillData.summon_count_per_cast), "Summoned monster count"),
        new("skill", nameof(SkillData.max_active_summons), "Active summoned monster limit"),
    };

    private static readonly IReadOnlyDictionary<string, Type> ModelTypes = new Dictionary<string, Type>
    {
        ["item"] = typeof(ItemStats), ["skill"] = typeof(SkillData),
        ["class"] = typeof(ClassCombatData), ["pet"] = typeof(PetData),
    };

    public static void Validate() => Validate(Stats, NonStatFields);

    public static void Validate(IReadOnlyList<StatDefinition> stats, IReadOnlyList<NonStatFieldData> nonStatFields)
    {
        var ids = new HashSet<string>(StringComparer.Ordinal);
        foreach (var stat in stats)
        {
            if (!ids.Add(stat.Id))
                throw new InvalidOperationException($"Duplicate stat id '{stat.Id}'.");
        }

        var declarations = new HashSet<(string Source, string Field)>();
        foreach (var stat in stats)
        {
            foreach (var field in stat.Fields)
            {
                Declare(field.source, field.field);
                if (field.modifier is not ("flat" or "percent" or "per_second" or "percent_of_max_per_second"))
                    throw new InvalidOperationException($"{Describe(field.source, field.field)} has unknown modifier '{field.modifier}'.");
                if (field.curve is not (null or "base" or "per_level"))
                    throw new InvalidOperationException($"{Describe(field.source, field.field)} has unknown curve '{field.curve}'.");
            }
            foreach (var term in stat.PerPointOf ?? Array.Empty<StatPerPointData>())
            {
                if (!ids.Contains(term.stat_id))
                    throw new InvalidOperationException($"{StatFields(stat)} per_point_of names unknown stat '{term.stat_id}'.");
            }
            if (stat.PoolId != null)
            {
                if (!ids.Contains(stat.PoolId))
                    throw new InvalidOperationException($"{StatFields(stat)} pool_id names unknown stat '{stat.PoolId}'.");
                if (!stat.Fields.Any(field => field.modifier is "per_second" or "percent_of_max_per_second"))
                    throw new InvalidOperationException($"{StatFields(stat)} pool_id requires a regeneration field.");
            }
        }
        foreach (var field in nonStatFields)
        {
            Declare(field.source, field.field);
            if (string.IsNullOrWhiteSpace(field.reason))
                throw new InvalidOperationException($"{Describe(field.source, field.field)} has no non-stat reason.");
        }
        foreach (var model in ModelTypes)
        {
            foreach (var property in model.Value.GetProperties(BindingFlags.Public | BindingFlags.Instance))
            {
                if (IsNumeric(property.PropertyType) && !declarations.Contains((model.Key, property.Name)))
                    throw new InvalidOperationException($"{model.Value.Name}.{property.Name} has no stat or non-stat declaration.");
            }
        }

        void Declare(string source, string field)
        {
            if (!ModelTypes.TryGetValue(source, out var type))
                throw new InvalidOperationException($"Unknown stat source '{source}' for property '{field}'.");
            var property = type.GetProperty(field, BindingFlags.Public | BindingFlags.Instance);
            if (property == null || !IsNumeric(property.PropertyType))
                throw new InvalidOperationException($"{type.Name}.{field} is not a numeric export property.");
            if (!declarations.Add((source, field)))
                throw new InvalidOperationException($"{type.Name}.{field} has duplicate stat or non-stat declarations.");
        }
    }

    private static string Describe(string source, string field) =>
        ModelTypes.TryGetValue(source, out var type) ? $"{type.Name}.{field}" : $"{source}.{field}";

    private static string StatFields(StatDefinition stat) =>
        $"Stat '{stat.Id}' ({string.Join(", ", stat.Fields.Select(field => Describe(field.source, field.field)))})";

    private static bool IsNumeric(Type type)
    {
        type = Nullable.GetUnderlyingType(type) ?? type;
        return type == typeof(int) || type == typeof(long) || type == typeof(float)
            || type == typeof(LinearStatBonus) || type == typeof(LinearStatBonusFloat);
    }
}

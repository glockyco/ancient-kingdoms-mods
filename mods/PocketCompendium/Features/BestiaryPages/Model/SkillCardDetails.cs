#nullable disable
using System;
using System.Collections.Generic;
using PocketCompendium.Features.BestiaryPages.Skills;

namespace PocketCompendium.Features.BestiaryPages.Model;

/// <summary>The Skills panel's hover texts: a skill's full mechanics in the website's terms.</summary>
internal static class SkillCardDetails
{
    public static string Hover(MonsterSkillFacts skill, string skillName, string monsterName)
    {
        // Source: SummonSkillMonsters.cs:30-56. Summoning assigns its own stun end,
        // rather than using Combat's ordinary stun rules.
        if (skill.SummonsTarget)
            return $"<b>{skillName}</b>\nSummons {monsterName}'s target from {SkillText.Range(skill.SummonMinimumReach, skill.SummonMaximumReach, "yd")} away and stuns it for {SkillText.Seconds(2)}."
                + CastBar(skill, monsterName, " ")
                + $" {monsterName} cannot summon a target within {SkillText.Yards(skill.SummonMinimumReach)}.";

        var paragraphs = new List<string>();
        var delivery = Delivery(skill, monsterName);
        paragraphs.Add($"<b>{skillName}</b>" + (delivery.Length == 0 ? "" : "\n" + delivery));
        var effect = skill.Effect;
        if (skill.Damage.HasValue)
            paragraphs.Add(Damage(skill));
        foreach (var control in skill.Controls)
            paragraphs.Add(Control(control));
        if (Value(effect.lifetap_percent) > 0)
        {
            // Source: website/src/lib/components/skill-mechanics/Lifetap.svelte.
            paragraphs.Add($"Lifetap: Heals {monsterName} for {SkillText.Percent(Value(effect.lifetap_percent))} of each hit's damage after the target's defenses, Ward and Mana Shield, rounded down. Damage beyond the target's remaining health still counts. Lifetap healing bonuses multiply the healing.");
        }
        if (effect.skill_type is "target_debuff" or "area_debuff")
        {
            paragraphs.Add(DebuffResistance(effect));
            if (effect.is_dispel)
            {
                // Source: website/src/lib/components/skill-mechanics/Dispel.svelte, monster-cast branch.
                paragraphs.Add("Dispel: Removes beneficial buffs from you and your pets. If it lands, you lose skill, food, potion and relic buffs. Rest and Bard songs stay. Pets also lose Rest.");
            }
            else
                paragraphs.Add(CleanseResistance(effect));
        }
        if (effect.skill_type is "target_buff" or "area_buff" or "target_debuff" or "area_debuff" or "passive")
            BuffEffects(skill, monsterName, paragraphs);
        if (skill.Heals)
            Healing(skill, monsterName, paragraphs);
        if (effect.summon_count_per_cast != 0 && effect.skill_type == "summon_monsters")
        {
            // Source: SummonSkillMonsters.cs:59-124. Negative count scales with aggroed players and mercenaries.
            var count = effect.summon_count_per_cast < 0
                ? $"{SkillText.Number(1)} {effect.summoned_monster_name} per player or mercenary on its aggro list"
                : $"{SkillText.Number(effect.summon_count_per_cast ?? 0)} {effect.summoned_monster_name}";
            paragraphs.Add($"Summons: Summons {count} at level {SkillText.Number(effect.summoned_monster_level ?? 0)}, up to {SkillText.Number(effect.max_active_summons ?? 0)} active at once.");
        }
        if (skill.Enrages)
        {
            // Source: SkillEffectFormatter.cs and Combat.cs:863-906. Enrage only changes non-spell damage.
            paragraphs.Add($"Enrage: Below {SkillText.Percent(skill.EnrageBelowHealth.Value)} health, {monsterName} deals {SkillText.Percent(0.5)} to {SkillText.Percent(0.75)} more non-spell damage.");
        }
        var castBar = CastBar(skill, monsterName, "");
        if (castBar.Length > 0) paragraphs.Add(castBar);
        return string.Join("\n\n", paragraphs);
    }

    private static string Delivery(MonsterSkillFacts skill, string monsterName)
    {
        // Source: AreaDamageSkill.cs:Apply, FrontalDamageSkill.cs:Apply, AreaObjectSpawnSkill.cs:35-47,159.
        var text = skill.Shape switch
        {
            // Source: FrontalProjectilesSkill.Apply fires a set number of projectiles at targets in the square.
            SkillShape.FrontalSquare when skill.Effect.skill_type == "frontal_projectiles" => $"Fires projectiles at targets in a {SkillText.Yards(skill.Reach)} square in front of {monsterName}.",
            SkillShape.FrontalSquare => $"Hits everyone in a {SkillText.Yards(skill.Reach)} square in front of {monsterName}.",
            SkillShape.AroundCaster when skill.Effect.skill_type is "area_buff" or "area_heal" => $"Affects {monsterName} and every monster within {SkillText.Yards(skill.Reach)}.",
            // Source: AreaDamageSkill.cs:101-105 replaces the area targets with one random target.
            SkillShape.AroundCaster when skill.Effect.affects_random_target => $"Hits one random target within {SkillText.Yards(skill.Reach)} of {monsterName}.",
            SkillShape.AroundCaster => $"Hits everyone within {SkillText.Yards(skill.Reach)} of {monsterName}.",
            SkillShape.GroundZones => $"Creates {SkillText.Number(skill.RandomGroundZones)} random ground zones within {SkillText.Yards(skill.Reach)} of {monsterName} and {SkillText.Number(skill.TargetGroundZones)} on its target. Each zone is {SkillText.Yards(skill.GroundZoneDiameter)} wide and warns for {SkillText.Seconds(skill.GroundWarningSeconds)} before it hits.",
            SkillShape.Target when skill.Effect.skill_type == "target_buff" => $"Affects {monsterName}.",
            SkillShape.Target when skill.Effect.skill_type == "summon_monsters" => "",
            SkillShape.Target => $"Hits the target within {SkillText.Yards(skill.Reach)}.",
            _ => "",
        };
        // Source: ProjectileSkillEffect.cs:FixedUpdate follows Networktarget each frame.
        if (skill.ProjectileHoming)
            text += " Projectiles home in on their targets, so moving does not dodge them.";
        return text;
    }

    private static string Damage(MonsterSkillFacts skill)
    {
        var type = string.IsNullOrEmpty(skill.Effect.damage_type) ? "Physical" : skill.Effect.damage_type;
        var text = $"Skill Damage: {SkillText.Number(skill.Damage.Value)} {type.ToLowerInvariant()}.";
        // Source: website/src/lib/components/skill-mechanics/Damage.svelte,
        // website/src/lib/skills/skill-facts.ts:DAMAGE_MECHANICS and calculation/combat.ts:DEFENSE_RATES.
        if (skill.Effect.is_manaburn_skill)
            return text + " Bypasses avoidance, Armor Class and resistance. Random variance, Combat Advantage, the level adjustment and critical hits still apply.";
        if (type == "Physical")
            return text + $" Each point of your Armor Class removes {SkillText.Percent(0.0005)} of it, up to {SkillText.Percent(0.9)}. Physical hits can also be blocked or missed.";
        return text + $" Each point of your {ResistStat(type)} removes {SkillText.Percent(0.0005)} of it, up to {SkillText.Percent(0.9)}, and adds {SkillText.Percent(0.0005)} to your chance to resist it outright.";
    }

    private static string Control(ControlEffect control)
    {
        var chance = SkillText.Percent(control.Chance);
        var duration = SkillText.Range(control.MinimumDuration, control.MaximumDuration, "s");
        // Source: website/src/lib/components/skill-mechanics/Stun.svelte. The approved hover
        // keeps the ordinary stun rules here, without the mount-specific exception.
        if (control.Kind == SkillThreatKind.Stun)
            return $"Stun: {chance} chance for {duration}. A feared target cannot be stunned, and a shorter stun cannot shorten an existing stun. Stuns dismount you.";
        // Source: website/src/lib/components/skill-mechanics/Fear.svelte, monster-cast rules.
        if (control.Kind == SkillThreatKind.Fear)
            return $"Fear: {chance} chance for {duration}. Every boss and any monster or companion whose page lists Immune to Fear is immune. A hit that stuns cannot also cause fear. The target's Fear Resist is a separate chance to avoid fear, even when this skill's fear chance succeeds. Reapplying fear can shorten it. Fear dismounts you.";
        // Source: website/src/lib/components/skill-mechanics/Knockback.svelte.
        return $"Knockback: {chance} chance to push the target back {SkillText.Yards(control.Distance)} and stun it for {SkillText.Seconds(0.25)}. Cannot affect a stunned target or a hit that causes stun or fear. If an obstacle blocks the path, the target also takes {SkillText.Percent(0.0125)} of the damage just dealt, rounded up to at least {SkillText.Number(1)}. Targets {SkillText.Number(15)} or more levels above the attacker cannot be knocked back, unless the attacker is a boss.";
    }

    private static string DebuffResistance(SkillEffectInput effect)
    {
        // Source: website/src/lib/skills/skill-facts.ts:debuffResistance and
        // website/src/lib/components/skill-mechanics/ResistChance.svelte.
        var stat = DebuffStat(effect);
        if (stat == null) return "Resist Chance: The target gets no resist roll against this debuff.";
        return $"Resist Chance: Each point of the target's {stat} adds {SkillText.Percent(0.0005)} to its chance to resist this {(effect.is_dispel ? "skill" : "debuff")}. Each {SkillText.Percent(0.01)} of the caster's Accuracy subtracts {SkillText.Percent(0.01)} from that chance. Each level the target is above the caster adds {SkillText.Percent(0.005)}, and each level below subtracts {SkillText.Percent(0.005)}, up to {SkillText.Percent(0.1)} either way. The chance stays between {SkillText.Percent(0)} and {SkillText.Percent(0.9)}.";
    }

    private static string CleanseResistance(SkillEffectInput effect)
    {
        // Source: website/src/lib/components/skill-mechanics/CleanseResistance.svelte.
        if (!(effect.is_magic_debuff || effect.is_poison_debuff || effect.is_fire_debuff || effect.is_cold_debuff || effect.is_disease_debuff))
            return "Cleanse Resist: No cleanse can remove this debuff.";
        var chance = effect.prob_ignore_cleanse ?? 0;
        if (chance >= 1) return "Cleanse Resist: This debuff cannot be cleansed.";
        if (chance <= 0) return "Cleanse Resist: A matching cleanse removes this debuff completely in a single cast.";
        var text = $"Cleanse Resist: This debuff has {SkillText.Percent(chance)} Cleanse Resist and three layers. Cleansing removes the debuff only after all three are gone. A matching cleanse always removes one layer. Each of the other two layers has an independent {SkillText.Percent(1 - chance)} multiplied by ({SkillText.Percent(1)} + the cleansing caster's Accuracy) chance of removal, limited to {SkillText.Percent(0)} to {SkillText.Percent(1)}. At {SkillText.Percent(1)}, one cast removes all three layers.";
        if (Value(effect.healing_per_second_bonus) < 0)
            text += $" After a cleanse removes layers, each damage tick deals {SkillText.Percent(0.85)} with two layers left and {SkillText.Percent(0.7)} with one, rounded up.";
        return text;
    }

    private static void BuffEffects(MonsterSkillFacts skill, string monsterName, List<string> paragraphs)
    {
        var e = skill.Effect;
        var duration = e.is_permanent ? " This effect is permanent." : e.duration_base > 0 ? $" Lasts {SkillText.Seconds(e.duration_base)}." : "";
        var speed = Value(e.speed_bonus);
        // Source: SkillEffectFormatter.cs:462-471 and website/src/lib/components/skill-mechanics/Root.svelte.
        if (speed <= -50)
        {
            // Source: website/src/lib/components/skill-mechanics/Sleep.svelte.
            paragraphs.Add($"Sleep: Stops movement and action, cancels a monster's cast and makes it drop its target. Direct damage, ordinary damage-over-time ticks and applying a damage-over-time debuff wake the target. Ordering your pet to attack a sleeping monster or NPC also wakes it. Reaper Form health drain does not. Bosses and elite monsters always resist sleep. Every {SkillText.Seconds(6)}, a sleeping monster, NPC or pet rolls to wake. Each point of its Magic Resist adds {SkillText.Percent(0.001)} to that chance, which stays between {SkillText.Percent(0.05)} and {SkillText.Percent(0.95)}." + duration);
        }
        else if (speed <= -10)
            paragraphs.Add($"Root: Stops movement and does not break when the target takes damage. A rooted companion or mercenary has a {SkillText.Percent(0.1)} chance to break free every second. A rooted player has no automatic break-free roll." + duration);
        else if (speed < 0)
            paragraphs.Add($"Slow: Reduces speed by {SkillText.Number(-speed)}." + duration);
        else if (speed > 0)
            paragraphs.Add($"Movement: Increases speed by {SkillText.Number(speed)}." + duration);
        if (e.is_blindness)
        {
            // Source: website/src/lib/components/skill-mechanics/Blindness.svelte.
            paragraphs.Add($"Blindness: Covers the affected player's screen with a black overlay. It changes no combat stats and affects only players. The overlay fades out over {SkillText.Seconds(1)} when the effect ends." + duration);
        }
        if (Value(e.healing_per_second_bonus) < 0)
        {
            // Source: SkillEffectFormatter.cs:578-590 and website/src/lib/components/skill-mechanics/DebuffResistance.svelte.
            var stat = e.is_melee_debuff || e.damage_over_time_type == "Physical"
                ? "Armor Class" : ResistStat(e.damage_over_time_type ?? "Magic");
            paragraphs.Add($"Damage over Time: {SkillText.Number(-Value(e.healing_per_second_bonus))} {(e.damage_over_time_type ?? "Magic").ToLowerInvariant()} damage per second. Each point of the target's {stat} reduces each damage tick by {SkillText.Percent(0.0005)}, up to {SkillText.Percent(0.9)}." + duration);
        }
        // Source: SkillEffectFormatter.cs:594-605, Skills.cs:1663-1669,1897-1903.
        if (Value(e.health_percent_per_second_bonus) < 0)
            paragraphs.Add($"Health Drain: Removes {SkillText.Percent(-Value(e.health_percent_per_second_bonus))} of the target's maximum health per second." + duration);
        ResourceChange(paragraphs, e.mana_per_second_bonus, "mana", false, duration);
        ResourceChange(paragraphs, e.mana_percent_per_second_bonus, "maximum mana", true, duration);
        ResourceChange(paragraphs, e.energy_per_second_bonus, "rage", false, duration);
        ResourceChange(paragraphs, e.energy_percent_per_second_bonus, "maximum rage", true, duration);
        var changes = new List<string>();
        // Source: SkillEffectFormatter.cs:474-554,623-629 maps the same rank-resolved buff fields.
        AddChange(changes, e.health_max_bonus, "maximum health");
        AddChange(changes, e.health_max_percent_bonus, "maximum health", true);
        AddChange(changes, e.mana_max_bonus, "maximum mana");
        AddChange(changes, e.mana_max_percent_bonus, "maximum mana", true);
        AddChange(changes, e.energy_max_bonus, "maximum rage");
        AddChange(changes, e.damage_bonus, "Attack Power");
        AddChange(changes, e.damage_percent_bonus, "Attack Power", true);
        AddChange(changes, e.magic_damage_bonus, "Spell Power");
        AddChange(changes, e.magic_damage_percent_bonus, "Spell Power", true);
        // Source: SkillEffectFormatter.cs:504-515, Combat.cs:DealDamageAt.
        var invulnerable = Value(e.defense_bonus) >= 10000 && Value(e.magic_resist_bonus) >= 10000;
        if (invulnerable) paragraphs.Add("Direct Damage Immunity: Makes the wearer immune to direct damage." + duration);
        else
        {
            AddChange(changes, e.defense_bonus, "Armor Class");
            AddChange(changes, e.magic_resist_bonus, "Magic Resist");
            AddChange(changes, e.poison_resist_bonus, "Poison Resist");
            AddChange(changes, e.fire_resist_bonus, "Fire Resist");
            AddChange(changes, e.cold_resist_bonus, "Cold Resist");
            AddChange(changes, e.disease_resist_bonus, "Disease Resist");
        }
        AddChange(changes, e.ward_bonus, "Ward");
        AddChange(changes, e.haste_bonus, "Haste", true);
        AddChange(changes, e.spell_haste_bonus, "Spell Casting Haste", true);
        AddChange(changes, e.critical_chance_bonus, "Critical Strike", true);
        AddChange(changes, e.critical_resist_bonus, "Critical Resist", true);
        AddChange(changes, e.accuracy_bonus, "Accuracy", true);
        AddChange(changes, e.block_chance_bonus, "Block Chance", true);
        AddChange(changes, e.fear_resist_chance_bonus, "Fear Resist", true);
        AddChange(changes, e.strength_bonus, "Strength");
        AddChange(changes, e.intelligence_bonus, "Intelligence");
        AddChange(changes, e.dexterity_bonus, "Dexterity");
        AddChange(changes, e.constitution_bonus, "Constitution");
        AddChange(changes, e.wisdom_bonus, "Wisdom");
        AddChange(changes, e.charisma_bonus, "Charisma");
        if (changes.Count > 0) paragraphs.Add("Stat Changes: " + SkillText.JoinAnd(changes) + "." + duration);
        if (Value(e.damage_shield) > 0)
        {
            // Source: website/src/lib/components/skill-mechanics/DamageShield.svelte.
            var type = e.damage_shield_type;
            var reduction = string.IsNullOrEmpty(type) || type == "Unknown"
                ? "Armor Class and resist stats do not reduce this shield's damage."
                : $"Each point of the attacker's {(type == "Physical" ? "Armor Class" : ResistStat(type))} reduces this shield's damage by {SkillText.Percent(0.0005)}, up to {SkillText.Percent(0.9)}.";
            paragraphs.Add($"Damage Shield: {SkillText.Number(Value(e.damage_shield))}{(string.IsNullOrEmpty(type) || type == "Unknown" ? "" : " " + type.ToLowerInvariant())} damage to the attacker when a non-spell, single-target attack with a base cast range below {SkillText.Yards(1.5)} hits the wearer. This is a fixed amount, not a share of the incoming hit. Scroll skills and weapon effects triggered on hit cannot trigger it. {reduction} Several shields add together after their individual reductions. The total then varies at random by up to {SkillText.Percent(0.1)} in either direction, with that variation rounded up." + duration);
        }
        // Source: website/src/lib/components/skill-mechanics/Dispel.svelte. Buff removal uses Cleanse Resist, not debuff layers.
        if (e.skill_type is "target_buff" or "area_buff" && e.prob_ignore_cleanse > 0)
            paragraphs.Add($"Cleanse Resist: {SkillText.Percent(e.prob_ignore_cleanse.Value)}. A dispel's removal chance is {SkillText.Percent(1)} minus this buff's Cleanse Resist, adjusted by the dispel's reduction and limited to {SkillText.Percent(0)} to {SkillText.Percent(1)}.");
    }

    private static void Healing(MonsterSkillFacts skill, string monsterName, List<string> paragraphs)
    {
        var e = skill.Effect;
        var amounts = new List<string>();
        // Source: SkillEffectFormatter.cs:FormatHealing and website/src/lib/skills/effect-calculations.ts:healingCalculation.
        if (Value(e.heals_health) > 0) amounts.Add(SkillText.Number(Value(e.heals_health)) + " health");
        if (Value(e.healing_per_second_bonus) > 0) amounts.Add(SkillText.Number(Value(e.healing_per_second_bonus)) + " health per second");
        if (Value(e.health_percent_per_second_bonus) > 0) amounts.Add(SkillText.Percent(Value(e.health_percent_per_second_bonus)) + " of maximum health per second");
        var text = "Healing: Restores " + SkillText.JoinAnd(amounts) + ".";
        if (!e.is_permanent && e.duration_base > 0) text += $" Lasts {SkillText.Seconds(e.duration_base)}.";
        // Source: MonsterSkills.cs:95-103, preserved in MonsterSkillFacts.HealBelowHealth.
        if (skill.HealBelowHealth.HasValue) text += $" {monsterName} uses this only below {SkillText.Percent(skill.HealBelowHealth.Value)} health.";
        if (e.skill_type is "target_heal" or "area_heal")
        {
            // Source: website/src/lib/components/skill-mechanics/Healing.svelte.
            text += $" Critical heals restore double health, or triple in {SkillText.Percent(0.1)} of critical heals. The chance is the caster's Critical Strike.";
            if (e.skill_type == "area_heal") text += " An area heal is critical for all recipients or none.";
        }
        paragraphs.Add(text);
    }

    private static void AddChange(List<string> changes, LinearValue field, string stat, bool percent = false)
    {
        var value = Value(field);
        if (value != 0) changes.Add($"{(value > 0 ? "increases" : "reduces")} {stat} by {(percent ? SkillText.Percent(Math.Abs(value)) : SkillText.Number(Math.Abs(value)))}");
    }

    private static void ResourceChange(List<string> paragraphs, LinearValue field, string resource, bool percent, string duration)
    {
        // Source: SkillEffectFormatter.cs:609-621. Signed regeneration applies each second.
        var value = Value(field);
        if (value != 0) paragraphs.Add($"Resource Change: {(value > 0 ? "Restores" : "Removes")} {(percent ? SkillText.Percent(Math.Abs(value)) + " of " : SkillText.Number(Math.Abs(value)) + " ")}{resource} per second." + duration);
    }

    private static string CastBar(MonsterSkillFacts skill, string monsterName, string prefix)
    {
        // Source: Monster.cs:1085-1108 and UICastBarMonster.cs:30. Only targeted specials show a cast bar.
        if (!skill.IsSpecial) return "";
        return prefix + (skill.HasCastBar
            ? $"The cast bar shows while {monsterName} is your target."
            : $"The {SkillText.Seconds(skill.Delivery.cast_time)} cast is too short for a cast bar.");
    }

    private static string DebuffStat(SkillEffectInput e) => e.is_melee_debuff ? "Armor Class"
        : e.is_poison_debuff ? "Poison Resist" : e.is_fire_debuff ? "Fire Resist"
        : e.is_cold_debuff ? "Cold Resist" : e.is_disease_debuff ? "Disease Resist"
        : e.is_magic_debuff ? "Magic Resist" : null;

    private static string ResistStat(string type) => type switch
    {
        "Magic" => "Magic Resist", "Poison" => "Poison Resist", "Fire" => "Fire Resist",
        "Cold" => "Cold Resist", "Disease" => "Disease Resist",
        _ => throw new InvalidOperationException($"Unknown damage type {type}"),
    };

    private static double Value(LinearValue value) => value?.base_value ?? 0;
}

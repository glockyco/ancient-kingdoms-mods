#nullable disable
using System;
using System.Collections.Generic;
using PocketCompendium.Features.BestiaryPages.Skills;

namespace PocketCompendium.Features.BestiaryPages.Model;

internal static class SkillCardText
{
    public static string Sentence(MonsterSkillFacts skill, string monsterName)
    {
        var e = skill.Effect;
        if (skill.SummonsTarget)
            return $"Summons its target from {SkillText.Range(skill.SummonMinimumReach, skill.SummonMaximumReach, "yd")} away to {monsterName} and stuns it for {SkillText.Seconds(2)}.";
        var sentences = new List<string>();
        var recipients = Recipients(skill);
        // Source: SkillEffectFormatter.FormatDamage and MonsterDamage.Amount resolve the caster's runtime damage.
        if (skill.Damage.HasValue)
        {
            var hit = $"Deals {SkillText.Number(skill.Damage.Value)}{Type(e.damage_type)} damage to {recipients}";
            // Source: SkillEffectFormatter.FormatCrowdControl. Area projectiles do not forward lifetap.
            if (!(e.skill_type == "area_damage" && e.area_projectile) && Value(e.lifetap_percent) > 0)
                hit += Value(e.lifetap_percent) == 1
                    ? $", which heals {monsterName} by the damage dealt"
                    : $", which heals {monsterName} by {SkillText.Percent(Value(e.lifetap_percent))} of the damage dealt";
            sentences.Add(hit + ".");
        }
        // Source: MonsterSkillFacts.Controls mirrors the sequential stun, fear and knockback checks.
        foreach (var control in skill.Controls)
        {
            var duration = SkillText.Range(control.MinimumDuration, control.MaximumDuration, "s");
            var verb = control.Kind switch
            {
                SkillThreatKind.Fear => "fear",
                SkillThreatKind.Knockback => "knock back",
                _ => "stun",
            };
            if (sentences.Count == 0 && control.Chance >= 1)
                sentences.Add((control.Kind == SkillThreatKind.Fear ? "Fears " : control.Kind == SkillThreatKind.Knockback ? "Knocks back " : "Stuns ")
                    + recipients + (control.Kind == SkillThreatKind.Knockback ? " " + SkillText.Yards(control.Distance) : " for " + duration) + ".");
            else
            {
                var target = skill.Shape == SkillShape.Target ? "it" : "them";
                var action = control.Kind == SkillThreatKind.Knockback
                    ? "knock " + target + " back " + SkillText.Yards(control.Distance)
                    : verb + " for " + duration;
                // The game rolls stun, then fear, then knockback, and a hit applies at most one.
                if (control == skill.Controls[0])
                    sentences.Add(SkillText.Percent(control.Chance) + " chance to " + action + ".");
                else if (control.Chance >= 1)
                {
                    var whom = skill.Shape == SkillShape.Target ? "the target" : "them";
                    sentences.Add("Otherwise it " + (control.Kind == SkillThreatKind.Knockback
                        ? "knocks " + whom + " back " + SkillText.Yards(control.Distance)
                        : (control.Kind == SkillThreatKind.Fear ? "fears " : "stuns ") + whom + " for " + duration) + ".");
                }
                else
                    sentences.Add("Otherwise, " + SkillText.Percent(control.Chance) + " chance to " + action + ".");
            }
        }
        // Source: SkillEffectFormatter.FormatCrowdControl, Combat.DealDamageAt durability loss.
        if (e.break_armor_prob > 0)
            sentences.Add($"{SkillText.Percent(e.break_armor_prob.Value)} chance for a random equipped item to lose {SkillText.Range(1, 4, "durability") }.");
        if (e.skill_type == "summon_monsters")
        {
            // Source: SummonSkillMonsters.Apply and SkillEffectFormatter.FormatSummons.
            var name = e.summoned_monster_name ?? e.pet_name ?? e.summoned_monster_id;
            var amount = e.summon_count_per_cast == -1 ? SkillText.Number(1) + " " + name + " per player or mercenary" : SkillText.Number(e.summon_count_per_cast ?? 1) + " " + name;
            var text = "Summons " + amount;
            if (e.summoned_monster_level.HasValue) text += " at level " + SkillText.Number(e.summoned_monster_level.Value);
            if (e.max_active_summons.HasValue) text += ", up to " + SkillText.Number(e.max_active_summons.Value) + " active";
            sentences.Add(text + ".");
        }
        if (e.skill_type is "target_debuff" or "area_debuff" or "target_buff" or "area_buff" or "passive")
            AddBuff(skill, monsterName, recipients, sentences);
        // Source: AreaHealSkill.Apply and MonsterSkills.cs:95-103, as exposed by MonsterSkillFacts.
        if (e.skill_type is "target_heal" or "area_heal")
        {
            var who = e.skill_type == "area_heal" ? monsterName + " and every monster within " + SkillText.Yards(skill.Reach) : monsterName;
            if (e.is_balance_health) sentences.Add("Balances the health percentages of " + who + ".");
            else
            {
                var heals = new List<string>();
                if (Value(e.heals_health) != 0) heals.Add(SkillText.Number(Value(e.heals_health)) + " health");
                if (Value(e.heals_mana) != 0) heals.Add(SkillText.Number(Value(e.heals_mana)) + " mana");
                if (heals.Count > 0) sentences.Add("Restores " + SkillText.JoinAnd(heals) + " to " + who + ".");
                AddHealthGate(skill, sentences);
            }
        }
        // Source: Combat.cs:863-906. Enrage modifies non-spell damage below ten percent health.
        if (skill.Enrages) sentences.Add($"Raises {Possessive(monsterName)} non-spell damage by {SkillText.Percent(0.5)} to {SkillText.Percent(0.75)} while below {SkillText.Percent(skill.EnrageBelowHealth.Value)} health.");
        // Source: AreaObjectSpawnSkill.cs:35-47,159. Each cast adds one zone on the target.
        if (skill.Shape == SkillShape.GroundZones)
            sentences.Add($"Creates {SkillText.Number(skill.RandomGroundZones)} random ground zones and {SkillText.Number(skill.TargetGroundZones)} on the target within {SkillText.Yards(skill.Reach)}, each {SkillText.Yards(skill.GroundZoneDiameter)} wide, with {SkillText.Seconds(skill.GroundWarningSeconds)} warning.");
        // Source: ProjectileSkillEffect.FixedUpdate follows the network target every frame.
        if (skill.ProjectileHoming)
            sentences.Add(e.skill_type == "frontal_projectiles"
                ? "Each projectile follows its target."
                : "The projectile follows " + (e.affects_random_target ? "a random target" : "the target") + ".");
        if (sentences.Count == 0) throw new InvalidOperationException("No sentence for monster skill " + e.id);
        return string.Join(" ", sentences);
    }

    public static string Line(MonsterSkillFacts skill, string skillName, string monsterName) => skillName + ": " + Sentence(skill, monsterName);

    /// <summary>
    /// The summary's threats in the order and words of the approved drafts, such as Nyxarion's
    /// "Summons you, breath in front, fear, knockback and stuns".
    /// </summary>
    public static string Threats(MonsterSkillSummary summary)
    {
        var kinds = new HashSet<SkillThreatKind>();
        var breathsOnly = true;
        foreach (var threat in summary.Threats)
        {
            kinds.Add(threat.Kind);
            if (threat.Kind == SkillThreatKind.Frontal && !threat.Skill.Effect.id.Contains("breath"))
                breathsOnly = false;
        }
        var phrases = new List<string>();
        foreach (var entry in new[] {
            (SkillThreatKind.Summon, "summons you"),
            (SkillThreatKind.Frontal, breathsOnly ? "breath in front" : "attacks in front"),
            (SkillThreatKind.Area, "area attacks"), (SkillThreatKind.Dispel, "buff removal"),
            (SkillThreatKind.Fear, "fear"), (SkillThreatKind.Knockback, "knockback"),
            (SkillThreatKind.Stun, "stuns"), (SkillThreatKind.UncleanseableDebuff, "debuffs no cleanse removes"),
            (SkillThreatKind.Heal, "heals"), (SkillThreatKind.Enrage, "enrage") })
            if (kinds.Contains(entry.Item1)) phrases.Add(entry.Item2);
        return SkillText.Capitalize(SkillText.JoinAnd(phrases));
    }

    private static string Recipients(MonsterSkillFacts skill) => skill.Shape switch
    {
        // Source: AreaDamageSkill.Apply:101-105 selects one victim from the caster's area.
        SkillShape.AroundCaster when skill.Effect.affects_random_target => "a random target within " + SkillText.Yards(skill.Reach),
        SkillShape.AroundCaster => "everyone within " + SkillText.Yards(skill.Reach),
        // Source: FrontalProjectilesSkill.Apply fires a set number of projectiles at targets in the square.
        SkillShape.FrontalSquare when skill.Effect.skill_type == "frontal_projectiles" => "targets in a " + SkillText.Yards(skill.Reach) + " square in front",
        SkillShape.FrontalSquare => "everyone in a " + SkillText.Yards(skill.Reach) + " square in front",
        SkillShape.GroundZones => "everyone in the ground zones",
        SkillShape.Target when skill.ProjectileHoming => "the target within " + SkillText.Yards(skill.Reach),
        _ => "the target",
    };

    private static double Value(LinearValue value) => value?.base_value ?? 0;
    private static string Type(string type) => string.IsNullOrEmpty(type) ? "" : " " + type.ToLowerInvariant();

    // Source: MonsterSkills.cs:95-103. A monster picks its healing skills only below 75% health.
    private static void AddHealthGate(MonsterSkillFacts skill, List<string> sentences)
    {
        if (skill.HealBelowHealth.HasValue)
            sentences.Add("Used only below " + SkillText.Percent(skill.HealBelowHealth.Value) + " health.");
    }

    private static void AddBuff(MonsterSkillFacts skill, string name, string recipients, List<string> sentences)
    {
        var e = skill.Effect;
        var debuff = e.skill_type is "target_debuff" or "area_debuff";
        var actions = new List<string>();
        // Source: SkillEffectFormatter.FormatBuffDebuffStats, including movement thresholds and per-second fields.
        if (e.is_dispel) actions.Add("removes the buffs of " + recipients);
        if (e.is_blindness) actions.Add("blinds " + recipients);
        var speed = Value(e.speed_bonus);
        if (speed <= -50) actions.Add("puts " + recipients + " to sleep");
        else if (speed <= -10) actions.Add("roots " + recipients);
        var changes = new List<Change>();
        var dot = Value(e.healing_per_second_bonus);
        if (dot < 0) changes.Add(Change.To("deals", SkillText.Number(-dot) + Type(e.damage_over_time_type) + " damage per second"));
        if (speed > -10 && speed != 0) changes.Add(Change.Stat(speed, "speed", SkillText.Number(Math.Abs(speed))));
        AddChange(changes, e.health_max_bonus, "maximum health");
        AddChange(changes, e.health_max_percent_bonus, "maximum health", true);
        AddChange(changes, e.mana_max_bonus, "maximum mana");
        AddChange(changes, e.mana_max_percent_bonus, "maximum mana", true);
        AddChange(changes, e.energy_max_bonus, "maximum rage");
        AddChange(changes, e.damage_bonus, "attack power");
        AddChange(changes, e.damage_percent_bonus, "attack power", true);
        AddChange(changes, e.magic_damage_bonus, "spell power");
        AddChange(changes, e.magic_damage_percent_bonus, "spell power", true);
        var immune = Value(e.defense_bonus) >= 10000 && Value(e.magic_resist_bonus) >= 10000;
        if (immune) actions.Add("makes " + name + " immune to direct damage");
        else
        {
            AddChange(changes, e.defense_bonus, "Armor Class");
            var resists = new List<(double Amount, List<string> Names)>();
            foreach (var r in new[] { (e.magic_resist_bonus, "magic"), (e.poison_resist_bonus, "poison"), (e.fire_resist_bonus, "fire"), (e.cold_resist_bonus, "cold"), (e.disease_resist_bonus, "disease") })
            {
                var value = Value(r.Item1);
                if (value == 0) continue;
                var index = resists.FindIndex(g => g.Amount == value);
                if (index < 0) resists.Add((value, new List<string> { r.Item2 }));
                else resists[index].Names.Add(r.Item2);
            }
            foreach (var r in resists) AddChange(changes, new LinearValue(r.Amount, 0), (r.Names.Count == 5 ? "all" : SkillText.JoinAnd(r.Names)) + " resistance");
        }
        AddChange(changes, e.ward_bonus, "ward");
        AddChange(changes, e.haste_bonus, "haste", true);
        AddChange(changes, e.spell_haste_bonus, "spell casting haste", true);
        AddChange(changes, e.critical_chance_bonus, "critical chance", true);
        AddChange(changes, e.critical_resist_bonus, "critical resist", true);
        AddChange(changes, e.accuracy_bonus, "accuracy", true);
        AddChange(changes, e.block_chance_bonus, "block chance", true);
        AddChange(changes, e.fear_resist_chance_bonus, "fear resist", true);
        AddChange(changes, e.strength_bonus, "strength");
        AddChange(changes, e.intelligence_bonus, "intelligence");
        AddChange(changes, e.dexterity_bonus, "dexterity");
        AddChange(changes, e.constitution_bonus, "constitution");
        AddChange(changes, e.wisdom_bonus, "wisdom");
        AddChange(changes, e.charisma_bonus, "charisma");
        if (dot > 0) changes.Add(Change.To("restores", SkillText.Number(dot) + " health per second"));
        AddTick(changes, e.health_percent_per_second_bonus, "maximum health", true);
        AddTick(changes, e.mana_per_second_bonus, "mana", false);
        AddTick(changes, e.mana_percent_per_second_bonus, "maximum mana", true);
        AddTick(changes, e.energy_per_second_bonus, "rage", false);
        AddTick(changes, e.energy_percent_per_second_bonus, "maximum rage", true);
        if (changes.Count > 0)
        {
            // "Roots everyone within 10 yd and lowers their Armor Class by 600 for 10 s."
            var who = debuff ? recipients : e.skill_type == "area_buff" ? name + " and every monster within " + SkillText.Yards(skill.Reach) : name;
            bool group = e.skill_type == "area_buff" || (debuff && skill.Shape != SkillShape.Target && !e.affects_random_target);
            var phrases = new List<string>(actions);
            bool named = actions.Count > 0;
            actions.Clear();
            phrases.AddRange(ChangePhrases(changes, who, group, named));
            actions.Add(JoinPhrases(phrases));
        }
        if (Value(e.damage_shield) > 0) actions.Add("grants " + (debuff ? recipients : name) + " a shield that deals " + SkillText.Number(Value(e.damage_shield)) + Type(e.damage_shield_type) + " damage to melee attackers");
        // Source: Combat.DealDamageAt heals the melee attacker from the victim's healOnHitPercent.
        if (Value(e.heal_on_hit_percent) > 0) actions.Add("makes melee hits on " + recipients + " heal the attacker by " + SkillText.Percent(Value(e.heal_on_hit_percent)) + " of the damage dealt");
        foreach (var action in actions)
        {
            var text = action;
            if (e.duration_base > 0 && !e.is_permanent && !e.is_cleanse) text += " for " + SkillText.Seconds(e.duration_base);
            sentences.Add(SkillText.Capitalize(text) + ".");
        }
        AddHealthGate(skill, sentences);
        // Source: BuffSkill.probIgnoreCleanse and SkillEffectFormatter.FormatBuffDebuffStats.
        if (e.prob_ignore_cleanse > 0) sentences.Add(skill.UncleanseableDebuff ? "No cleanse removes this debuff." : SkillText.Percent(e.prob_ignore_cleanse.Value) + " Cleanse Resist.");
    }

    // A stat change ("lowers their speed by 1") or an amount given to or taken from someone
    // ("deals 1,800 disease damage per second to everyone within 10 yd").
    private sealed class Change
    {
        public string Verb;
        public string Text;
        public string Amount;
        public string Preposition;

        public static Change Stat(double amount, string stat, string number) =>
            new() { Verb = amount < 0 ? "lowers" : "raises", Text = stat, Amount = number };

        public static Change To(string verb, string text) => new() { Verb = verb, Text = text, Preposition = verb == "drains" ? "from" : "to" };
    }

    // Each verb once: "lowers their speed by 2, magic resistance by 250 and haste by 25%".
    private static List<string> ChangePhrases(List<Change> changes, string who, bool group, bool named)
    {
        var verbs = new List<string>();
        var groups = new List<List<Change>>();
        foreach (var change in changes)
        {
            var index = verbs.IndexOf(change.Verb);
            if (index < 0)
            {
                verbs.Add(change.Verb);
                groups.Add(new List<Change>());
                index = verbs.Count - 1;
            }
            groups[index].Add(change);
        }

        string pronoun = group ? "them" : "it";
        string possessive = group ? "their" : "its";
        var phrases = new List<string>();
        for (var i = 0; i < verbs.Count; i++)
        {
            var items = groups[i];
            if (items[0].Amount == null)
            {
                phrases.Add(verbs[i] + " " + SkillText.JoinAnd(items.ConvertAll(c => c.Text)) + " " + items[0].Preposition + " " + (named ? pronoun : who));
                named = true;
                continue;
            }
            var parts = items.ConvertAll(c => c.Text + " by " + c.Amount);
            if (named) parts[0] = possessive + " " + parts[0];
            // "a random target within 12 yd" takes no "'s", so it gets "the speed of …".
            else if (group || who.Contains(" within ") || who.Contains(" in the "))
            {
                parts[0] = "the " + items[0].Text + " of " + who + " by " + items[0].Amount;
                for (var j = 1; j < parts.Count; j++) parts[j] = possessive + " " + parts[j];
            }
            else parts[0] = Possessive(who) + " " + parts[0];
            phrases.Add(verbs[i] + " " + SkillText.JoinAnd(parts));
            named = true;
        }
        return phrases;
    }

    // A comma before the last verb keeps a list inside the list readable.
    private static string JoinPhrases(List<string> phrases)
    {
        var nested = false;
        for (var i = 0; i < phrases.Count - 1; i++) nested |= phrases[i].Contains(" and ") || phrases[i].Contains(", ");
        return nested && phrases.Count > 1
            ? string.Join(", ", phrases.GetRange(0, phrases.Count - 1)) + ", and " + phrases[phrases.Count - 1]
            : SkillText.JoinAnd(phrases);
    }

    private static string Possessive(string owner) => owner + "'s";

    private static void AddChange(List<Change> changes, LinearValue value, string stat, bool percent = false)
    {
        var amount = Value(value);
        if (amount == 0) return;
        changes.Add(Change.Stat(amount, stat, percent ? SkillText.Percent(Math.Abs(amount)) : SkillText.Number(Math.Abs(amount))));
    }

    private static void AddTick(List<Change> changes, LinearValue value, string resource, bool percent)
    {
        var amount = Value(value);
        if (amount == 0) return;
        var text = (percent ? SkillText.Percent(Math.Abs(amount)) : SkillText.Number(Math.Abs(amount))) + " " + resource + " per second";
        changes.Add(Change.To(amount < 0 ? "drains" : "restores", text));
    }
}

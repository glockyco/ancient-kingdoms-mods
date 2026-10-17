#nullable disable
using System.Collections.Generic;
using System.Globalization;

namespace BetterBestiary.Skills;

/// <summary>
/// C# port of the website's <c>formatSkillEffect</c>. The default call keeps
/// website parity with the formula branch the skills list uses. The
/// BetterBestiary skills panel passes <c>monsterContext</c> for monster-owned
/// skills: damage then names the monster's stats, notes about the reader's
/// attributes are dropped, and threat, which only a player's cast can raise, is
/// left out.
///
/// This is the second home of formatter logic. The TypeScript
/// <c>website/src/lib/utils/formatSkillEffect.ts</c> stays the source of truth.
/// The two are held string-identical by the golden parity test
/// (<c>tests/BetterBestiary.Tests/SkillEffectFormatterTests.cs</c>), which runs
/// this over every exported skill and asserts it matches the TS output. When you
/// change the TS formatter, regenerate the corpus (<c>pnpm --filter website
/// gen:skill-effect-parity</c>) and port the change here until the test is green.
///
/// Why a port, not the game's own tooltip or a precomputed asset? The native
/// ScriptableSkill.ToolTip injects the local player's weapon/wisdom bonuses, so it
/// is neither monster-correct nor skill-intrinsic, and a baked asset can only hold
/// skills present in a data export, so it cannot describe monsters on unreleased/dev
/// builds, the case this feature exists for.
/// </summary>
internal static class SkillEffectFormatter
{
    private static readonly CultureInfo Inv = CultureInfo.InvariantCulture;

    private static readonly Dictionary<string, string> NoNotes = new();

    // The parity corpus keeps this table in step with the website's stat catalogue.
    private static readonly Dictionary<string, string> StatNames = new()
    {
        ["health"] = "Hit Points",
        ["mana"] = "Mana",
        ["rage"] = "Rage",
        ["attack_power"] = "Attack Power",
        ["spell_power"] = "Spell Power",
        ["base_damage"] = "Base Damage",
        ["armor_class"] = "Armor Class",
        ["ward"] = "Ward",
        ["magic_resist"] = "Magic Resist",
        ["poison_resist"] = "Poison Resist",
        ["fire_resist"] = "Fire Resist",
        ["cold_resist"] = "Cold Resist",
        ["disease_resist"] = "Disease Resist",
        ["haste"] = "Haste",
        ["spell_haste"] = "Spell Casting Haste",
        ["critical_chance"] = "Critical Strike",
        ["critical_resist"] = "Critical Resist",
        ["accuracy"] = "Accuracy",
        ["block_chance"] = "Block Chance",
        ["fear_resist"] = "Fear Resist",
        ["movement_speed"] = "Movement Speed",
        ["damage_shield"] = "Damage Shield",
        ["health_regen"] = "Health Regeneration",
        ["mana_regen"] = "Mana Regeneration",
        ["rage_regen"] = "Rage Regeneration",
        ["strength"] = "Strength",
        ["intelligence"] = "Intelligence",
        ["dexterity"] = "Dexterity",
        ["constitution"] = "Constitution",
        ["wisdom"] = "Wisdom",
        ["charisma"] = "Charisma",
        ["cleanse_resist"] = "Cleanse Resist",
    };

    private static string StatName(string id) => StatNames[id];

    private static string StatFieldId(string key) => key switch
    {
        "health_max_bonus" or "health_max_percent_bonus" => "health",
        "mana_max_bonus" or "mana_max_percent_bonus" => "mana",
        "energy_max_bonus" => "rage",
        "damage_bonus" or "damage_percent_bonus" => "attack_power",
        "magic_damage_bonus" or "magic_damage_percent_bonus" => "spell_power",
        "defense_bonus" => "armor_class",
        "ward_bonus" => "ward",
        "magic_resist_bonus" => "magic_resist",
        "poison_resist_bonus" => "poison_resist",
        "fire_resist_bonus" => "fire_resist",
        "cold_resist_bonus" => "cold_resist",
        "disease_resist_bonus" => "disease_resist",
        "haste_bonus" => "haste",
        "spell_haste_bonus" => "spell_haste",
        "critical_chance_bonus" => "critical_chance",
        "critical_resist_bonus" => "critical_resist",
        "accuracy_bonus" => "accuracy",
        "block_chance_bonus" => "block_chance",
        "fear_resist_chance_bonus" => "fear_resist",
        "speed_bonus" => "movement_speed",
        "damage_shield" => "damage_shield",
        "healing_per_second_bonus" or "health_percent_per_second_bonus" => "health_regen",
        "mana_per_second_bonus" or "mana_percent_per_second_bonus" => "mana_regen",
        "energy_per_second_bonus" or "energy_percent_per_second_bonus" => "rage_regen",
        "strength_bonus" => "strength",
        "intelligence_bonus" => "intelligence",
        "dexterity_bonus" => "dexterity",
        "constitution_bonus" => "constitution",
        "wisdom_bonus" => "wisdom",
        "charisma_bonus" => "charisma",
        _ => throw new System.InvalidOperationException($"Unknown skill stat field {key}"),
    };

    private static string StatFieldPhraseName(string key) => key switch
    {
        "health_max_bonus" or "health_max_percent_bonus" => $"maximum {StatName("health")}",
        "mana_max_bonus" or "mana_max_percent_bonus" => $"maximum {StatName("mana")}",
        "energy_max_bonus" => $"maximum {StatName("rage")}",
        "health_percent_per_second_bonus" => $"of maximum {StatName("health")} per second",
        "mana_percent_per_second_bonus" => $"of maximum {StatName("mana")} per second",
        "energy_percent_per_second_bonus" => $"of maximum {StatName("rage")} per second",
        _ => StatName(StatFieldId(key)),
    };

    private static string FormatStatField(string key, double value, bool signed = false)
    {
        var text = key switch
        {
            "health_max_percent_bonus" or "mana_max_percent_bonus"
                or "damage_percent_bonus" or "magic_damage_percent_bonus"
                or "haste_bonus" or "spell_haste_bonus" or "critical_chance_bonus"
                or "critical_resist_bonus" or "accuracy_bonus" or "block_chance_bonus"
                or "fear_resist_chance_bonus" or "heal_on_hit_percent" or "cooldown_reduction_percent"
                or "health_percent_per_second_bonus" or "mana_percent_per_second_bonus"
                or "energy_percent_per_second_bonus" => FormatPercent(value),
            "speed_bonus" or "healing_per_second_bonus" or "mana_per_second_bonus"
                or "energy_per_second_bonus" => FormatNumber(value, 2),
            _ => FormatNumber(value, 0),
        };
        return signed && value > 0 ? "+" + text : text;
    }

    private static string FormatLinearStat(string key, LinearValue value, bool signed = true)
    {
        if (value == null)
            return "-";
        if (value.bonus_per_level == 0)
            return FormatStatField(key, value.base_value, signed);
        if (value.base_value == value.bonus_per_level)
            return $"{FormatStatField(key, value.bonus_per_level, signed)} × rank";
        var operation = value.bonus_per_level > 0 ? "+" : "−";
        return $"{FormatStatField(key, value.base_value, signed)} {operation} {FormatStatField(key, System.Math.Abs(value.bonus_per_level))} × (rank − 1)";
    }

    public static string Format(SkillEffectInput skill, bool monsterContext = false)
    {
        if (skill.id != null && HardcodedEffects.TryGetValue(skill.id, out var hardcoded))
            return hardcoded;

        // Source: server-scripts/AreaBuffSkill.cs:Apply — Evacuate sends the caster and every
        // living, visible player within its cast range to the city assigned to the caster's zone.
        if (skill.is_teleport)
            return $"teleports you and every player within {FormatNumber(skill.cast_range)} yd to the city assigned to your current zone, stun (1s)";

        // Source: server-scripts/TargetBuffSkill.cs:Apply — a cooldown-reduction spell shortens
        // each remaining cooldown by its share, at most 30s, and applies no buff.
        var cooldownCut = ParseLinearValue(skill.cooldown_reduction_percent);
        if (skill.skill_type == "target_buff" && cooldownCut != null)
            return $"cuts your remaining cooldowns by {FormatLinearStat("cooldown_reduction_percent", cooldownCut, false)} (max 30s each)";

        // A monster's cast owes nothing to the reader's attributes.
        var notes = monsterContext ? NoNotes : skill.notes ?? NoNotes;
        var castByMonsters = monsterContext || skill.npc_caster_only;
        var parts = new List<string>();

        // Source: server-scripts/BardFinalCadenceSkill.cs:HasRequiredSongsActive; BardMercenarySkills.cs:CanUseFinalCadence,MaximumCombatSongs — a player Bard needs three active songs, a Bard mercenary level 50 and all three of its combat songs.
        if (skill.is_bard_final_cadence)
            parts.Add(skill.is_mercenary_skill ? "needs level 50 and 3 active songs" : "needs 3+ active songs");

        if (skill.is_bard_final_cadence)
        {
            // Source: server-scripts/BardFinalCadenceSkill.cs:Apply — one multiplier scales both the damage and the healing, so one note covers both.
            var amounts = new List<string>();
            FormatDamage(skill, monsterContext, NoNotes, amounts);
            FormatHealing(skill, NoNotes, amounts);
            parts.Add(Qualify(string.Join(" and ", amounts), Note(notes, "damage")));
        }
        else
        {
            if (!skill.is_manaburn_skill)
                FormatDamage(skill, monsterContext, notes, parts);
            if (skill.channel_pulses > 0)
                parts.Add($"total damage split over {skill.channel_pulses} channeled pulses");
            FormatHealing(skill, notes, parts);
        }
        FormatCrowdControl(skill, castByMonsters, parts);
        FormatSummons(skill, parts);

        // Only monsters enrage from a passive: DealDamageAt scans monster and NPC skill
        // lists alone, and no NPC carries a skill, so a player passive with the flag
        // changes no damage.
        // Source: server-scripts/Combat.cs:783-816 (enrage scan and damage bonus, non-spell hits only)
        if (skill.skill_type == "passive" && skill.is_enrage)
            parts.Add($"+50-75% damage on non-spell hits while below 10% of its maximum {StatName("health")}");
        if (skill.is_bard_song)
            parts.Add(Qualify("Bard song", Note(notes, "is_bard_song")));
        if (skill.is_bard_charm)
        {
            var charmedDamage = ParseLinearValue(skill.charmed_damage_percent);
            parts.Add(charmedDamage != null
                ? Qualify(
                    $"charms a non-boss, non-elite monster, which then deals {FormatLinearPercent(charmedDamage)} of its normal damage",
                    Note(notes, "charmed_damage_percent"))
                : "charms a non-boss, non-elite monster");
        }
        if (skill.additional_active_bard_songs != 0)
            parts.Add($"+{skill.additional_active_bard_songs} active Bard song");
        if (skill.unlimited_active_bard_songs)
            parts.Add("no active Bard song limit");
        if (skill.bard_song_duration_bonus_per_level != 0)
            parts.Add($"+{FormatPercent(skill.bard_song_duration_bonus_per_level)} × rank Bard song duration");
        if (skill.extra_gather_item_chance != 0)
            parts.Add($"{FormatPercent(skill.extra_gather_item_chance)} chance for an extra gathered item");
        // Source: server-scripts/FoodItem.cs:Use; Pet.cs:2102-2113 — the bonus lengthens a player's Food and Drink buffs and a mercenary's Food buffs. Festive Event Food keeps its duration.
        if (skill.food_and_drink_buff_duration_bonus_per_level != 0)
            parts.Add($"+{FormatPercent(skill.food_and_drink_buff_duration_bonus_per_level)} × rank duration of your food and drink buffs and your mercenaries' food buffs, except festive food");
        if (skill.is_necromancer_reaper_form)
            parts.Add("toggles on and off with no time limit");
        // Source: server-scripts/NecromancerPetBuffSkill.cs:HasLivingCombatPet,CheckDistance — only the Necromancer's own living companion within cast range, never a familiar or mercenary.
        if (skill.is_necromancer_pet_buff)
            parts.Add($"buffs your companion within {FormatNumber(skill.cast_range)} yd");
        // Source: server-scripts/TargetBuffSkill.cs:CorrectedTarget,CheckDistance — a pet skill buff targets the active pet, companion or familiar, at any distance when it cannot buff others.
        else if (skill.skill_type == "target_buff" && skill.is_pet_skill)
            parts.Add(skill.can_buff_self && !skill.can_buff_others
                ? "buffs your companion or familiar"
                : $"buffs your companion or familiar within {FormatNumber(skill.cast_range)} yd");
        // Source: server-scripts/AreaBuffSkill.cs:Apply,CheckDistance — a mercenary area buff reaches every active mercenary of the caster at any distance.
        if (skill.skill_type == "area_buff" && skill.is_mercenary_skill && !skill.is_bard_song)
            parts.Add("buffs your mercenaries at any distance");
        if (skill.also_buff_active_pet)
            parts.Add($"{(skill.can_buff_others ? "when self-cast, " : "")}also buffs your companion within {FormatNumber(skill.cast_range)} yd");
        if (skill.is_bard_virtuosity)
            parts.Add("with 3+ active songs");
        if (skill.skill_type is "area_buff" or "area_debuff" or "target_buff" or "target_debuff" or "passive")
            FormatBuffDebuffStats(skill, castByMonsters, notes, parts);
        if (skill.is_bard_virtuosity && skill.additional_damage_percent_per_song != 0)
            parts.Add($"+{FormatPercent(skill.additional_damage_percent_per_song)} {StatName("attack_power")} and {StatName("spell_power")} per active song beyond 3");
        // Source: server-scripts/AreaBuffSkill.cs:Apply — isOnlyForMagicClasses skips Warrior and Rogue players and mercenaries.
        if (skill.skill_type == "area_buff" && skill.is_only_for_magic_classes)
            parts.Add("not Warriors or Rogues");

        if (skill.is_assassination_skill)
            parts.Add($"usable when the target is at or below 25% of its maximum {StatName("health")}, rounded");
        if (skill.is_manaburn_skill)
        {
            parts.Add(skill.skill_type == "target_projectile"
                ? "spends all Mana for 3 damage per point, ignores avoidance and mitigation"
                : "spends all Rage for 2 damage per point, ignores avoidance and mitigation");
        }

        if (skill.duration_base > 0 && parts.Count > 0 && !skill.is_permanent && !skill.is_cleanse)
        {
            var hasBuffStats = skill.skill_type is "area_buff" or "area_debuff" or "target_buff" or "target_debuff";
            if (hasBuffStats)
                return string.Join(", ", parts) + ", " + BuffDuration(skill);
        }

        return string.Join(", ", parts);
    }

    // --- Category formatters (mirror the TS helpers) ---

    private static string DamageTermLabel(string term) => term switch
    {
        "spell_power" => StatName("spell_power"),
        "attack_power" => StatName("attack_power"),
        "ranged_dexterity" => $"150% of {StatName("dexterity")}",
        "poison_dexterity" => $"250% of {StatName("dexterity")}",
        "bow" => $"bow {StatName("base_damage")}",
        "off_hand_half" => $"50% of off-hand {StatName("base_damage")} (rounded up)",
        "main_hand" => $"main-hand {StatName("base_damage")}",
        _ => throw new System.InvalidOperationException($"Unknown damage term {term}"),
    };

    /// <summary>Damage terms the formula subtracts.</summary>
    private static bool IsDeduction(string term) => term is "bow" or "off_hand_half" or "main_hand";

    /// <summary>Append a formatted linear value to a sum, folding its leading sign into the operator.</summary>
    private static string AddTerm(string sum, string term) =>
        term.StartsWith("−")
            ? $"{sum} − {term.Substring(1)}"
            : $"{sum} + {term}";

    /// <summary>Wrap a sum or a rank formula in parentheses so a multiplication binds to all of it.</summary>
    private static string Group(string expression) =>
        expression.Contains(" + ") || expression.Contains(" − ") ? $"({expression})" : expression;

    // Source: server-scripts/TargetDamageSkill.cs:ApplyDamage; TargetProjectileSkill.cs:Apply; FrontalDamageSkill.cs:Apply; AreaDamageSkill.cs:Apply; AreaObjectSpawnSkill.cs:AreaObjectSpawner.ApplyDamageToEntities — handlers add listed damage to their stats, then multiply the sum by a damage percentage above 0 and round.
    // Source: server-scripts/FrontalProjectilesSkill.cs:Apply — frontal projectiles add listed damage without a percentage.
    private static void FormatDamage(
        SkillEffectInput skill,
        bool monsterContext,
        Dictionary<string, string> notes,
        List<string> parts)
    {
        var skillDmg = ParseLinearValue(skill.damage);
        var damagePercent = ParseLinearValue(skill.damage_percent);
        if (skillDmg == null && damagePercent == null)
            return;

        var multiplier = skill.skill_type == "frontal_projectiles" ? null : damagePercent;
        // The panel resolves a monster's skill at its rank, where a percentage of 0 or less multiplies nothing.
        if (monsterContext && multiplier != null && multiplier.base_value <= 0)
            multiplier = null;
        var formattedType = FormatDamageType(skill.damage_type);
        var typeLabel = formattedType.Length > 0 ? " " + formattedType : "";

        var terms = (monsterContext ? skill.monster_damage_terms : skill.damage_terms) ?? new List<string>();
        var added = new List<string>();
        var subtracted = new List<string>();
        foreach (var term in terms)
            (IsDeduction(term) ? subtracted : added).Add(DamageTermLabel(term));
        if (added.Count == 0 && subtracted.Count > 0)
            throw new System.InvalidOperationException(
                $"Skill {skill.id}: a damage formula subtracts Base Damage without adding a stat");

        var listed = skillDmg != null ? FormatLinearValue(skillDmg) : null;
        var statParts = new List<string> { string.Join(" + ", added) };
        statParts.AddRange(subtracted);
        var stats = added.Count == 0 ? "" : string.Join(" − ", statParts);
        var combined = stats.Length == 0
            ? listed ?? "0"
            : listed == null
                ? stats
                : AddTerm(stats, listed);
        if (multiplier == null)
        {
            parts.Add(Qualify($"{combined}{typeLabel} damage", Note(notes, "damage")));
            return;
        }
        var maxLevel = skill.max_level ?? 1;
        var lapses = multiplier.base_value <= 0
            || multiplier.base_value + multiplier.bonus_per_level * (maxLevel - 1) <= 0;
        parts.Add(Qualify(
            $"{Group(combined)} × {Group(FormatLinearPercent(multiplier))}{typeLabel} damage",
            Note(notes, "damage"),
            lapses ? "multiplied only above 0%" : null));
    }

    private static string FormatDamageType(string type)
    {
        return type switch
        {
            "Physical" => "physical",
            "Magic" => "magic",
            "Poison" => "poison",
            "Fire" => "fire",
            "Cold" => "cold",
            "Disease" => "disease",
            _ => "",
        };
    }

    private static void FormatHealing(SkillEffectInput skill, Dictionary<string, string> notes, List<string> parts)
    {
        var cost = ParseLinearValue(skill.health_cost_percent);
        var restored = ParseLinearValue(skill.mana_restored_percent);
        if (skill.is_necromancer_blood_pact && cost != null && restored != null)
        {
            parts.Add($"spends {FormatLinearPercent(cost)} of maximum {StatName("health")} to restore {FormatLinearPercent(restored)} of maximum {StatName("mana")}");
            return;
        }
        var healing = ParseLinearValue(skill.healing_percent);
        if (skill.is_necromancer_death_bloom && cost != null && healing != null)
        {
            parts.Add(skill.healing_percent_per_intelligence == 0
                ? $"spends {FormatLinearPercent(cost)} of maximum {StatName("health")} to heal the target for the Hit Points spent × ({FormatLinearPercent(healing)})"
                : $"spends {FormatLinearPercent(cost)} of maximum {StatName("health")} to heal the target for the Hit Points spent × ({FormatLinearPercent(healing)} + {FormatPercent(skill.healing_percent_per_intelligence)} per Intelligence)");
            return;
        }

        // Source: server-scripts/AreaHealSkill.cs:Apply,CheckDistance — a mercenary area heal reaches every active mercenary of the caster at any distance and restores Rage instead of Mana to Warrior and Rogue mercenaries.
        var mercenaryHeal = skill.skill_type == "area_heal" && skill.is_mercenary_skill;

        // Source: server-scripts/AreaHealSkill.cs:Apply — balancing sets everyone in range to their average share of maximum Health and heals nothing.
        if (skill.is_balance_health)
        {
            parts.Add($"sets {AreaHealRecipients(skill)} to the group's average share of maximum Hit Points, rounded");
            return;
        }
        var recipients = skill.skill_type == "area_heal"
            ? mercenaryHeal ? "your mercenaries at any distance" : AreaHealRecipients(skill)
            : null;

        var heal = ParseLinearValue(skill.heals_health);
        if (heal != null)
            parts.Add(Qualify($"{(recipients != null ? $"heals {recipients} for" : "heals")} {FormatLinearValue(heal)} {StatName("health")}", Note(notes, "heals_health")));

        var healMana = ParseLinearValue(skill.heals_mana);
        if (healMana != null)
            parts.Add($"restores {FormatLinearValue(healMana)} {(mercenaryHeal ? "Mana or Rage" : "Mana")}");

        if (skill.is_resurrect_skill)
            parts.Add("resurrects a player at 60% of maximum Hit Points and restores 75% of lost XP, or a mercenary at 10% of maximum Hit Points");
    }

    // Source: server-scripts/AreaHealSkill.cs:Apply — an area heal without the pet or mercenary flag reaches its caster and every living, visible entity in range of the caster's own type, plus, for a player caster, every player's companions and mercenaries.
    private static string AreaHealRecipients(SkillEffectInput skill)
    {
        var range = $"within {FormatNumber(skill.cast_range)} yd";
        return skill.area_heal_caster switch
        {
            "player" => $"you and every player, companion and mercenary {range}",
            "pet" => $"itself and every companion and mercenary {range}, not players",
            "monster" => $"itself and every monster {range}",
            _ => throw new System.InvalidOperationException(
                $"Skill {skill.id}: an area heal summary needs the kind of its caster"),
        };
    }

    private static void FormatCrowdControl(SkillEffectInput skill, bool castByMonsters, List<string> parts)
    {
        var areaProjectile = skill.skill_type == "area_damage" && skill.area_projectile;

        var lifetap = ParseLinearValue(skill.lifetap_percent);
        if (lifetap != null && !areaProjectile)
            parts.Add($"{FormatLinearPercent(lifetap)} lifetap");

        if (skill.break_armor_prob is > 0)
            parts.Add($"{FormatPercent(skill.break_armor_prob.Value)} chance one random equipment slot of each player or mercenary hit loses 1-4 durability, if it holds an item");

        var stun = ParseLinearValue(skill.stun_chance);
        if (stun != null)
        {
            var stunDur = ParseLinearValue(skill.stun_time);
            var durSuffix = stunDur != null
                ? $" ({FormatLinearDuration(stunDur.base_value, stunDur.bonus_per_level)})"
                : "";
            parts.Add($"{FormatLinearPercent(stun)} stun{durSuffix}");
        }

        var fear = ParseLinearValue(skill.fear_chance);
        if (fear != null)
        {
            var fearDur = ParseLinearValue(skill.fear_time);
            var durSuffix = fearDur == null
                ? ""
                : fearDur.bonus_per_level == 0
                    ? $" ({JsNum(fearDur.base_value / 2)}-{JsNum(fearDur.base_value)}s)"
                    : $" ({FormatLinearDuration(fearDur.base_value / 2, fearDur.bonus_per_level / 2)} to {FormatLinearDuration(fearDur.base_value, fearDur.bonus_per_level)})";
            parts.Add($"{(stun != null ? "otherwise " : "")}{FormatLinearPercent(fear)} fear{durSuffix}");
        }

        var knockback = ParseLinearValue(skill.knockback_chance);
        if (knockback != null && !areaProjectile)
        {
            var distance = skill.knockback_distance ?? 0;
            var reach = distance > 0 ? $" {JsNum(distance)} yd" : "";
            parts.Add($"{(stun != null || fear != null ? "otherwise " : "")}{FormatLinearPercent(knockback)} knockback{reach}");
        }

        if (skill.affects_random_target)
            parts.Add($"hits one random target within {FormatNumber(skill.cast_range)} yd");

        if (skill.area_objects_to_spawn is > 0)
        {
            var sizeInfo = skill.area_object_size is not null && skill.area_object_size != 0
                ? $", {JsNum(skill.area_object_size.Value)} yd wide"
                : "";
            parts.Add($"in {skill.area_objects_to_spawn.Value + 1} circles{sizeInfo}: 1 on the target and {skill.area_objects_to_spawn.Value} at random spots within {FormatNumber(skill.cast_range)} yd");
        }

        var aggro = ParseLinearValue(skill.aggro);
        if (aggro != null && aggro.base_value != 0 && !castByMonsters)
        {
            var directHit = skill.skill_type == "target_damage"
                || (skill.skill_type == "area_damage" && !skill.area_projectile);
            var healthThreat = aggro.base_value > 0 && directHit ? $" plus the caster's maximum {StatName("health")}" : "";
            parts.Add($"{(aggro.base_value > 0 ? "+" : "")}{FormatLinearValue(aggro)} threat{healthThreat}");
        }
    }

    private static void FormatSummons(SkillEffectInput skill, List<string> parts)
    {
        // Summon Player is the only summon_count_per_cast 0 skill and has its own text.
        if (!string.IsNullOrEmpty(skill.summoned_monster_id) || !string.IsNullOrEmpty(skill.pet_name))
        {
            var name = !string.IsNullOrEmpty(skill.summoned_monster_name) ? skill.summoned_monster_name
                : !string.IsNullOrEmpty(skill.pet_name) ? skill.pet_name
                : !string.IsNullOrEmpty(skill.summoned_monster_id) ? skill.summoned_monster_id
                : "pet";

            var details = new List<string>();
            if (skill.summoned_monster_level != null)
                details.Add($"level {skill.summoned_monster_level.Value}");
            if (skill.max_active_summons != null)
                details.Add($"at most {skill.max_active_summons.Value} at a time");
            var suffix = details.Count > 0 ? $" ({string.Join(", ", details)})" : "";
            var article = "aeiouAEIOU".IndexOf(name[0]) >= 0 ? "an" : "a";

            if (skill.summon_count_per_cast == -1)
                parts.Add($"summons {article} {name} for each player and mercenary on its threat list, up to its free summon slots{suffix}");
            else
            {
                var count = skill.summon_count_per_cast ?? 1;
                parts.Add($"summons {(count == 1 ? article : $"{count}×")} {name}{suffix}");
            }
        }
    }

    /// <summary>The five resistances, in display order.</summary>
    private static readonly string[] Resists =
    {
        "magic_resist_bonus",
        "poison_resist_bonus",
        "fire_resist_bonus",
        "cold_resist_bonus",
        "disease_resist_bonus",
    };

    private static LinearValue ResistValue(SkillEffectInput skill, string key) => key switch
    {
        "magic_resist_bonus" => skill.magic_resist_bonus,
        "poison_resist_bonus" => skill.poison_resist_bonus,
        "fire_resist_bonus" => skill.fire_resist_bonus,
        "cold_resist_bonus" => skill.cold_resist_bonus,
        "disease_resist_bonus" => skill.disease_resist_bonus,
        _ => throw new System.InvalidOperationException($"Unknown resist {key}"),
    };

    private static void FormatBuffDebuffStats(
        SkillEffectInput skill,
        bool castByMonsters,
        Dictionary<string, string> notes,
        List<string> parts)
    {
        var initialPartCount = parts.Count;
        var debuff = skill.skill_type is "area_debuff" or "target_debuff";

        void PushStat(string key, LinearValue raw, bool nonzeroBase, string qualifier = null)
        {
            var value = ParseLinearValue(raw);
            if (value == null || (nonzeroBase && value.base_value == 0))
                return;
            var name = StatFieldPhraseName(key);
            var label = key == "health_max_percent_bonus" && skill.skill_type == "passive" && skill.is_pet_skill
                ? $"companion {name}"
                : key == "magic_damage_percent_bonus" && skill.is_necromancer_reaper_form
                    ? $"{name} and damage over time"
                    : name;
            parts.Add(Qualify($"{FormatLinearStat(key, value)} {label}", Note(notes, key), qualifier));
        }

        // 1. Special flags
        if (skill.is_double_exp_spell)
            parts.Add("2× XP from kills, gathering, fishing, crafting, alchemy and scribing");
        if (skill.is_dispel)
            parts.Add("dispels buffs");
        if (skill.is_cleanse)
        {
            // A target cleanse matches debuff types, so physical and untyped debuffs never match.
            var types = new List<string>();
            if (skill.is_poison_debuff) types.Add("poison");
            if (skill.is_disease_debuff) types.Add("disease");
            if (skill.is_fire_debuff) types.Add("fire");
            if (skill.is_cold_debuff) types.Add("cold");
            if (skill.is_magic_debuff) types.Add("magic");
            parts.Add($"cleanses {JoinAnd(types)} debuffs");
            // Source: server-scripts/TargetBuffSkill.cs:Apply; AreaBuffSkill.cs:Apply — a cleanse spell removes debuffs instead of applying its own buff fields.
            return;
        }
        if (skill.is_blindness)
            parts.Add("blinds");
        if (skill.is_invisibility)
            parts.Add(skill.ignores_see_invisibility ? "grants invisibility, even against monsters that see invisibility" : "grants invisibility");
        // A buff carrying illusionRace redraws the wearer as that race until it ends.
        // Source: server-scripts/BuffSkill.cs:illusionRace,86-96 (illusionRace, HasAppearanceIllusion),
        // server-scripts/Player.cs:6883-6893 (ReSkinPlayer picks the illusion race)
        if (!string.IsNullOrWhiteSpace(skill.illusion_race))
            parts.Add($"{skill.illusion_race} illusion");
        if (skill.is_mana_shield)
            parts.Add("direct hits spend Mana instead of Hit Points, 1 Mana per point of damage, until a hit exceeds your Mana");
        if (skill.is_undead_illusion)
            parts.Add("undead illusion");

        // 2. Movement
        var speedBonus = ParseLinearValue(skill.speed_bonus);
        if (speedBonus != null)
        {
            if (speedBonus.base_value <= -50)
                parts.Add("sleep");
            else if (speedBonus.base_value <= -10)
                parts.Add("root");
            else if (speedBonus.base_value != 0)
                parts.Add($"{FormatLinearStat("speed_bonus", speedBonus)} {StatFieldPhraseName("speed_bonus")}");
        }

        // 3. Resource pools
        PushStat("health_max_bonus", skill.health_max_bonus, false);
        PushStat("health_max_percent_bonus", skill.health_max_percent_bonus, false);
        PushStat("mana_max_bonus", skill.mana_max_bonus, false);
        var manaMaxPercent = ParseLinearValue(skill.mana_max_percent_bonus);
        if (manaMaxPercent != null)
            parts.Add($"{FormatLinearStat("mana_max_percent_bonus", manaMaxPercent)} {StatFieldPhraseName("mana_max_percent_bonus")}");
        PushStat("energy_max_bonus", skill.energy_max_bonus, false);

        // 4. Offense
        PushStat("damage_bonus", skill.damage_bonus, true);
        PushStat("damage_percent_bonus", skill.damage_percent_bonus, true);
        PushStat("magic_damage_bonus", skill.magic_damage_bonus, true);
        // Source: server-scripts/Skills.cs:ApplyDamageOverTimeBonuses — an active Reaper Form also multiplies the caster's DoT ticks on others by its spell power bonus.
        PushStat("magic_damage_percent_bonus", skill.magic_damage_percent_bonus, true);
        var lifetapHealing = ParseLinearValue(skill.lifetap_healing_percent_bonus);
        if (lifetapHealing != null)
            parts.Add($"+{FormatLinearPercent(lifetapHealing)} lifetap healing");
        var dotExecute = ParseLinearValue(skill.damage_over_time_execute_bonus);
        if (dotExecute != null)
            parts.Add($"+{FormatLinearPercent(dotExecute)} damage over time to targets below 30% of maximum {StatName("health")}");

        // 4. Defense
        var defenseBonus = ParseLinearValue(skill.defense_bonus);
        var magicResistBonus = ParseLinearValue(skill.magic_resist_bonus);
        // Source: server-scripts/Combat.cs:DealDamageAt — 10,000 AC and Magic Resist block every direct hit.
        var invulnerable = (defenseBonus?.base_value ?? 0) >= 10000 && (magicResistBonus?.base_value ?? 0) >= 10000;
        if (invulnerable)
            parts.Add(castByMonsters ? "immune to direct damage" : "invulnerable");
        else
            PushStat("defense_bonus", skill.defense_bonus, true);
        PushStat("ward_bonus", skill.ward_bonus, true);
        if (!invulnerable)
        {
            // Resists with the same amount and note share one fragment.
            var groups = new List<(List<string> Names, string Key, LinearValue Value)>();
            foreach (var key in Resists)
            {
                var value = ParseLinearValue(ResistValue(skill, key));
                if (value == null || value.base_value == 0)
                    continue;
                var name = StatFieldPhraseName(key);
                var index = groups.FindIndex(group =>
                    group.Value.base_value == value.base_value
                    && group.Value.bonus_per_level == value.bonus_per_level
                    && Note(notes, group.Key) == Note(notes, key));
                if (index >= 0)
                    groups[index].Names.Add(name);
                else
                    groups.Add((new List<string> { name }, key, value));
            }
            foreach (var (names, key, value) in groups)
            {
                var label = names.Count == Resists.Length ? "all resists" : JoinAnd(names);
                parts.Add(Qualify($"{FormatLinearStat(key, value)} {label}", Note(notes, key)));
            }
        }

        // 5. Attack speed
        PushStat("haste_bonus", skill.haste_bonus, true);
        PushStat("spell_haste_bonus", skill.spell_haste_bonus, true);

        // 7. Hit/chance modifiers
        PushStat("critical_chance_bonus", skill.critical_chance_bonus, true);
        PushStat("critical_resist_bonus", skill.critical_resist_bonus, true);
        PushStat("accuracy_bonus", skill.accuracy_bonus, true);
        PushStat("block_chance_bonus", skill.block_chance_bonus, true);
        PushStat(
            "fear_resist_chance_bonus",
            skill.fear_resist_chance_bonus,
            true,
            skill.fear_resist_chance_bonus_cap > 0
                ? $"max {FormatStatField("fear_resist_chance_bonus", skill.fear_resist_chance_bonus_cap)}"
                : null);

        // Cooldown reduction is an instant cast effect, formatted by Format.

        // 9. On-hit procs
        var dmgShield = ParseLinearValue(skill.damage_shield);
        if (dmgShield != null && dmgShield.base_value > 0)
        {
            var formattedType = FormatDamageType(skill.damage_shield_type);
            var typeLabel = formattedType.Length > 0 ? " " + formattedType : "";
            // Source: server-scripts/TargetDebuffSkill.cs:CorrectedTarget,Apply; Combat.cs:DealDamageAt — a debuff lands on the caster's target, so its shield hurts whoever strikes that target in melee.
            if (skill.skill_type == "area_debuff")
                throw new System.InvalidOperationException(
                    $"Skill {skill.id}: an area debuff damage shield has no summary text");
            parts.Add(Qualify(
                $"{FormatLinearStat("damage_shield", dmgShield)}{typeLabel} {StatFieldPhraseName("damage_shield")}{(debuff ? " on its target" : "")}",
                Note(notes, "damage_shield")));
        }

        // Source: server-scripts/Combat.cs:DealDamageAt — the victim's healOnHitPercent heals the attacker of a non-spell melee DamageSkill hit.
        var healOnHit = ParseLinearValue(skill.heal_on_hit_percent);
        if (healOnHit != null && healOnHit.base_value > 0)
            parts.Add($"melee hits on the target heal the attacker for {FormatLinearStat("heal_on_hit_percent", healOnHit, false)} of the damage");

        // 10. Regen / DoT. A negative value ticks as damage on whoever wears the buff.
        var hps = ParseLinearValue(skill.healing_per_second_bonus);
        if (hps != null && hps.base_value != 0)
        {
            if (hps.base_value > 0)
                parts.Add(Qualify($"{FormatLinearStat("healing_per_second_bonus", hps)} {StatFieldPhraseName("healing_per_second_bonus")}", Note(notes, "healing_per_second_bonus")));
            else
            {
                var formattedType = FormatDamageType(skill.damage_over_time_type);
                var typeLabel = formattedType.Length > 0 ? " " + formattedType : "";
                parts.Add(Qualify(
                    $"{(debuff ? "" : "wearer takes ")}{FormatLinearStat("healing_per_second_bonus", Negated(hps), false)}{typeLabel} damage per second",
                    Note(notes, "healing_per_second_bonus")));
            }
        }

        // Source: server-scripts/Skills.cs:1617-1623,1754-1755 — a negative healthPercentPerSecondBonus removes that share of maximum Health each second.
        var hpPct = ParseLinearValue(skill.health_percent_per_second_bonus);
        if (hpPct != null && hpPct.base_value != 0)
        {
            if (hpPct.base_value > 0)
                parts.Add(Qualify($"{FormatLinearStat("health_percent_per_second_bonus", hpPct)} {StatFieldPhraseName("health_percent_per_second_bonus")}", Note(notes, "health_percent_per_second_bonus")));
            else
            {
                var share = FormatLinearStat("health_percent_per_second_bonus", Negated(hpPct), false);
                parts.Add(Qualify(
                    debuff ? $"{share} of maximum {StatName("health")} as damage per second" : $"drains {share} of maximum {StatName("health")} per second",
                    Note(notes, "health_percent_per_second_bonus")));
            }
        }

        var mps = ParseLinearValue(skill.mana_per_second_bonus);
        if (mps != null && mps.base_value != 0)
        {
            parts.Add(Qualify(
                $"{FormatLinearStat("mana_per_second_bonus", mps)} {StatFieldPhraseName("mana_per_second_bonus")}",
                Note(notes, "mana_per_second_bonus")));
        }

        PushStat("mana_percent_per_second_bonus", skill.mana_percent_per_second_bonus, true);
        PushStat("energy_per_second_bonus", skill.energy_per_second_bonus, true);
        PushStat("energy_percent_per_second_bonus", skill.energy_percent_per_second_bonus, true);

        // 11. Primary stats
        PushStat("strength_bonus", skill.strength_bonus, true);
        PushStat("intelligence_bonus", skill.intelligence_bonus, true);
        PushStat("dexterity_bonus", skill.dexterity_bonus, true);
        PushStat("constitution_bonus", skill.constitution_bonus, true);
        PushStat("wisdom_bonus", skill.wisdom_bonus, true);
        PushStat("charisma_bonus", skill.charisma_bonus, true);

        // Debuff type tags (only if nothing else and it's a debuff). A charm's type only matters to cleanses.
        if (parts.Count == initialPartCount && debuff && !skill.is_bard_charm)
        {
            if (skill.is_poison_debuff) parts.Add("poison damage over time");
            else if (skill.is_fire_debuff) parts.Add("fire damage over time");
            else if (skill.is_cold_debuff) parts.Add("cold damage over time");
            else if (skill.is_disease_debuff) parts.Add("disease damage over time");
            else if (skill.is_melee_debuff) parts.Add("melee debuff");
            else if (skill.is_magic_debuff) parts.Add("magic debuff");
        }

        // A passive with a weapon requirement adds its bonus only while that weapon is equipped.
        if (skill.skill_type == "passive" && !string.IsNullOrEmpty(skill.required_weapon_category))
            parts.Add($"with {WeaponCategoryLabel(skill.required_weapon_category)}");

        // 12. Cleanse resistance is always last.
        if (skill.prob_ignore_cleanse is > 0)
            parts.Add($"{FormatPercent(skill.prob_ignore_cleanse.Value)} {StatName("cleanse_resist")}");
    }

    private static string WeaponCategoryLabel(string category) => category switch
    {
        "WeaponSword2H" => "a two-handed weapon",
        _ => throw new System.InvalidOperationException(
            $"No summary label for the passive weapon requirement {category}"),
    };

    private static string BuffDuration(SkillEffectInput skill)
    {
        var perLevel = skill.duration_per_level ?? 0;
        // Source: server-scripts/BardMercenarySkills.cs:LateUpdate,RefreshAura — a singing Bard mercenary reapplies its song every 2.5s.
        if (skill.is_bard_song && skill.is_mercenary_skill)
            return "renewed every 2.5s while sung";
        // Source: server-scripts/PotionItem.cs:GetBuffLevelWithElixirEndurance — a potion buff applies at the item's level, or at 1 + Elixir Endurance rank.
        if (skill.potion_buff_level != null && perLevel != 0)
        {
            if (skill.potion_buff_level != 1)
                throw new System.InvalidOperationException(
                    $"Skill {skill.id}: potion buff level {skill.potion_buff_level} has no Elixir Endurance duration text");
            return $"{FormatDuration(skill.duration_base)} + {FormatDuration(perLevel)} × Elixir Endurance rank";
        }
        return FormatLinearDuration(skill.duration_base, perLevel);
    }


    // --- Text helpers (mirror qualify/joinAnd) ---

    private static string Note(Dictionary<string, string> notes, string key) =>
        notes.TryGetValue(key, out var note) ? note : null;

    /// <summary>A fragment followed by its present qualifiers in parentheses.</summary>
    private static string Qualify(string fragment, params string[] qualifiers)
    {
        var present = new List<string>();
        foreach (var qualifier in qualifiers)
        {
            if (!string.IsNullOrEmpty(qualifier))
                present.Add(qualifier);
        }
        return present.Count == 0 ? fragment : $"{fragment} ({string.Join(", ", present)})";
    }

    /// <summary>Join a short list in prose.</summary>
    private static string JoinAnd(List<string> items) =>
        items.Count > 1
            ? $"{string.Join(", ", items.GetRange(0, items.Count - 1))} and {items[items.Count - 1]}"
            : string.Join("", items);

    // --- Value helpers (mirror parseLinearValue/formatLinearValue/formatPercent) ---

    /// <summary>Mirror of <c>parseLinearValue</c>'s zero-collapse: a value whose base
    /// and bonus are both zero counts as "no value".</summary>
    private static LinearValue ParseLinearValue(LinearValue lv)
    {
        if (lv == null)
            return null;
        if (lv.base_value == 0 && lv.bonus_per_level == 0)
            return null;
        return lv;
    }

    /// <summary>The value with its sign flipped at every rank.</summary>
    private static LinearValue Negated(LinearValue lv) =>
        new(-lv.base_value, -lv.bonus_per_level);

    private static string FormatLinearValue(LinearValue lv)
    {
        if (lv.bonus_per_level == 0)
            return FormatNumber(lv.base_value);
        return FormatSkillLevelFormula(lv, FormatNumber);
    }

    private static string FormatLinearPercent(LinearValue lv)
    {
        if (lv.bonus_per_level == 0)
            return FormatPercent(lv.base_value);
        return FormatSkillLevelFormula(lv, FormatPercent);
    }

    /// <summary>Mirror of <c>formatLinearDuration</c>.</summary>
    private static string FormatLinearDuration(double baseValue, double bonusPerLevel)
    {
        if (bonusPerLevel == 0)
            return FormatDuration(baseValue);
        return FormatSkillLevelFormula(new LinearValue(baseValue, bonusPerLevel), FormatDuration);
    }

    // Source: server-scripts/LinearFloat.cs:10-13 — a rank's value is baseValue + bonusPerLevel × (rank − 1).
    /// <summary>A value that changes with rank, written so its first number is the value at
    /// rank 1, as in "1 + 4 × (rank − 1)". A value whose rank-1 value equals its step reads
    /// "20 × rank".</summary>
    private static string FormatSkillLevelFormula(
        LinearValue value,
        System.Func<double, string> formatValue)
    {
        if (value.base_value == value.bonus_per_level)
            return $"{formatValue(value.bonus_per_level)} × rank";
        var operation = value.bonus_per_level > 0 ? "+" : "−";
        return $"{formatValue(value.base_value)} {operation} {formatValue(System.Math.Abs(value.bonus_per_level))} × (rank − 1)";
    }

    /// <summary>Mirror of formatSkillEffect's local <c>formatPercent</c>: value*100, two
    /// decimal places, dropping trailing zeros and the decimal when the result is whole, with a
    /// true minus sign. No grouping.</summary>
    private static string FormatPercent(double value)
    {
        var pct = value * 100.0;
        var rounded = System.Math.Round(pct, 2, System.MidpointRounding.AwayFromZero);
        var text = rounded == System.Math.Round(rounded)
            ? ((long)rounded).ToString(Inv)
            : rounded.ToString("0.0###", Inv);
        return TrueMinus(text) + "%";
    }

    /// <summary>Mirror of formatSkillEffect's <c>formatNumber</c>, JS <c>Number.toLocaleString()</c>
    /// (en-US) with a true minus sign: thousands grouping, up to three fraction digits.</summary>
    private static string FormatNumber(double value) => TrueMinus(value.ToString("#,##0.###", Inv));

    private static string FormatNumber(double value, int decimals) =>
        TrueMinus(System.Math.Round(value, decimals, System.MidpointRounding.AwayFromZero)
            .ToString(decimals == 0 ? "#,##0" : "#,##0.##", Inv));

    private static string TrueMinus(string text) =>
        text.StartsWith("-") ? "−" + text.Substring(1) : text;

    /// <summary>Mirror of plain JS <c>`${number}`</c> interpolation: no grouping, no
    /// trailing zeros (used for stun/fear seconds, knockback and AoE sizes).</summary>
    private static string JsNum(double value)
    {
        if (value == System.Math.Floor(value) && !double.IsInfinity(value))
            return ((long)value).ToString(Inv);
        return value.ToString("0.################", Inv);
    }

    private static string FormatDuration(double seconds)
    {
        if (seconds <= 0)
            return "-";
        var hours = (long)System.Math.Floor(seconds / 3600);
        var minutes = (long)System.Math.Floor((seconds - hours * 3600) / 60);
        var remainingSeconds = seconds - hours * 3600 - minutes * 60;
        var text = hours > 0 ? $"{hours}h" : "";
        if (minutes > 0) text += $"{(text.Length > 0 ? " " : "")}{minutes}m";
        if (remainingSeconds > 0) text += $"{(text.Length > 0 ? " " : "")}{FormatNumber(remainingSeconds)}s";
        return text;
    }

    /// <summary>Verbatim port of <c>HARDCODED_EFFECTS</c>: skills whose summary is a
    /// fixed string keyed by skill id (game-changers the generic formatter can't model).</summary>
    private static readonly Dictionary<string, string> HardcodedEffects = new()
    {
        ["improved_backstab"] = "single-target hits from behind deal 25% bonus damage instead of 10%",
        ["bind_affinity"] = "sets your bind point (respawn and Gate Scroll destination)",
        ["binding"] = "sets your bind point (respawn and Gate Scroll destination)",
        ["elixir_endurance"] = "+1m × rank potion buff duration, except bandages",
        ["veteran_awareness"] = "reveals nearby monsters on minimap (not in Temple of Valaark)",
        ["parry"] = "while casting, blocks your target's physical melee hits and deals 50% back (1-5,000 damage)",
        ["symbiosis"] = $"pet gets 10% × rank of your attributes, {StatName("armor_class")} and resists when summoned (max 50%)",
        ["summon_player"] = "pulls a target 3-15 yd away to the caster, stun (2s)",
        ["disarm_trap"] = "disarms traps (needs Detect Traps or Sharp Senses)",
        ["alchemy"] = "crafts potions and elixirs",
        ["baking"] = "crafts food and consumables",
        ["crafting"] = "crafts equipment and items",
        ["crafting_scroll"] = "scribes scrolls",
        ["digging"] = "digs for buried treasure",
        ["fishing"] = "catches fish",
        ["gathering"] = "gathers plants and Radiant Sparks",
        ["mining"] = "mines ore and minerals",
        ["opening"] = "opens chests",
        ["lockpicking"] = "opens locked chests with lockpicks, 1 per try (20% success chance)",
        ["blushburst"] = "cosmetic visual effect",
        ["emerald_pop"] = "cosmetic visual effect",
        ["golden_whirl"] = "cosmetic visual effect",
        ["skyflare"] = "cosmetic visual effect",
        ["detect_traps"] = "reveals and disarms traps",
        // Source: Player.cs:8425-8442 — Sharp Senses uses the same trap-detection gate.
        ["sharp_senses"] = "reveals and disarms traps",
        ["halloween_event"] = "2× XP from kills, gathering, fishing, crafting, alchemy and scribing, event duration",
        ["winter_festival"] = "2× XP from kills, gathering, fishing, crafting, alchemy and scribing, event duration",
        ["master_poisoner"] = $"Stab deals poison damage and adds 250% of {StatName("dexterity")} to it, 10s",
        ["wild_strike"] = "your next auto attack deals 10% × rank more damage, all of it as magic damage, 5s",
        ["call_of_the_heroes"] = "teleports all your active mercenaries to you and removes their fear",
        ["charge"] = $"charges toward the target, removes roots, +3.5 {StatName("movement_speed")}, +100% {StatName("accuracy")}, +5% {StatFieldPhraseName("energy_percent_per_second_bonus")}, 2s",
        ["teleport"] = "uses travel items (out of combat)",
        ["razor_of_wrath"] = $"+1% × rank {StatName("attack_power")} × current {StatName("rage")} ÷ maximum {StatName("rage")}",
        ["arcane_edge"] = $"+1% × rank {StatName("spell_power")} × current {StatName("mana")} ÷ maximum {StatName("mana")}",
        ["divine_intervention"] = "makes you and every player, companion, familiar and mercenary within 10 yd invulnerable, 3s",
    };
}

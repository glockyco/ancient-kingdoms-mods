#nullable disable
using System.Collections.Generic;
using System.Globalization;

namespace BetterBestiary.Skills;

/// <summary>
/// C# port of the website's <c>formatSkillEffect</c> (skill-intrinsic / no
/// monsterContext branch). Builds the concise effect summary shown in the
/// BetterBestiary skills panel from a <see cref="SkillEffectInput"/>.
///
/// This is the SECOND home of formatter logic — the TypeScript
/// <c>website/src/lib/utils/formatSkillEffect.ts</c> stays the source of truth.
/// The two are held string-identical by the golden parity test
/// (<c>tests/BetterBestiary.Tests/SkillEffectFormatterTests.cs</c>), which runs
/// this over every exported skill and asserts it matches the TS output. When you
/// change the TS formatter, regenerate the corpus (<c>pnpm --filter website
/// gen:skill-effect-parity</c>) and port the change here until the test is green.
///
/// Why a port, not the game's own tooltip or a precomputed asset? The native
/// ScriptableSkill.ToolTip injects the local player's weapon/wisdom bonuses, so it
/// is neither monster-correct nor skill-intrinsic; and a baked asset can only hold
/// skills present in a data export, so it cannot describe monsters on unreleased/dev
/// builds — the case this feature exists for.
/// </summary>
internal static class SkillEffectFormatter
{
    private static readonly CultureInfo Inv = CultureInfo.InvariantCulture;

    public static string Format(SkillEffectInput skill)
    {
        if (skill.id != null && HardcodedEffects.TryGetValue(skill.id, out var hardcoded))
            return hardcoded;

        // Source: server-scripts/AreaBuffSkill.cs — isTeleport teleports each party
        // member to safety; no buff applied.
        if (skill.is_teleport)
            return "teleport party to safety, stun (1s)";

        var parts = new List<string>();

        FormatDamage(skill, parts);
        FormatHealing(skill, parts);
        FormatCrowdControl(skill, parts);
        FormatSummons(skill, parts);

        if (skill.skill_type == "passive" && skill.is_enrage)
            parts.Add("+33% dmg below 25% hp");

        if (skill.skill_type is "area_buff" or "area_debuff" or "target_buff" or "target_debuff" or "passive")
            FormatBuffDebuffStats(skill, parts);

        if (skill.is_assassination_skill)
            parts.Add("execute <25% hp");
        if (skill.is_manaburn_skill)
            parts.Add("burns mana/rage for dmg");

        if (skill.duration_base > 0 && parts.Count > 0 && !skill.is_permanent)
        {
            var hasBuffStats = skill.skill_type is "area_buff" or "area_debuff" or "target_buff" or "target_debuff";
            if (hasBuffStats)
            {
                var dur = skill.duration_per_level is > 0
                    ? $"{JsNum(skill.duration_base)}s (+{JsNum(skill.duration_per_level.Value)}s/lvl)"
                    : FormatDuration(skill.duration_base);
                return string.Join(", ", parts) + ", " + dur;
            }
        }

        return string.Join(", ", parts);
    }

    // --- Category formatters (mirror the TS helpers) ---

    private static void FormatDamage(SkillEffectInput skill, List<string> parts)
    {
        var skillDmg = ParseLinearValue(skill.damage);
        var damagePercent = ParseLinearValue(skill.damage_percent);
        if (skillDmg == null && damagePercent == null)
            return;

        if (skillDmg != null)
        {
            var typeLabel = skill.damage_type != null && skill.damage_type != "Normal"
                ? " " + skill.damage_type.ToLowerInvariant()
                : "";
            parts.Add($"{FormatLinearValue(skillDmg)}{typeLabel} dmg");
        }

        if (damagePercent != null && damagePercent.base_value > 0)
            parts.Add($"{FormatLinearPercent(damagePercent)} weapon dmg");
    }

    private static void FormatHealing(SkillEffectInput skill, List<string> parts)
    {
        var heal = ParseLinearValue(skill.heals_health);
        if (heal != null)
            parts.Add($"{FormatLinearValue(heal)} hp");

        var healMana = ParseLinearValue(skill.heals_mana);
        if (healMana != null)
            parts.Add($"{FormatLinearValue(healMana)} mana");

        // Source: server-scripts/Player.cs — CmdResurrect: health = max*0.6, mana = max*0.2, xp +75% lost.
        if (skill.is_resurrect_skill)
            parts.Add("resurrect (60% max HP, 20% max HP as mana, +75% lost XP)");

        if (skill.is_balance_health)
            parts.Add("balance hp");
    }

    private static void FormatCrowdControl(SkillEffectInput skill, List<string> parts)
    {
        var lifetap = ParseLinearValue(skill.lifetap_percent);
        if (lifetap != null)
            parts.Add($"{FormatLinearPercent(lifetap)} lifetap");

        if (skill.break_armor_prob is > 0)
            parts.Add($"{FormatPercent(skill.break_armor_prob.Value)} break armor");

        var stun = ParseLinearValue(skill.stun_chance);
        if (stun != null)
        {
            var stunDur = ParseLinearValue(skill.stun_time);
            var durSuffix = stunDur != null && stunDur.base_value > 0 ? $" ({JsNum(stunDur.base_value)}s)" : "";
            parts.Add($"{FormatLinearPercent(stun)} stun{durSuffix}");
        }

        var fear = ParseLinearValue(skill.fear_chance);
        if (fear != null)
        {
            var fearDur = ParseLinearValue(skill.fear_time);
            var durSuffix = fearDur != null && fearDur.base_value > 0 ? $" ({JsNum(fearDur.base_value)}s)" : "";
            parts.Add($"{FormatLinearPercent(fear)} fear{durSuffix}");
        }

        var knockback = ParseLinearValue(skill.knockback_chance);
        if (knockback != null)
            parts.Add($"{FormatLinearPercent(knockback)} knockback");

        if (skill.affects_random_target)
            parts.Add("random target");

        if (skill.area_objects_to_spawn is > 0)
        {
            var sizeInfo = skill.area_object_size is not null && skill.area_object_size != 0
                ? $", size {JsNum(skill.area_object_size.Value)}"
                : "";
            parts.Add($"{skill.area_objects_to_spawn.Value} zones{sizeInfo}");
        }

        var aggro = ParseLinearValue(skill.aggro);
        if (aggro != null && aggro.base_value != 0)
            parts.Add($"{(aggro.base_value > 0 ? "+" : "")}{FormatLinearValue(aggro)} aggro");
    }

    private static void FormatSummons(SkillEffectInput skill, List<string> parts)
    {
        // Teleport variant (summon_count_per_cast == 0).
        if (skill.skill_type == "summon_monsters" && skill.summon_count_per_cast == 0)
        {
            parts.Add("teleports target to self, stun (2s)");
            return;
        }

        if (!string.IsNullOrEmpty(skill.summoned_monster_id) || !string.IsNullOrEmpty(skill.pet_name))
        {
            var name = !string.IsNullOrEmpty(skill.summoned_monster_name) ? skill.summoned_monster_name!
                : !string.IsNullOrEmpty(skill.pet_name) ? skill.pet_name!
                : !string.IsNullOrEmpty(skill.summoned_monster_id) ? skill.summoned_monster_id!
                : "pet";

            var details = new List<string>();
            if (skill.summoned_monster_level != null)
                details.Add($"lv{skill.summoned_monster_level.Value}");
            if (skill.max_active_summons != null)
                details.Add($"max {skill.max_active_summons.Value}");
            var suffix = details.Count > 0 ? $" ({string.Join(", ", details)})" : "";

            if (skill.summon_count_per_cast == -1)
                parts.Add($"summons 1x {name} per player/mercenary{suffix}");
            else
            {
                var count = skill.summon_count_per_cast ?? 1;
                parts.Add($"summons {count}x {name}{suffix}");
            }
        }
    }

    private static void FormatBuffDebuffStats(SkillEffectInput skill, List<string> parts)
    {
        // 1. Special flags
        if (skill.is_double_exp_spell)
            parts.Add("2× XP from kills");
        if (skill.is_dispel)
            parts.Add("dispels buffs");
        if (skill.is_cleanse)
        {
            var all = skill.is_poison_debuff && skill.is_disease_debuff && skill.is_fire_debuff
                      && skill.is_cold_debuff && skill.is_magic_debuff;
            if (all)
            {
                parts.Add("cleanses all debuffs");
            }
            else
            {
                var types = new List<string>();
                if (skill.is_poison_debuff) types.Add("poison");
                if (skill.is_disease_debuff) types.Add("disease");
                if (skill.is_fire_debuff) types.Add("fire");
                if (skill.is_cold_debuff) types.Add("cold");
                if (skill.is_magic_debuff) types.Add("magic");
                parts.Add($"cleanses {string.Join(" & ", types)} debuffs");
            }
        }
        if (skill.is_blindness)
            parts.Add("blinds");
        if (skill.is_invisibility)
            parts.Add("grants invis");
        if (skill.is_mana_shield)
            parts.Add("mana shield");

        // 2. Movement
        var speedBonus = ParseLinearValue(skill.speed_bonus);
        if (speedBonus != null)
        {
            if (speedBonus.base_value <= -50)
                parts.Add("sleep");
            else if (speedBonus.base_value <= -10)
                parts.Add("root");
            else if (speedBonus.base_value != 0)
                parts.Add($"{(speedBonus.base_value > 0 ? "+" : "")}{FormatLinearValue(speedBonus)} speed");
        }

        // 3. Resource pools
        AddSignedValue(parts, ParseLinearValue(skill.health_max_bonus), "max hp", false);
        AddSignedPercent(parts, ParseLinearValue(skill.health_max_percent_bonus), "max hp", false);
        AddSignedValue(parts, ParseLinearValue(skill.mana_max_bonus), "max mana", false);
        AddSignedPercent(parts, ParseLinearValue(skill.mana_max_percent_bonus), "max mana", false);
        AddSignedValue(parts, ParseLinearValue(skill.energy_max_bonus), "max rage", false);

        // 4. Offense
        AddSignedValue(parts, ParseLinearValue(skill.damage_bonus), "dmg", true);
        AddSignedPercent(parts, ParseLinearValue(skill.damage_percent_bonus), "phys dmg", true);
        AddSignedValue(parts, ParseLinearValue(skill.magic_damage_bonus), "magic dmg", true);
        AddSignedPercent(parts, ParseLinearValue(skill.magic_damage_percent_bonus), "magic dmg", true);

        // 4. Defense
        AddSignedValue(parts, ParseLinearValue(skill.defense_bonus), "def", true);
        AddSignedValue(parts, ParseLinearValue(skill.ward_bonus), "ward", true);
        AddSignedValue(parts, ParseLinearValue(skill.magic_resist_bonus), "magic res", true);
        AddSignedValue(parts, ParseLinearValue(skill.poison_resist_bonus), "poison res", true);
        AddSignedValue(parts, ParseLinearValue(skill.fire_resist_bonus), "fire res", true);
        AddSignedValue(parts, ParseLinearValue(skill.cold_resist_bonus), "cold res", true);
        AddSignedValue(parts, ParseLinearValue(skill.disease_resist_bonus), "disease res", true);

        // 5. Attack speed
        AddSignedPercent(parts, ParseLinearValue(skill.haste_bonus), "haste", true);
        AddSignedPercent(parts, ParseLinearValue(skill.spell_haste_bonus), "spell haste", true);

        // 7. Hit/chance modifiers
        AddSignedPercent(parts, ParseLinearValue(skill.critical_chance_bonus), "crit", true);
        AddSignedPercent(parts, ParseLinearValue(skill.critical_resist_bonus), "critical resist", true);
        AddSignedPercent(parts, ParseLinearValue(skill.accuracy_bonus), "accuracy", true);
        AddSignedPercent(parts, ParseLinearValue(skill.block_chance_bonus), "block", true);
        AddSignedPercent(parts, ParseLinearValue(skill.fear_resist_chance_bonus), "fear resist", true);

        // 8. Cooldown reduction
        AddSignedPercent(parts, ParseLinearValue(skill.cooldown_reduction_percent), "CDR", true);

        // 9. On-hit procs
        var dmgShield = ParseLinearValue(skill.damage_shield);
        if (dmgShield != null && dmgShield.base_value > 0)
            parts.Add($"{FormatLinearValue(dmgShield)} dmg shield");

        var healOnHit = ParseLinearValue(skill.heal_on_hit_percent);
        if (healOnHit != null && healOnHit.base_value > 0)
            parts.Add($"{FormatLinearPercent(healOnHit)} heal on hit");

        // 10. Regen / DoT
        var hps = ParseLinearValue(skill.healing_per_second_bonus);
        if (hps != null && hps.base_value != 0)
        {
            if (hps.base_value > 0)
                parts.Add($"{FormatLinearValue(hps)} hp/s");
            else
                parts.Add($"{FormatLinearValue(Abs(hps))} dmg/s");
        }

        AddSignedPercent(parts, ParseLinearValue(skill.health_percent_per_second_bonus), "hp/s", true);

        var mps = ParseLinearValue(skill.mana_per_second_bonus);
        if (mps != null && mps.base_value != 0)
        {
            if (mps.base_value > 0)
                parts.Add($"{FormatLinearValue(mps)} mana/s");
            else
                parts.Add($"{FormatLinearValue(Abs(mps))} mana drain/s");
        }

        AddSignedPercent(parts, ParseLinearValue(skill.mana_percent_per_second_bonus), "mana/s", true);
        AddSignedValue(parts, ParseLinearValue(skill.energy_per_second_bonus), "rage/s", true);
        AddSignedPercent(parts, ParseLinearValue(skill.energy_percent_per_second_bonus), "rage/s", true);

        // 11. Primary stats
        AddSignedValue(parts, ParseLinearValue(skill.strength_bonus), "str", true);
        AddSignedValue(parts, ParseLinearValue(skill.intelligence_bonus), "int", true);
        AddSignedValue(parts, ParseLinearValue(skill.dexterity_bonus), "dex", true);
        AddSignedValue(parts, ParseLinearValue(skill.constitution_bonus), "con", true);
        AddSignedValue(parts, ParseLinearValue(skill.wisdom_bonus), "wis", true);
        AddSignedValue(parts, ParseLinearValue(skill.charisma_bonus), "cha", true);

        // Debuff type tags (only if nothing else and it's a debuff)
        if (parts.Count == 0 && skill.skill_type is "area_debuff" or "target_debuff")
        {
            if (skill.is_poison_debuff) parts.Add("poison DoT");
            else if (skill.is_fire_debuff) parts.Add("fire DoT");
            else if (skill.is_cold_debuff) parts.Add("cold DoT");
            else if (skill.is_disease_debuff) parts.Add("disease DoT");
            else if (skill.is_melee_debuff) parts.Add("melee debuff");
            else if (skill.is_magic_debuff) parts.Add("magic debuff");
        }

        // 12. Cleanse resistance (always last)
        if (skill.prob_ignore_cleanse is > 0)
            parts.Add($"{FormatPercent(skill.prob_ignore_cleanse.Value)} Cleanse Resist");
    }

    /// <summary>Resource/offense/defense/stat bonuses: <c>{sign}{value} {label}</c>.
    /// When <paramref name="requireNonZeroBase"/> the TS guard is <c>val &amp;&amp; base !== 0</c>;
    /// otherwise it is just <c>val</c> (non-null after the zero-collapse).</summary>
    private static void AddSignedValue(List<string> parts, LinearValue value, string label, bool requireNonZeroBase)
    {
        if (value == null || (requireNonZeroBase && value.base_value == 0))
            return;
        var sign = value.base_value > 0 ? "+" : "";
        parts.Add($"{sign}{FormatLinearValue(value)} {label}");
    }

    private static void AddSignedPercent(List<string> parts, LinearValue value, string label, bool requireNonZeroBase)
    {
        if (value == null || (requireNonZeroBase && value.base_value == 0))
            return;
        var sign = value.base_value > 0 ? "+" : "";
        parts.Add($"{sign}{FormatLinearPercent(value)} {label}");
    }

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

    private static LinearValue Abs(LinearValue lv) =>
        new(System.Math.Abs(lv.base_value), System.Math.Abs(lv.bonus_per_level));

    /// <summary>Player-context formatting: base, plus <c>(+X/lvl)</c> scaling when non-zero.</summary>
    private static string FormatLinearValue(LinearValue lv)
    {
        if (lv.bonus_per_level == 0)
            return Loc(lv.base_value);
        var sign = lv.bonus_per_level > 0 ? "+" : "";
        return $"{Loc(lv.base_value)} ({sign}{Loc(lv.bonus_per_level)}/lvl)";
    }

    private static string FormatLinearPercent(LinearValue lv)
    {
        if (lv.bonus_per_level == 0)
            return FormatPercent(lv.base_value);
        var sign = lv.bonus_per_level > 0 ? "+" : "";
        return $"{FormatPercent(lv.base_value)} ({sign}{FormatPercent(lv.bonus_per_level)}/lvl)";
    }

    /// <summary>Mirror of formatSkillEffect's local <c>formatPercent</c>: value*100, one
    /// decimal place, dropping the decimal when the result is whole. No grouping.</summary>
    private static string FormatPercent(double value)
    {
        var pct = value * 100.0;
        var rounded = System.Math.Round(pct, 1, System.MidpointRounding.AwayFromZero);
        if (rounded == System.Math.Round(rounded))
            return ((long)rounded).ToString(Inv) + "%";
        return rounded.ToString("0.0###", Inv) + "%";
    }

    /// <summary>Mirror of JS <c>Number.toLocaleString()</c> (en-US): thousands grouping,
    /// up to three fraction digits.</summary>
    private static string Loc(double value) => value.ToString("#,##0.###", Inv);

    /// <summary>Mirror of plain JS <c>`${number}`</c> interpolation: no grouping, no
    /// trailing zeros (used for durations, stun/fear seconds, AoE sizes).</summary>
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
        if (seconds < 60)
            return JsNum(seconds) + "s";
        var minutes = (long)System.Math.Floor(seconds / 60.0);
        var hours = minutes / 60;
        if (hours > 0)
        {
            var remainingMinutes = minutes % 60;
            return remainingMinutes > 0 ? $"{hours}h {remainingMinutes}m" : $"{hours}h";
        }
        return $"{minutes}m";
    }

    /// <summary>Verbatim port of <c>HARDCODED_EFFECTS</c> — skills whose summary is a
    /// fixed string keyed by skill id (game-changers the generic formatter can't model).</summary>
    private static readonly Dictionary<string, string> HardcodedEffects = new()
    {
        ["improved_backstab"] = "+25% combat advantage dmg",
        ["bind_affinity"] = "set custom respawn & portal scroll destination",
        ["binding"] = "set custom respawn & portal scroll destination",
        ["elixir_endurance"] = "+60s potion buff duration/lvl",
        ["veteran_awareness"] = "reveals nearby monsters on minimap",
        ["parry"] = "negate & counter melee attack",
        ["symbiosis"] = "pet inherits +10%/lvl of your attributes & resistances (max 50%)",
        ["summon_player"] = "teleport target to caster, stun (2s)",
        ["disarm_trap"] = "detect and disarm traps",
        ["alchemy"] = "craft potions and elixirs",
        ["baking"] = "craft food and consumables",
        ["crafting"] = "craft equipment and items",
        ["digging"] = "dig for buried treasure",
        ["gathering"] = "gather herbs and reagents",
        ["mining"] = "mine ore and minerals",
        ["opening"] = "open locked chests",
        ["lockpicking"] = "open locked chests with lockpicks (20% success chance)",
        ["blushburst"] = "cosmetic visual effect",
        ["emerald_pop"] = "cosmetic visual effect",
        ["golden_whirl"] = "cosmetic visual effect",
        ["skyflare"] = "cosmetic visual effect",
        ["detect_traps"] = "passive — reveal and disarm traps (Rogue only)",
        ["halloween_event"] = "2× XP from kills, event duration",
        ["winter_festival"] = "2× XP from kills, event duration",
        ["elixir_of_enlightened_learning"] = "2× XP from kills, 1800s (+60s/lvl)",
        ["master_poisoner"] = "weapon strikes deal poison dmg (Attack Damage + DEX×2.5), resisted by Poison Resist, 10s",
        ["call_of_the_heroes"] = "teleport all active mercenaries to you, remove their fear",
        ["charge"] = "charge toward target, removes roots, +3.5 speed, +100% accuracy, +5% rage/s, 2s",
        ["teleport"] = "",
        ["new_skill_placeholder"] = "",
        ["razor_of_wrath"] = "+1%/lvl attack power, scales with current rage (full rage = full bonus)",
        ["arcane_edge"] = "+1%/lvl spell power, scales with current mana (full mana = full bonus)",
        ["divine_intervention"] = "grants invulnerability to nearby allies, 3s",
    };
}

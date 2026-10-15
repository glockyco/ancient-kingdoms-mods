#nullable disable
using System.Collections.Generic;
using System.Globalization;

namespace BetterBestiary.Skills;

/// <summary>
/// C# port of the website's <c>formatSkillEffect</c>. The default call keeps
/// website parity with the skill-intrinsic no-monsterContext branch. The
/// BetterBestiary skills panel passes <c>monsterContext</c> for monster-owned
/// skills: damage then names the monster's stats, and threat, which only a
/// player's cast can raise, is left out.
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

    public static string Format(SkillEffectInput skill, bool monsterContext = false)
    {
        if (skill.id != null && HardcodedEffects.TryGetValue(skill.id, out var hardcoded))
            return hardcoded;

        // Source: server-scripts/AreaBuffSkill.cs:Apply — Evacuate sends the caster and every
        // living, visible player within its cast range to the city assigned to the caster's zone.
        if (skill.is_teleport)
            return $"teleports you & every player within {JsNum(skill.cast_range)} yd to this zone's city, stun (1s)";

        // Source: server-scripts/TargetBuffSkill.cs:Apply — a cooldown-reduction spell shortens
        // each remaining cooldown by its share, at most 30s, and applies no buff.
        var cooldownCut = ParseLinearValue(skill.cooldown_reduction_percent);
        if (skill.skill_type == "target_buff" && cooldownCut != null)
            return $"cuts your remaining cooldowns by {FormatLinearPercent(cooldownCut)} (max 30s each)";

        var castByMonsters = monsterContext || skill.npc_caster_only;
        var parts = new List<string>();

        if (!skill.is_manaburn_skill)
            FormatDamage(skill, monsterContext, parts);
        if (skill.channel_pulses > 0)
            parts.Add($"channeled over {skill.channel_pulses} pulses");
        FormatHealing(skill, parts);
        FormatCrowdControl(skill, castByMonsters, parts);
        FormatSummons(skill, parts);

        // Only monsters enrage from a passive: DealDamageAt scans monster and NPC skill
        // lists alone, and no NPC carries a skill, so a player passive with the flag
        // changes no damage.
        // Source: server-scripts/Combat.cs:774-807 (enrage scan and damage bonus, non-spell hits only)
        if (skill.skill_type == "passive" && skill.is_enrage)
            parts.Add("+50-75% non-spell dmg below 10% hp");
        if (skill.is_bard_song)
            parts.Add("Bard song");
        if (skill.is_bard_charm)
        {
            var charmedDamage = ParseLinearValue(skill.charmed_damage_percent);
            parts.Add(charmedDamage != null
                ? $"charms a non-boss, non-elite monster at {FormatLinearPercent(charmedDamage)} of its dmg"
                : "charms a non-boss, non-elite monster");
        }
        if (skill.additional_active_bard_songs != 0)
            parts.Add($"+{skill.additional_active_bard_songs} active Bard song");
        if (skill.unlimited_active_bard_songs)
            parts.Add("no active Bard song limit");
        if (skill.bard_song_duration_bonus_per_level != 0)
            parts.Add($"+{FormatPercent(skill.bard_song_duration_bonus_per_level)} song duration per rank");
        if (skill.extra_gather_item_chance != 0)
            parts.Add($"{FormatPercent(skill.extra_gather_item_chance)} chance for an extra gathered item");
        if (skill.food_and_drink_buff_duration_bonus_per_level != 0)
            parts.Add($"+{FormatPercent(skill.food_and_drink_buff_duration_bonus_per_level)} food and drink duration per rank");
        if (skill.is_necromancer_reaper_form)
            parts.Add("toggle form");
        if (skill.is_necromancer_pet_buff)
            parts.Add("buffs your companion");
        else if (skill.skill_type == "target_buff" && skill.is_pet_skill)
            parts.Add("buffs your companion");
        if (skill.skill_type == "area_buff" && skill.is_mercenary_skill && !skill.is_bard_song)
            parts.Add("buffs your mercenaries");
        if (skill.also_buff_active_pet)
            parts.Add($"{(skill.can_buff_others ? "when self-cast, " : "")}also buffs your companion within {JsNum(skill.cast_range)} yd");
        if (skill.is_bard_virtuosity)
            parts.Add("with 3+ active songs");
        if (skill.skill_type is "area_buff" or "area_debuff" or "target_buff" or "target_debuff" or "passive")
            FormatBuffDebuffStats(skill, castByMonsters, parts);
        if (skill.is_bard_virtuosity && skill.additional_damage_percent_per_song != 0)
            parts.Add($"+{FormatPercent(skill.additional_damage_percent_per_song)} attack and spell power per active song beyond 3");

        if (skill.is_assassination_skill)
            parts.Add("usable at or below 25% target hp");
        if (skill.is_manaburn_skill)
        {
            parts.Add(skill.skill_type == "target_projectile"
                ? "spends all mana for 3 dmg per mana, ignores avoidance & mitigation"
                : "spends all rage for 2 dmg per rage, ignores avoidance & mitigation");
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

    private static string DamageStatLabel(string stat) => stat switch
    {
        "spell_power" => "spell power",
        "attack_power" => "attack power",
        "ranged_dexterity" => "150% of dexterity",
        "poison_dexterity" => "250% of dexterity",
        _ => throw new System.InvalidOperationException($"Unknown damage stat {stat}"),
    };

    /// <summary>Append a formatted linear value to a sum, folding its leading sign into the operator.</summary>
    private static string AddTerm(string sum, string term) =>
        term.StartsWith("-") || term.StartsWith("−")
            ? $"{sum} − {term.Substring(1)}"
            : $"{sum} + {term}";

    /// <summary>Wrap a sum or a rank formula in parentheses so a multiplication binds to all of it.</summary>
    private static string Group(string expression) =>
        expression.Contains(" + ") || expression.Contains(" − ") ? $"({expression})" : expression;

    private static void FormatDamage(SkillEffectInput skill, bool monsterContext, List<string> parts)
    {
        var skillDmg = ParseLinearValue(skill.damage);
        var damagePercent = ParseLinearValue(skill.damage_percent);
        if (skillDmg == null && damagePercent == null)
            return;

        var multiplier = damagePercent != null && damagePercent.base_value > 0 ? damagePercent : null;
        var formattedType = skill.damage_type != null ? FormatDamageType(skill.damage_type) : "";
        var typeLabel = formattedType.Length > 0 ? " " + formattedType : "";

        var stats = (monsterContext ? skill.monster_damage_stats : skill.damage_stats) ?? new List<string>();
        var terms = stats.ConvertAll(DamageStatLabel);
        var listed = skillDmg != null ? FormatLinearValue(skillDmg) : null;
        var combined = terms.Count == 0
            ? listed ?? "0"
            : listed == null
                ? string.Join(" + ", terms)
                : AddTerm(string.Join(" + ", terms), listed);
        var amount = multiplier != null
            ? $"{Group(combined)} × {Group(FormatLinearPercent(multiplier))}"
            : combined;
        parts.Add($"{amount}{typeLabel} dmg");
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
            "Unknown" => "",
            _ => "",
        };
    }

    private static void FormatHealing(SkillEffectInput skill, List<string> parts)
    {
        var cost = ParseLinearValue(skill.health_cost_percent);
        var restored = ParseLinearValue(skill.mana_restored_percent);
        if (skill.is_necromancer_blood_pact && cost != null && restored != null)
        {
            parts.Add($"spend {FormatLinearPercent(cost)} max hp (rounded up), restore {FormatLinearPercent(restored)} max mana (rounded down, at most missing mana)");
            return;
        }
        var healing = ParseLinearValue(skill.healing_percent);
        if (skill.is_necromancer_death_bloom && cost != null && healing != null)
        {
            var bonus = skill.healing_percent_per_intelligence != 0
                ? $" + {FormatPercent(skill.healing_percent_per_intelligence)} per INT"
                : "";
            parts.Add($"spend {FormatLinearPercent(cost)} max hp (rounded up), heal target for health spent × ({FormatLinearPercent(healing)}{bonus}) (rounded)");
            return;
        }

        var mercenaryHeal = skill.skill_type == "area_heal" && skill.is_mercenary_skill;
        if (mercenaryHeal)
            parts.Add("heals your mercenaries");

        var heal = ParseLinearValue(skill.heals_health);
        if (heal != null)
            parts.Add($"{FormatLinearValue(heal)} hp");

        var healMana = ParseLinearValue(skill.heals_mana);
        if (healMana != null)
            parts.Add($"{FormatLinearValue(healMana)} {(mercenaryHeal ? "mana or rage" : "mana")}");

        if (skill.is_resurrect_skill)
            parts.Add("resurrect player (60% max hp, mana = 20% max hp, +75% lost XP) or mercenary (10% max hp)");

        if (skill.is_balance_health)
            parts.Add("balance hp");
    }

    private static void FormatCrowdControl(SkillEffectInput skill, bool castByMonsters, List<string> parts)
    {
        var areaProjectile = skill.skill_type == "area_damage" && skill.area_projectile;

        var lifetap = ParseLinearValue(skill.lifetap_percent);
        if (lifetap != null && !areaProjectile)
            parts.Add($"{FormatLinearPercent(lifetap)} lifetap");

        if (skill.break_armor_prob is > 0)
            parts.Add($"{FormatPercent(skill.break_armor_prob.Value)} chance a random equipped item loses 1-4 durability");

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
                    : $" (50-100% of {FormatLinearDuration(fearDur.base_value, fearDur.bonus_per_level)})";
            parts.Add($"{(stun != null ? "else " : "")}{FormatLinearPercent(fear)} fear{durSuffix}");
        }

        var knockback = ParseLinearValue(skill.knockback_chance);
        if (knockback != null && !areaProjectile)
        {
            var distance = skill.knockback_distance ?? 0;
            var reach = distance > 0 ? $" {JsNum(distance)} yd" : "";
            parts.Add($"{(stun != null || fear != null ? "else " : "")}{FormatLinearPercent(knockback)} knockback{reach}");
        }

        if (skill.affects_random_target)
            parts.Add("random target");

        if (skill.area_objects_to_spawn is > 0)
        {
            var sizeInfo = skill.area_object_size is not null && skill.area_object_size != 0
                ? $", {JsNum(skill.area_object_size.Value)} yd wide"
                : "";
            parts.Add($"{skill.area_objects_to_spawn.Value} random zones + 1 on target{sizeInfo}");
        }

        var aggro = ParseLinearValue(skill.aggro);
        if (aggro != null && aggro.base_value != 0 && !castByMonsters)
        {
            var directHit = skill.skill_type == "target_damage"
                || (skill.skill_type == "area_damage" && !skill.area_projectile);
            var healthThreat = aggro.base_value > 0 && directHit ? " plus caster max hp" : "";
            parts.Add($"{(aggro.base_value > 0 ? "+" : "")}{FormatLinearValue(aggro)} aggro{healthThreat}");
        }
    }

    private static void FormatSummons(SkillEffectInput skill, List<string> parts)
    {
        // Summon Player is the only summon_count_per_cast 0 skill and has its own text.
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

    private static void FormatBuffDebuffStats(SkillEffectInput skill, bool castByMonsters, List<string> parts)
    {
        var initialPartCount = parts.Count;
        var debuff = skill.skill_type is "area_debuff" or "target_debuff";

        // 1. Special flags
        if (skill.is_double_exp_spell)
            parts.Add("2× XP from kills, gathering, fishing, crafting, alchemy & scribing");
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
            var list = types.Count > 1
                ? $"{string.Join(", ", types.GetRange(0, types.Count - 1))} & {types[types.Count - 1]}"
                : string.Join("", types);
            parts.Add($"cleanses {list} debuffs");
            // Source: server-scripts/TargetBuffSkill.cs:Apply; AreaBuffSkill.cs:Apply — a cleanse spell removes debuffs instead of applying its own buff fields.
            return;
        }
        if (skill.is_blindness)
            parts.Add("blinds");
        if (skill.is_invisibility)
            parts.Add(skill.ignores_see_invisibility ? "grants invis, even vs see invis" : "grants invis");
        // A buff carrying illusionRace redraws the wearer as that race until it ends.
        // Source: server-scripts/BuffSkill.cs:illusionRace,86-96 (illusionRace, HasAppearanceIllusion),
        // server-scripts/Player.cs:6842-6852 (ReSkinPlayer picks the illusion race)
        if (!string.IsNullOrWhiteSpace(skill.illusion_race))
            parts.Add($"{skill.illusion_race} illusion");
        if (skill.is_mana_shield)
            parts.Add("mana shield");
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
                parts.Add($"{(speedBonus.base_value > 0 ? "+" : "")}{FormatLinearValue(speedBonus)} speed");
        }

        // 3. Resource pools
        AddSignedValue(parts, ParseLinearValue(skill.health_max_bonus), "max hp", false);
        var healthPercentTarget = skill.skill_type == "passive" && skill.is_pet_skill
            ? "companion max hp"
            : "max hp";
        AddSignedPercent(parts, ParseLinearValue(skill.health_max_percent_bonus), healthPercentTarget, false);
        AddSignedValue(parts, ParseLinearValue(skill.mana_max_bonus), "max mana", false);
        AddSignedPercent(parts, ParseLinearValue(skill.mana_max_percent_bonus), "max mana", false);
        AddSignedValue(parts, ParseLinearValue(skill.energy_max_bonus), "max rage", false);

        // 4. Offense
        AddSignedValue(parts, ParseLinearValue(skill.damage_bonus), "attack power", true);
        AddSignedPercent(parts, ParseLinearValue(skill.damage_percent_bonus), "attack power", true);
        AddSignedValue(parts, ParseLinearValue(skill.magic_damage_bonus), "spell power", true);
        AddSignedPercent(
            parts,
            ParseLinearValue(skill.magic_damage_percent_bonus),
            skill.is_necromancer_reaper_form ? "spell power & DoT dmg" : "spell power",
            true);
        var lifetapHealing = ParseLinearValue(skill.lifetap_healing_percent_bonus);
        if (lifetapHealing != null)
            parts.Add($"+{FormatLinearPercent(lifetapHealing)} lifetap healing");
        var dotExecute = ParseLinearValue(skill.damage_over_time_execute_bonus);
        if (dotExecute != null)
            parts.Add($"+{FormatLinearPercent(dotExecute)} DoT dmg vs targets below 30% hp");

        // 4. Defense
        var defenseBonus = ParseLinearValue(skill.defense_bonus);
        var magicResistBonus = ParseLinearValue(skill.magic_resist_bonus);
        var invulnerable = (defenseBonus?.base_value ?? 0) >= 10000 && (magicResistBonus?.base_value ?? 0) >= 10000;
        if (invulnerable)
            parts.Add(castByMonsters ? "immune to direct dmg" : "invulnerable");
        else
            AddSignedValue(parts, defenseBonus, "AC", true);
        AddSignedValue(parts, ParseLinearValue(skill.ward_bonus), "ward", true);
        if (!invulnerable)
        {
            AddSignedValue(parts, magicResistBonus, "magic res", true);
            AddSignedValue(parts, ParseLinearValue(skill.poison_resist_bonus), "poison res", true);
            AddSignedValue(parts, ParseLinearValue(skill.fire_resist_bonus), "fire res", true);
            AddSignedValue(parts, ParseLinearValue(skill.cold_resist_bonus), "cold res", true);
            AddSignedValue(parts, ParseLinearValue(skill.disease_resist_bonus), "disease res", true);
        }

        // 5. Attack speed
        AddSignedPercent(parts, ParseLinearValue(skill.haste_bonus), "haste", true);
        AddSignedPercent(parts, ParseLinearValue(skill.spell_haste_bonus), "spell casting haste", true);

        // 7. Hit/chance modifiers
        AddSignedPercent(parts, ParseLinearValue(skill.critical_chance_bonus), "crit", true);
        AddSignedPercent(parts, ParseLinearValue(skill.critical_resist_bonus), "critical resist", true);
        AddSignedPercent(parts, ParseLinearValue(skill.accuracy_bonus), "accuracy", true);
        AddSignedPercent(parts, ParseLinearValue(skill.block_chance_bonus), "block", true);
        var fearResist = ParseLinearValue(skill.fear_resist_chance_bonus);
        if (fearResist != null && fearResist.base_value != 0)
        {
            var sign = fearResist.base_value > 0 ? "+" : "";
            var capSuffix = skill.fear_resist_chance_bonus_cap > 0
                ? $" (max {FormatPercent(skill.fear_resist_chance_bonus_cap)})"
                : "";
            parts.Add($"{sign}{FormatLinearPercent(fearResist)} fear resist{capSuffix}");
        }

        // Cooldown reduction is an instant cast effect, formatted by Format.

        // 9. On-hit procs
        var dmgShield = ParseLinearValue(skill.damage_shield);
        if (dmgShield != null && dmgShield.base_value > 0)
        {
            var formattedType = skill.damage_shield_type != null
                ? FormatDamageType(skill.damage_shield_type)
                : "";
            var typeLabel = formattedType.Length > 0 ? " " + formattedType : "";
            parts.Add($"{FormatLinearValue(dmgShield)}{typeLabel} dmg shield");
        }

        var healOnHit = ParseLinearValue(skill.heal_on_hit_percent);
        if (healOnHit != null && healOnHit.base_value > 0)
            parts.Add($"melee hits on the target heal the attacker {FormatLinearPercent(healOnHit)} of dmg");

        // 10. Regen / DoT. A negative value ticks as damage on whoever wears the buff.
        var hps = ParseLinearValue(skill.healing_per_second_bonus);
        if (hps != null && hps.base_value != 0)
        {
            if (hps.base_value > 0)
                parts.Add($"{FormatLinearValue(hps)} hp/s");
            else
            {
                var formattedType = skill.damage_over_time_type != null
                    ? FormatDamageType(skill.damage_over_time_type)
                    : "";
                var typeLabel = formattedType.Length > 0 ? " " + formattedType : "";
                // Attribute scaling is documented in skill details, not effect summaries.
                parts.Add($"{(debuff ? "" : "wearer takes ")}{FormatLinearValue(Abs(hps))}{typeLabel} dmg/s");
            }
        }

        var hpPct = ParseLinearValue(skill.health_percent_per_second_bonus);
        if (hpPct != null && hpPct.base_value != 0)
        {
            if (hpPct.base_value > 0)
                parts.Add($"+{FormatLinearPercent(hpPct)} hp/s");
            else
            {
                var share = FormatLinearPercent(new LinearValue(-hpPct.base_value, -hpPct.bonus_per_level));
                parts.Add(debuff ? $"{share} max hp dmg/s" : $"{share} max hp drain/s");
            }
        }

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

        // Debuff type tags (only if nothing else and it's a debuff). A charm's type only matters to cleanses.
        if (parts.Count == initialPartCount && debuff && !skill.is_bard_charm)
        {
            if (skill.is_poison_debuff) parts.Add("poison DoT");
            else if (skill.is_fire_debuff) parts.Add("fire DoT");
            else if (skill.is_cold_debuff) parts.Add("cold DoT");
            else if (skill.is_disease_debuff) parts.Add("disease DoT");
            else if (skill.is_melee_debuff) parts.Add("melee debuff");
            else if (skill.is_magic_debuff) parts.Add("magic debuff");
        }

        // A passive with a weapon requirement adds its bonus only while that weapon is equipped.
        if (skill.skill_type == "passive" && !string.IsNullOrEmpty(skill.required_weapon_category))
            parts.Add($"with {WeaponCategoryLabel(skill.required_weapon_category)}");

        // 12. Cleanse Resist, always last.
        if (skill.prob_ignore_cleanse is > 0)
            parts.Add($"{FormatPercent(skill.prob_ignore_cleanse.Value)} Cleanse Resist");
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

    /// <summary>Exact player-context formula as a function of skill level.</summary>
    private static string FormatLinearValue(LinearValue lv)
    {
        if (lv.bonus_per_level == 0)
            return Loc(lv.base_value);
        return FormatSkillLevelFormula(lv, Loc);
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
        return FormatSkillLevelFormula(new LinearValue(baseValue, bonusPerLevel), value => $"{Loc(value)}s");
    }

    private static string FormatSkillLevelFormula(
        LinearValue value,
        System.Func<double, string> formatValue)
    {
        var constant = value.base_value - value.bonus_per_level;
        var operation = value.bonus_per_level > 0 ? "+" : "−";
        var perLevel = formatValue(System.Math.Abs(value.bonus_per_level));

        if (constant == 0)
        {
            var sign = value.bonus_per_level < 0 ? "−" : "";
            return $"{sign}{perLevel} × rank";
        }

        return $"{formatValue(constant)} {operation} {perLevel} × rank";
    }

    /// <summary>Mirror of formatSkillEffect's local <c>formatPercent</c>: value*100, two
    /// decimal places, dropping trailing zeros and the decimal when the result is whole. No grouping.</summary>
    private static string FormatPercent(double value)
    {
        var pct = value * 100.0;
        var rounded = System.Math.Round(pct, 2, System.MidpointRounding.AwayFromZero);
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
        ["improved_backstab"] = "from-behind bonus dmg 25% instead of 10%",
        ["bind_affinity"] = "set bind point (respawn & Gate Scroll destination)",
        ["binding"] = "set bind point (respawn & Gate Scroll destination)",
        ["elixir_endurance"] = "potion buff duration +60s × rank",
        ["veteran_awareness"] = "reveals nearby monsters on minimap (not in Temple of Valaark)",
        ["parry"] = "while casting, blocks your target's physical melee hits & counters 50% (max 5,000)",
        ["symbiosis"] = "pet gets 10% × rank of your attributes, AC & resistances when summoned (max 50%)",
        ["summon_player"] = "pulls a target 3-15 yd away to the caster, stun (2s)",
        ["disarm_trap"] = "disarm traps (needs Detect Traps or Sharp Senses)",
        ["alchemy"] = "craft potions and elixirs",
        ["baking"] = "craft food and consumables",
        ["crafting"] = "craft equipment and items",
        ["crafting_scroll"] = "scribe scrolls",
        ["digging"] = "dig for buried treasure",
        ["fishing"] = "catch fish",
        ["gathering"] = "gather plants and Radiant Sparks",
        ["mining"] = "mine ore and minerals",
        ["opening"] = "open chests",
        ["lockpicking"] = "open locked chests with lockpicks, 1 per try (20% success chance)",
        ["blushburst"] = "cosmetic visual effect",
        ["emerald_pop"] = "cosmetic visual effect",
        ["golden_whirl"] = "cosmetic visual effect",
        ["skyflare"] = "cosmetic visual effect",
        ["detect_traps"] = "reveal and disarm traps",
        // Source: Player.cs:8425-8442 — Sharp Senses uses the same trap-detection gate.
        ["sharp_senses"] = "reveal and disarm traps",
        ["halloween_event"] = "2× XP from kills, gathering, fishing, crafting, alchemy & scribing, event duration",
        ["winter_festival"] = "2× XP from kills, gathering, fishing, crafting, alchemy & scribing, event duration",
        ["master_poisoner"] = "Stab deals poison dmg (attack power + 250% of dexterity), resisted by poison res, 10s",
        ["wild_strike"] = "next auto attack deals +10% × rank dmg as magic dmg, 5s",
        ["call_of_the_heroes"] = "teleport all active mercenaries to you, remove their fear",
        ["charge"] = "charge toward target, removes roots, +3.5 speed, +100% accuracy, +5% rage/s, 2s",
        ["teleport"] = "use travel items (out of combat)",
        ["new_skill_placeholder"] = "",
        ["razor_of_wrath"] = "attack power +1% × rank, scales with current rage (full rage = full bonus)",
        ["arcane_edge"] = "spell power +1% × rank, scales with current mana (full mana = full bonus)",
        ["divine_intervention"] = "grants invulnerability to nearby allies, 3s",
    };
}

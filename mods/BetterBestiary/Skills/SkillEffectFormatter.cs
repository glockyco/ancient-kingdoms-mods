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

    public static string Format(SkillEffectInput skill, bool monsterContext = false)
    {
        if (skill.id != null && HardcodedEffects.TryGetValue(skill.id, out var hardcoded))
            return hardcoded;

        // Source: server-scripts/AreaBuffSkill.cs:Apply — Evacuate sends the caster and every
        // living, visible player within its cast range to the city assigned to the caster's zone.
        if (skill.is_teleport)
            return $"teleports you & every player within {FormatNumber(skill.cast_range)} yd to this zone's city, stun (1s)";

        // Source: server-scripts/TargetBuffSkill.cs:Apply — a cooldown-reduction spell shortens
        // each remaining cooldown by its share, at most 30s, and applies no buff.
        var cooldownCut = ParseLinearValue(skill.cooldown_reduction_percent);
        if (skill.skill_type == "target_buff" && cooldownCut != null)
            return $"cuts your remaining cooldowns by {FormatLinearPercent(cooldownCut)} (max 30s each)";

        // A monster's cast owes nothing to the reader's attributes.
        var notes = monsterContext ? NoNotes : skill.notes ?? NoNotes;
        var castByMonsters = monsterContext || skill.npc_caster_only;
        var parts = new List<string>();

        // Source: server-scripts/BardFinalCadenceSkill.cs:HasRequiredSongsActive; BardMercenarySkills.cs:CanUseFinalCadence,MaximumCombatSongs — a player Bard needs three active songs, a Bard mercenary level 50 and all three of its combat songs.
        if (skill.is_bard_final_cadence)
            parts.Add(skill.is_mercenary_skill ? "needs level 50 & 3 active songs" : "needs 3+ active songs");

        if (skill.is_bard_final_cadence)
        {
            // Source: server-scripts/BardFinalCadenceSkill.cs:Apply — one multiplier scales both the damage and the healing, so one note covers both.
            var amounts = new List<string>();
            FormatDamage(skill, monsterContext, NoNotes, amounts);
            FormatHealing(skill, NoNotes, amounts);
            parts.Add(Qualify(string.Join(" & ", amounts), Note(notes, "damage")));
        }
        else
        {
            if (!skill.is_manaburn_skill)
                FormatDamage(skill, monsterContext, notes, parts);
            if (skill.channel_pulses > 0)
                parts.Add($"channeled over {skill.channel_pulses} pulses");
            FormatHealing(skill, notes, parts);
        }
        FormatCrowdControl(skill, castByMonsters, parts);
        FormatSummons(skill, parts);

        // Only monsters enrage from a passive: DealDamageAt scans monster and NPC skill
        // lists alone, and no NPC carries a skill, so a player passive with the flag
        // changes no damage.
        // Source: server-scripts/Combat.cs:783-816 (enrage scan and damage bonus, non-spell hits only)
        if (skill.skill_type == "passive" && skill.is_enrage)
            parts.Add("+50-75% non-spell dmg below 10% hp");
        if (skill.is_bard_song)
            parts.Add(Qualify("Bard song", Note(notes, "is_bard_song")));
        if (skill.is_bard_charm)
        {
            var charmedDamage = ParseLinearValue(skill.charmed_damage_percent);
            parts.Add(charmedDamage != null
                ? Qualify(
                    $"charms a non-boss, non-elite monster at {FormatLinearPercent(charmedDamage)} of its dmg",
                    Note(notes, "charmed_damage_percent"))
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
        // Source: server-scripts/FoodItem.cs:Use; Pet.cs:2102-2113 — the bonus lengthens a player's Food and Drink buffs and a mercenary's Food buffs. Festive Event Food keeps its duration.
        if (skill.food_and_drink_buff_duration_bonus_per_level != 0)
            parts.Add($"+{FormatPercent(skill.food_and_drink_buff_duration_bonus_per_level)} duration per rank for your food & drink buffs and your mercenaries' food buffs, not festive food");
        if (skill.is_necromancer_reaper_form)
            parts.Add("toggle form");
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
            parts.Add($"+{FormatPercent(skill.additional_damage_percent_per_song)} attack and spell power per active song beyond 3");
        // Source: server-scripts/AreaBuffSkill.cs:Apply — isOnlyForMagicClasses skips Warrior and Rogue players and mercenaries.
        if (skill.skill_type == "area_buff" && skill.is_only_for_magic_classes)
            parts.Add("not Warriors or Rogues");

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

    private static string DamageTermLabel(string term) => term switch
    {
        "spell_power" => "spell power",
        "attack_power" => "attack power",
        "ranged_dexterity" => "150% of DEX",
        "poison_dexterity" => "250% of DEX",
        "bow" => "bow base dmg",
        "off_hand_half" => "50% of off-hand base dmg",
        "main_hand" => "main-hand base dmg",
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
            parts.Add(Qualify($"{combined}{typeLabel} dmg", Note(notes, "damage")));
            return;
        }
        var maxLevel = skill.max_level ?? 1;
        var lapses = multiplier.base_value <= 0
            || multiplier.base_value + multiplier.bonus_per_level * (maxLevel - 1) <= 0;
        parts.Add(Qualify(
            $"{Group(combined)} × {Group(FormatLinearPercent(multiplier))}{typeLabel} dmg",
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

        // Source: server-scripts/AreaHealSkill.cs:Apply,CheckDistance — a mercenary area heal reaches every active mercenary of the caster at any distance and restores Rage instead of Mana to Warrior and Rogue mercenaries.
        var mercenaryHeal = skill.skill_type == "area_heal" && skill.is_mercenary_skill;
        if (mercenaryHeal)
            parts.Add("heals your mercenaries at any distance");

        // Source: server-scripts/AreaHealSkill.cs:Apply — balancing sets everyone in range to their average share of maximum Health and heals nothing.
        if (skill.is_balance_health)
        {
            parts.Add($"balances the hp % of {AreaHealRecipients(skill)}");
            return;
        }
        if (skill.skill_type == "area_heal" && !skill.is_mercenary_skill)
            parts.Add($"heals {AreaHealRecipients(skill)}");

        var heal = ParseLinearValue(skill.heals_health);
        if (heal != null)
            parts.Add(Qualify($"{FormatLinearValue(heal)} hp", Note(notes, "heals_health")));

        var healMana = ParseLinearValue(skill.heals_mana);
        if (healMana != null)
            parts.Add($"{FormatLinearValue(healMana)} {(mercenaryHeal ? "mana or rage" : "mana")}");

        if (skill.is_resurrect_skill)
            parts.Add("resurrect player (60% max hp, mana = 20% max hp, +75% lost XP) or mercenary (10% max hp)");
    }

    // Source: server-scripts/AreaHealSkill.cs:Apply — an area heal without the pet or mercenary flag reaches its caster and every living, visible entity in range of the caster's own type, plus, for a player caster, every player's companions and mercenaries.
    private static string AreaHealRecipients(SkillEffectInput skill)
    {
        var range = $"within {FormatNumber(skill.cast_range)} yd";
        return skill.area_heal_caster switch
        {
            "player" => $"you & every player, companion & mercenary {range}",
            "pet" => $"itself & every companion & mercenary {range}, not players",
            "monster" => $"itself & every monster {range}",
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
            var name = !string.IsNullOrEmpty(skill.summoned_monster_name) ? skill.summoned_monster_name
                : !string.IsNullOrEmpty(skill.pet_name) ? skill.pet_name
                : !string.IsNullOrEmpty(skill.summoned_monster_id) ? skill.summoned_monster_id
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

    /// <summary>The five resistances, in display order.</summary>
    private static readonly (string Key, string Name)[] Resists =
    {
        ("magic_resist_bonus", "magic"),
        ("poison_resist_bonus", "poison"),
        ("fire_resist_bonus", "fire"),
        ("cold_resist_bonus", "cold"),
        ("disease_resist_bonus", "disease"),
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
            parts.Add($"cleanses {JoinAnd(types)} debuffs");
            // Source: server-scripts/TargetBuffSkill.cs:Apply; AreaBuffSkill.cs:Apply — a cleanse spell removes debuffs instead of applying its own buff fields.
            return;
        }
        if (skill.is_blindness)
            parts.Add("blinds");
        if (skill.is_invisibility)
            parts.Add(skill.ignores_see_invisibility ? "grants invis, even vs see invis" : "grants invis");
        // A buff carrying illusionRace redraws the wearer as that race until it ends.
        // Source: server-scripts/BuffSkill.cs:illusionRace,86-96 (illusionRace, HasAppearanceIllusion),
        // server-scripts/Player.cs:6883-6893 (ReSkinPlayer picks the illusion race)
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
                parts.Add(SignedValue(speedBonus, "speed"));
        }

        // 3. Resource pools
        AddValue(parts, skill.health_max_bonus, "max hp", false, Note(notes, "health_max_bonus"));
        var healthPercentTarget = skill.skill_type == "passive" && skill.is_pet_skill
            ? "companion max hp"
            : "max hp";
        AddPercent(parts, skill.health_max_percent_bonus, healthPercentTarget, false, Note(notes, "health_max_percent_bonus"));
        AddValue(parts, skill.mana_max_bonus, "max mana", false, Note(notes, "mana_max_bonus"));
        var manaMaxPercent = ParseLinearValue(skill.mana_max_percent_bonus);
        if (manaMaxPercent != null)
            parts.Add(SignedPercent(manaMaxPercent, "max mana"));
        AddValue(parts, skill.energy_max_bonus, "max rage", false, Note(notes, "energy_max_bonus"));

        // 4. Offense
        AddValue(parts, skill.damage_bonus, "attack power", true, Note(notes, "damage_bonus"));
        AddPercent(parts, skill.damage_percent_bonus, "attack power", true, Note(notes, "damage_percent_bonus"));
        AddValue(parts, skill.magic_damage_bonus, "spell power", true, Note(notes, "magic_damage_bonus"));
        // Source: server-scripts/Skills.cs:ApplyDamageOverTimeBonuses — an active Reaper Form also multiplies the caster's DoT ticks on others by its spell power bonus.
        AddPercent(
            parts,
            skill.magic_damage_percent_bonus,
            skill.is_necromancer_reaper_form ? "spell power & DoT dmg" : "spell power",
            true,
            Note(notes, "magic_damage_percent_bonus"));
        var lifetapHealing = ParseLinearValue(skill.lifetap_healing_percent_bonus);
        if (lifetapHealing != null)
            parts.Add($"+{FormatLinearPercent(lifetapHealing)} lifetap healing");
        var dotExecute = ParseLinearValue(skill.damage_over_time_execute_bonus);
        if (dotExecute != null)
            parts.Add($"+{FormatLinearPercent(dotExecute)} DoT dmg vs targets below 30% hp");

        // 4. Defense
        var defenseBonus = ParseLinearValue(skill.defense_bonus);
        var magicResistBonus = ParseLinearValue(skill.magic_resist_bonus);
        // Source: server-scripts/Combat.cs:DealDamageAt — 10,000 AC and Magic Resist block every direct hit.
        var invulnerable = (defenseBonus?.base_value ?? 0) >= 10000 && (magicResistBonus?.base_value ?? 0) >= 10000;
        if (invulnerable)
            parts.Add(castByMonsters ? "immune to direct dmg" : "invulnerable");
        else
            AddValue(parts, skill.defense_bonus, "AC", true, Note(notes, "defense_bonus"));
        AddValue(parts, skill.ward_bonus, "ward", true, Note(notes, "ward_bonus"));
        if (!invulnerable)
        {
            // Resists with the same amount and note read as one fragment, such as "+10 poison & disease res".
            var groups = new List<(List<string> Names, string Key, LinearValue Value)>();
            foreach (var (key, name) in Resists)
            {
                var value = ParseLinearValue(ResistValue(skill, key));
                if (value == null || value.base_value == 0)
                    continue;
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
                var label = names.Count == Resists.Length ? "all" : JoinAnd(names);
                parts.Add(Qualify(SignedValue(value, $"{label} res"), Note(notes, key)));
            }
        }

        // 5. Attack speed
        AddPercent(parts, skill.haste_bonus, "haste", true, Note(notes, "haste_bonus"));
        AddPercent(parts, skill.spell_haste_bonus, "spell casting haste", true, Note(notes, "spell_haste_bonus"));

        // 7. Hit/chance modifiers
        AddPercent(parts, skill.critical_chance_bonus, "crit", true, Note(notes, "critical_chance_bonus"));
        AddPercent(parts, skill.critical_resist_bonus, "critical resist", true, Note(notes, "critical_resist_bonus"));
        AddPercent(parts, skill.accuracy_bonus, "accuracy", true, Note(notes, "accuracy_bonus"));
        AddPercent(parts, skill.block_chance_bonus, "block", true, Note(notes, "block_chance_bonus"));
        AddPercent(
            parts,
            skill.fear_resist_chance_bonus,
            "fear resist",
            true,
            Note(notes, "fear_resist_chance_bonus"),
            skill.fear_resist_chance_bonus_cap > 0 ? $"max {FormatPercent(skill.fear_resist_chance_bonus_cap)}" : null);

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
                $"{FormatLinearValue(dmgShield)}{typeLabel} dmg shield{(debuff ? " on its target" : "")}",
                Note(notes, "damage_shield")));
        }

        // Source: server-scripts/Combat.cs:DealDamageAt — the victim's healOnHitPercent heals the attacker of a non-spell melee DamageSkill hit.
        var healOnHit = ParseLinearValue(skill.heal_on_hit_percent);
        if (healOnHit != null && healOnHit.base_value > 0)
            parts.Add($"melee hits on the target heal the attacker {FormatLinearPercent(healOnHit)} of dmg");

        // 10. Regen / DoT. A negative value ticks as damage on whoever wears the buff.
        var hps = ParseLinearValue(skill.healing_per_second_bonus);
        if (hps != null && hps.base_value != 0)
        {
            if (hps.base_value > 0)
                parts.Add(Qualify($"{FormatLinearValue(hps)} hp/s", Note(notes, "healing_per_second_bonus")));
            else
            {
                var formattedType = FormatDamageType(skill.damage_over_time_type);
                var typeLabel = formattedType.Length > 0 ? " " + formattedType : "";
                parts.Add(Qualify(
                    $"{(debuff ? "" : "wearer takes ")}{FormatLinearValue(Negated(hps))}{typeLabel} dmg/s",
                    Note(notes, "healing_per_second_bonus")));
            }
        }

        // Source: server-scripts/Skills.cs:1617-1623,1754-1755 — a negative healthPercentPerSecondBonus removes that share of maximum Health each second.
        var hpPct = ParseLinearValue(skill.health_percent_per_second_bonus);
        if (hpPct != null && hpPct.base_value != 0)
        {
            if (hpPct.base_value > 0)
                parts.Add(Qualify($"+{FormatLinearPercent(hpPct)} hp/s", Note(notes, "health_percent_per_second_bonus")));
            else
            {
                var share = FormatLinearPercent(Negated(hpPct));
                parts.Add(Qualify(
                    debuff ? $"{share} max hp dmg/s" : $"{share} max hp drain/s",
                    Note(notes, "health_percent_per_second_bonus")));
            }
        }

        var mps = ParseLinearValue(skill.mana_per_second_bonus);
        if (mps != null && mps.base_value != 0)
        {
            parts.Add(Qualify(
                mps.base_value > 0
                    ? $"{FormatLinearValue(mps)} mana/s"
                    : $"{FormatLinearValue(Negated(mps))} mana drain/s",
                Note(notes, "mana_per_second_bonus")));
        }

        AddPercent(parts, skill.mana_percent_per_second_bonus, "mana/s", true, Note(notes, "mana_percent_per_second_bonus"));
        AddValue(parts, skill.energy_per_second_bonus, "rage/s", true, Note(notes, "energy_per_second_bonus"));
        AddPercent(parts, skill.energy_percent_per_second_bonus, "rage/s", true, Note(notes, "energy_percent_per_second_bonus"));

        // 11. Primary stats
        AddValue(parts, skill.strength_bonus, "STR", true);
        AddValue(parts, skill.intelligence_bonus, "INT", true);
        AddValue(parts, skill.dexterity_bonus, "DEX", true);
        AddValue(parts, skill.constitution_bonus, "CON", true);
        AddValue(parts, skill.wisdom_bonus, "WIS", true);
        AddValue(parts, skill.charisma_bonus, "CHA", true);

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

    /// <summary>A signed amount with its qualifiers, when it is set (and nonzero at rank 1 when
    /// <paramref name="requireNonZeroBase"/>).</summary>
    private static void AddValue(
        List<string> parts,
        LinearValue raw,
        string label,
        bool requireNonZeroBase,
        params string[] qualifiers)
    {
        var value = ParseLinearValue(raw);
        if (value == null || (requireNonZeroBase && value.base_value == 0))
            return;
        parts.Add(Qualify(SignedValue(value, label), qualifiers));
    }

    private static void AddPercent(
        List<string> parts,
        LinearValue raw,
        string label,
        bool requireNonZeroBase,
        params string[] qualifiers)
    {
        var value = ParseLinearValue(raw);
        if (value == null || (requireNonZeroBase && value.base_value == 0))
            return;
        parts.Add(Qualify(SignedPercent(value, label), qualifiers));
    }

    private static string SignedValue(LinearValue value, string label) =>
        $"{(value.base_value > 0 ? "+" : "")}{FormatLinearValue(value)} {label}";

    private static string SignedPercent(LinearValue value, string label) =>
        $"{(value.base_value > 0 ? "+" : "")}{FormatLinearPercent(value)} {label}";

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

    /// <summary>"a", "a &amp; b" or "a, b &amp; c".</summary>
    private static string JoinAnd(List<string> items) =>
        items.Count > 1
            ? $"{string.Join(", ", items.GetRange(0, items.Count - 1))} & {items[items.Count - 1]}"
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
        return FormatSkillLevelFormula(new LinearValue(baseValue, bonusPerLevel), value => $"{FormatNumber(value)}s");
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

    /// <summary>Verbatim port of <c>HARDCODED_EFFECTS</c>: skills whose summary is a
    /// fixed string keyed by skill id (game-changers the generic formatter can't model).</summary>
    private static readonly Dictionary<string, string> HardcodedEffects = new()
    {
        ["improved_backstab"] = "from-behind bonus dmg 25% instead of 10%",
        ["bind_affinity"] = "set bind point (respawn & Gate Scroll destination)",
        ["binding"] = "set bind point (respawn & Gate Scroll destination)",
        ["elixir_endurance"] = "potion buff duration +60s × rank (not bandages)",
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
        ["master_poisoner"] = "Stab deals poison dmg & adds 250% of DEX, resisted by poison res, 10s",
        ["wild_strike"] = "next auto attack deals +10% × rank dmg as magic dmg, 5s",
        ["call_of_the_heroes"] = "teleport all active mercenaries to you, remove their fear",
        ["charge"] = "charge toward target, removes roots, +3.5 speed, +100% accuracy, +5% rage/s, 2s",
        ["teleport"] = "use travel items (out of combat)",
        ["razor_of_wrath"] = "+1% × rank attack power, scaled by current rage (full rage = full bonus)",
        ["arcane_edge"] = "+1% × rank spell power, scaled by current mana (full mana = full bonus)",
        ["divine_intervention"] = "grants invulnerability to nearby allies, 3s",
    };
}

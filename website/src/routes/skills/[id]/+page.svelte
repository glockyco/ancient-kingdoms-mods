<script lang="ts">
  import { base } from "$app/paths";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import EntityIcon from "$lib/components/EntityIcon.svelte";
  import PageSections from "$lib/components/PageSections.svelte";
  import * as Card from "$lib/components/ui/card";
  import type { PageData } from "./$types";
  import type { LinearValue } from "$lib/types/skills";
  import {
    formatLinearDuration as formatSkillLinearDuration,
    formatLinearPercent as formatSkillLinearPercent,
    formatLinearValueWithUnit,
    hasNonZeroField,
  } from "$lib/utils/formatSkillEffect";
  import * as Tabs from "$lib/components/ui/tabs";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import ImageIcon from "@lucide/svelte/icons/image";
  import Clock from "@lucide/svelte/icons/clock";
  import Zap from "@lucide/svelte/icons/zap";
  import Swords from "@lucide/svelte/icons/swords";
  import Heart from "@lucide/svelte/icons/heart";
  import Target from "@lucide/svelte/icons/target";
  import ScrollText from "@lucide/svelte/icons/scroll-text";
  import Gem from "@lucide/svelte/icons/gem";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import DungeonRestrictionBadge from "$lib/components/DungeonRestrictionBadge.svelte";
  import SkillEffect from "$lib/components/SkillEffect.svelte";
  import Calculation from "$lib/components/Calculation.svelte";
  import RoundingDefinition from "$lib/components/RoundingDefinition.svelte";
  import {
    bloodPactCalculation,
    channelCalculation,
    deathBloomCalculation,
  } from "$lib/skills/calculations";
  import {
    cadenceCalculation,
    charmDamageCalculation,
    damageCalculation,
    calculationCasters,
    calculationCasterLabel,
    damageStatInputs,
  } from "$lib/skills/damage-calculations";
  import {
    aggroCalculation,
    effectScalingCalculation,
    healingCalculation,
  } from "$lib/skills/effect-calculations";
  import {
    EXAMPLE_HIT,
    EXAMPLE_SCROLL_MASTERY,
    EXAMPLE_SHARED_HEALTH,
    EXAMPLE_SONG_BONUS,
    EXAMPLE_SONG_SECONDS,
    balancedHealth,
    drainMagnitude,
    executeTick,
    healOnHit,
    lifetapFromHit,
    lifetapWithBonus,
    passiveSongDuration,
    reaperDrain,
    scrollRank,
    songDuration,
    wildStrikeHit,
  } from "$lib/skills/worked-examples";
  import { mercenaryRank } from "$lib/calculation/mercenaries";
  import { DAMAGE, MAGIC_DAMAGE, MAX_HEALTH } from "$lib/calculation/inputs";
  import * as fmt from "$lib/calculation/format";
  import { spellInterval } from "$lib/calculation/combat";
  import MonsterTypeIcon from "$lib/components/MonsterTypeIcon.svelte";
  import Skull from "@lucide/svelte/icons/skull";
  import Cat from "@lucide/svelte/icons/cat";
  import Star from "@lucide/svelte/icons/star";
  import Ghost from "@lucide/svelte/icons/ghost";
  import TrendingUp from "@lucide/svelte/icons/trending-up";
  import FlaskConical from "@lucide/svelte/icons/flask-conical";
  import { petHref } from "$lib/utils/pets";
  import { formatEquipmentCategory, formatSkillType } from "$lib/utils/format";
  import { formatClassName } from "$lib/utils/classes";
  import Seo from "$lib/components/Seo.svelte";
  import { TRAP_TYPE_LABELS } from "$lib/constants/traps";

  let { data }: { data: PageData } = $props();

  const skill = $derived(data.skill);
  const skillIconSrc = $derived(
    data.visualAsset ? `${base}/${data.visualAsset.public_path}` : null,
  );
  const isWildStrike = $derived(skill.id === "wild_strike");
  const damageBlocks = $derived.by(() => {
    if (skill.is_bard_final_cadence) return [];
    return data.mechanicsSpec.damageContexts.flatMap((ctx) =>
      calculationCasters(
        ctx.casterLabels,
        ctx.formula === "manaburn" ? undefined : skill,
      ).map((casterLabel) => ({
        key: `${ctx.formula}:${casterLabel}`,
        casterLabel,
        kind: ctx.formula,
        stats: damageStatInputs(skill, ctx.formula),
        calculation: damageCalculation(skill, ctx, casterLabel),
      })),
    );
  });
  const damageStatNames = $derived(
    [DAMAGE, MAGIC_DAMAGE]
      .filter((stat) =>
        damageBlocks.some((block) =>
          block.calculation.inputs?.some((input) => input.key === stat.key),
        ),
      )
      .map((stat) => stat.label),
  );
  const losesVeteranPoints = $derived(
    skill.is_veteran && skill.required_skill_points > 1,
  );
  const isScrollTriggered = $derived(
    data.grantedByItems.some((item) => item.type === "scroll"),
  );
  const hasScrollMasteryScaling = $derived(
    isScrollTriggered && skill.max_level > 1,
  );
  const hasScrollDispelScaling = $derived(
    hasScrollMasteryScaling && skill.is_dispel,
  );

  // Source: server-scripts/ScrollItem.cs:125 — exact half-ranks round to even, so odd ranks require mastery above the half-rank threshold.
  function formatMasteryNeeded(rank: number): string {
    const percentage = rank <= 1 ? 0 : rank * 5 - 2.5;
    return `${rank > 1 && rank % 2 !== 0 ? "above " : ""}${percentage.toFixed(1)}%`;
  }

  function formatLinear(
    value: LinearValue | null,
    suffix: string = "",
  ): string {
    if (!value) return "-";
    return formatLinearValueWithUnit(value, suffix);
  }

  function formatLinearAbs(
    value: LinearValue | null,
    suffix: string = "",
  ): string {
    if (!value) return "-";
    return formatLinear(
      {
        base_value: Math.abs(value.base_value),
        bonus_per_level: Math.abs(value.bonus_per_level),
      },
      suffix,
    );
  }

  function formatLinearPercent(value: LinearValue | null): string {
    if (!value) return "-";
    return formatSkillLinearPercent(value, undefined);
  }

  function formatLinearPercentAbs(value: LinearValue | null): string {
    if (!value) return "-";
    return formatLinearPercent({
      base_value: Math.abs(value.base_value),
      bonus_per_level: Math.abs(value.bonus_per_level),
    });
  }

  function formatNumber(n: number): string {
    return n.toLocaleString();
  }

  function formatPercent(n: number): string {
    const pct = n * 100;
    return `${parseFloat(pct.toFixed(1))}%`;
  }

  function formatDuration(base: number, perLevel: number): string {
    if (base === 0 && perLevel === 0) return "-";
    return formatSkillLinearDuration(base, perLevel);
  }

  function hasLinearValue(value: LinearValue | null): boolean {
    if (!value) return false;
    return value.base_value !== 0 || value.bonus_per_level !== 0;
  }

  function isNegativeLinear(value: LinearValue | null): boolean {
    return !!value && value.base_value < 0;
  }

  function convertTooltip(text: string | null): string {
    if (!text) return "";
    return text
      .replace(/<color=(#[0-9A-Fa-f]{6})>/g, '<span style="color:$1">')
      .replace(/<\/color>/g, "</span>")
      .replace(/<pos=[^>]*>/g, "    ")
      .replace(
        /<\/?(?:size|align|line-height|pos|voffset|space|indent)[^>]*>/g,
        "",
      )
      .replace(/\n/g, "<br>");
  }

  const hasStatBonuses = $derived(
    skill.health_max_bonus ||
      skill.health_max_percent_bonus ||
      skill.mana_max_bonus ||
      skill.mana_max_percent_bonus ||
      skill.energy_max_bonus ||
      skill.defense_bonus ||
      skill.ward_bonus ||
      skill.magic_resist_bonus ||
      skill.damage_bonus ||
      skill.damage_percent_bonus ||
      skill.magic_damage_bonus ||
      skill.magic_damage_percent_bonus ||
      skill.haste_bonus ||
      skill.spell_haste_bonus ||
      skill.speed_bonus ||
      skill.critical_chance_bonus ||
      skill.critical_resist_bonus ||
      skill.accuracy_bonus ||
      skill.block_chance_bonus ||
      skill.fear_resist_chance_bonus ||
      skill.damage_shield ||
      skill.cooldown_reduction_percent ||
      skill.heal_on_hit_percent,
  );

  const hasRegenBonuses = $derived(
    skill.healing_per_second_bonus ||
      skill.health_percent_per_second_bonus ||
      skill.mana_per_second_bonus ||
      skill.mana_percent_per_second_bonus ||
      skill.energy_per_second_bonus ||
      skill.energy_percent_per_second_bonus,
  );

  const hasResistBonuses = $derived(
    skill.poison_resist_bonus ||
      skill.fire_resist_bonus ||
      skill.cold_resist_bonus ||
      skill.disease_resist_bonus,
  );

  const hasAttributeBonuses = $derived(
    skill.strength_bonus ||
      skill.intelligence_bonus ||
      skill.dexterity_bonus ||
      skill.constitution_bonus ||
      skill.wisdom_bonus ||
      skill.charisma_bonus,
  );

  // is_cleanse is excluded: cleanse description is in the effect summary,
  // and the card adds nothing unless the skill also has stat bonuses or other effects.
  // duration_base alone is not sufficient: some skills (e.g. master_poisoner,
  // detect_traps) have a duration but no displayable stat rows — their effect is
  // hardcoded by name in server scripts and described in the effect summary instead.
  const hasBuffEffects = $derived(
    hasStatBonuses ||
      hasRegenBonuses ||
      hasResistBonuses ||
      hasAttributeBonuses ||
      skill.is_invisibility ||
      skill.is_mana_shield ||
      skill.is_blindness ||
      skill.is_enrage ||
      skill.is_permanent ||
      skill.is_only_for_magic_classes,
  );

  const hasAnyBonuses = $derived(
    hasStatBonuses ||
      hasRegenBonuses ||
      hasResistBonuses ||
      hasAttributeBonuses,
  );

  // Fields that use the generic Buff bonus attribute. Bard songs instead scale
  // every eligible effect through their Charisma multiplier.
  const hasAttributeScaledBonuses = $derived(
    data.mechanicsSpec.buffContexts.some(
      (ctx) =>
        ctx.bonusAttrSource === "player_cha" ||
        ctx.bonusAttrSource === "merc_cha",
    ) ||
      hasNonZeroField(skill.health_max_bonus) ||
      hasNonZeroField(skill.defense_bonus) ||
      hasNonZeroField(skill.magic_resist_bonus) ||
      hasNonZeroField(skill.poison_resist_bonus) ||
      hasNonZeroField(skill.fire_resist_bonus) ||
      hasNonZeroField(skill.cold_resist_bonus) ||
      hasNonZeroField(skill.disease_resist_bonus) ||
      hasNonZeroField(skill.healing_per_second_bonus) ||
      hasNonZeroField(skill.damage_shield) ||
      hasNonZeroField(skill.ward_bonus) ||
      (skill.id === "leadership" &&
        (hasNonZeroField(skill.damage_bonus) ||
          hasNonZeroField(skill.magic_damage_bonus))),
  );

  const hasCrowdControl = $derived(
    hasLinearValue(skill.stun_chance) ||
      hasLinearValue(skill.fear_chance) ||
      hasLinearValue(skill.knockback_chance),
  );

  const hasDamage = $derived(
    skill.damage ||
      skill.damage_percent ||
      skill.aggro ||
      hasLinearValue(skill.lifetap_percent) ||
      skill.break_armor_prob > 0 ||
      skill.is_assassination_skill ||
      skill.is_manaburn_skill,
  );

  // Source: server-scripts/AreaDamageSkill.cs:93, TargetDamageSkill.cs — num2 only set when damage > 0
  // Aggro-only skills call DealDamageAt with amountDamage=0, so no damage formula applies
  const hasActualDamage = $derived(
    !!(
      skill.damage ||
      skill.damage_percent ||
      skill.is_manaburn_skill ||
      skill.is_assassination_skill
    ),
  );

  // "Weapon" means any melee weapon (StartsWith match) — not a meaningful restriction.
  // Source: server-scripts/ScriptableSkill.cs — CheckWeapon(), line 100
  const meaningfulWeapon = $derived(
    skill.required_weapon_category &&
      skill.required_weapon_category !== "Weapon",
  );

  const hasRequirements = $derived(
    skill.level_required > 1 ||
      skill.required_skill_points > 1 ||
      skill.required_spent_points > 0 ||
      skill.prerequisite_skill_id ||
      skill.prerequisite2_skill_id ||
      meaningfulWeapon,
  );

  // Level scaling table: columns for fields with non-zero bonus_per_level
  interface ScalingColumn {
    label: string;
    field: LinearValue;
    isPercent: boolean;
    suffix: string;
  }

  const SCALING_FIELDS: Array<{
    key: keyof typeof skill;
    label: string;
    isPercent: boolean;
    suffix: string;
  }> = [
    {
      key: "health_cost_percent",
      label: "Health cost %",
      isPercent: true,
      suffix: "",
    },
    {
      key: "mana_restored_percent",
      label: "Max Mana restored %",
      isPercent: true,
      suffix: "",
    },
    {
      key: "healing_percent",
      label: "Health-cost healing %",
      isPercent: true,
      suffix: "",
    },
    {
      key: "lifetap_healing_percent_bonus",
      label: "Lifetap healing bonus",
      isPercent: true,
      suffix: "",
    },
    {
      key: "damage_over_time_execute_bonus",
      label: "DoT execute bonus",
      isPercent: true,
      suffix: "",
    },
    { key: "damage", label: "Damage", isPercent: false, suffix: "" },
    {
      key: "damage_percent",
      label: "Damage %",
      isPercent: true,
      suffix: "",
    },
    { key: "mana_cost", label: "Mana Cost", isPercent: false, suffix: "" },
    {
      key: "energy_cost",
      label: "Rage Cost",
      isPercent: false,
      suffix: "",
    },
    { key: "cast_time", label: "Cast Time", isPercent: false, suffix: "s" },
    { key: "cooldown", label: "Cooldown", isPercent: false, suffix: "s" },
    { key: "cast_range", label: "Range", isPercent: false, suffix: "" },
    {
      key: "heals_health",
      label: "Heals Health",
      isPercent: false,
      suffix: "",
    },
    {
      key: "heals_mana",
      label: "Heals Mana",
      isPercent: false,
      suffix: "",
    },
    { key: "aggro", label: "Aggro", isPercent: false, suffix: "" },
    {
      key: "lifetap_percent",
      label: "Lifetap",
      isPercent: true,
      suffix: "",
    },
    {
      key: "stun_chance",
      label: "Stun Chance",
      isPercent: true,
      suffix: "",
    },
    {
      key: "stun_time",
      label: "Stun Duration",
      isPercent: false,
      suffix: "s",
    },
    {
      key: "fear_chance",
      label: "Fear Chance",
      isPercent: true,
      suffix: "",
    },
    {
      key: "fear_time",
      label: "Fear Duration",
      isPercent: false,
      suffix: "s",
    },
    {
      key: "knockback_chance",
      label: "Knockback",
      isPercent: true,
      suffix: "",
    },
    {
      key: "health_max_bonus",
      label: "Max Health",
      isPercent: false,
      suffix: "",
    },
    {
      key: "health_max_percent_bonus",
      label: "Max Health %",
      isPercent: true,
      suffix: "",
    },
    {
      key: "mana_max_bonus",
      label: "Max Mana",
      isPercent: false,
      suffix: "",
    },
    {
      key: "mana_max_percent_bonus",
      label: "Max Mana %",
      isPercent: true,
      suffix: "",
    },
    {
      key: "energy_max_bonus",
      label: "Max Rage",
      isPercent: false,
      suffix: "",
    },
    {
      key: "defense_bonus",
      label: "Defense",
      isPercent: false,
      suffix: "",
    },
    { key: "ward_bonus", label: "Ward", isPercent: false, suffix: "" },
    {
      key: "magic_resist_bonus",
      label: "Magic Resist",
      isPercent: false,
      suffix: "",
    },
    {
      key: "damage_bonus",
      label: "Damage",
      isPercent: false,
      suffix: "",
    },
    {
      key: "damage_percent_bonus",
      label: "Physical Damage %",
      isPercent: true,
      suffix: "",
    },
    {
      key: "magic_damage_bonus",
      label: "Magic Damage",
      isPercent: false,
      suffix: "",
    },
    {
      key: "magic_damage_percent_bonus",
      label: "Magic Damage %",
      isPercent: true,
      suffix: "",
    },
    {
      key: "haste_bonus",
      label: "Haste",
      isPercent: true,
      suffix: "",
    },
    {
      key: "spell_haste_bonus",
      label: "Spell Haste",
      isPercent: true,
      suffix: "",
    },
    {
      key: "speed_bonus",
      label: "Movement Speed",
      isPercent: false,
      suffix: "",
    },
    {
      key: "critical_chance_bonus",
      label: "Critical Chance",
      isPercent: true,
      suffix: "",
    },
    {
      key: "critical_resist_bonus",
      label: "Critical Resist",
      isPercent: true,
      suffix: "",
    },
    {
      key: "accuracy_bonus",
      label: "Accuracy",
      isPercent: true,
      suffix: "",
    },
    {
      key: "block_chance_bonus",
      label: "Block Chance",
      isPercent: true,
      suffix: "",
    },
    {
      key: "fear_resist_chance_bonus",
      label: "Fear Resist",
      isPercent: true,
      suffix: "",
    },
    {
      key: "damage_shield",
      label: "Damage Shield",
      isPercent: false,
      suffix: "",
    },
    {
      key: "cooldown_reduction_percent",
      label: "Cooldown Reduction",
      isPercent: true,
      suffix: "",
    },
    {
      key: "heal_on_hit_percent",
      label: "Heal on Hit",
      isPercent: true,
      suffix: "",
    },
    {
      key: "healing_per_second_bonus",
      label: "Health/sec",
      isPercent: false,
      suffix: "",
    },
    {
      key: "health_percent_per_second_bonus",
      label: "Health %/sec",
      isPercent: true,
      suffix: "",
    },
    {
      key: "mana_per_second_bonus",
      label: "Mana/sec",
      isPercent: false,
      suffix: "",
    },
    {
      key: "mana_percent_per_second_bonus",
      label: "Mana %/sec",
      isPercent: true,
      suffix: "",
    },
    {
      key: "energy_per_second_bonus",
      label: "Rage/sec",
      isPercent: false,
      suffix: "",
    },
    {
      key: "energy_percent_per_second_bonus",
      label: "Rage %/sec",
      isPercent: true,
      suffix: "",
    },
    {
      key: "strength_bonus",
      label: "Strength",
      isPercent: false,
      suffix: "",
    },
    {
      key: "intelligence_bonus",
      label: "Intelligence",
      isPercent: false,
      suffix: "",
    },
    {
      key: "dexterity_bonus",
      label: "Dexterity",
      isPercent: false,
      suffix: "",
    },
    {
      key: "constitution_bonus",
      label: "Constitution",
      isPercent: false,
      suffix: "",
    },
    {
      key: "wisdom_bonus",
      label: "Wisdom",
      isPercent: false,
      suffix: "",
    },
    {
      key: "charisma_bonus",
      label: "Charisma",
      isPercent: false,
      suffix: "",
    },
    {
      key: "poison_resist_bonus",
      label: "Poison Resist",
      isPercent: false,
      suffix: "",
    },
    {
      key: "fire_resist_bonus",
      label: "Fire Resist",
      isPercent: false,
      suffix: "",
    },
    {
      key: "cold_resist_bonus",
      label: "Cold Resist",
      isPercent: false,
      suffix: "",
    },
    {
      key: "disease_resist_bonus",
      label: "Disease Resist",
      isPercent: false,
      suffix: "",
    },
  ];

  const scalingColumns = $derived.by(() => {
    const cols: ScalingColumn[] = [];

    // Duration has its own format (not a LinearValue)
    if (!skill.is_necromancer_reaper_form && skill.duration_per_level > 0) {
      cols.push({
        label: "Duration",
        field: {
          base_value: skill.duration_base,
          bonus_per_level: skill.duration_per_level,
        },
        isPercent: false,
        suffix: "s",
      });
    }

    for (const def of SCALING_FIELDS) {
      const val = skill[def.key] as LinearValue | null;
      if (val && val.bonus_per_level !== 0) {
        const isNegativeRegen =
          def.key === "healing_per_second_bonus" ||
          def.key === "health_percent_per_second_bonus";
        const field =
          isNegativeRegen && val.base_value < 0
            ? {
                base_value: Math.abs(val.base_value),
                bonus_per_level: Math.abs(val.bonus_per_level),
              }
            : val;
        // Source: server-scripts/Skills.cs:1617-1623 — Reaper Form drains the caster's maximum Health each second.
        const label =
          def.key === "healing_per_second_bonus" && val.base_value < 0
            ? "Damage/sec"
            : def.key === "health_percent_per_second_bonus" &&
                val.base_value < 0
              ? skill.is_necromancer_reaper_form
                ? "Self Health drain %/sec"
                : "Damage %/sec"
              : def.label;

        cols.push({
          label,
          field,
          isPercent: def.isPercent,
          suffix: def.suffix,
        });
      }
    }

    return cols;
  });

  function computeScalingValue(col: ScalingColumn, level: number): string {
    const raw = col.field.base_value + col.field.bonus_per_level * (level - 1);
    if (col.isPercent) {
      return formatPercent(raw);
    }
    return `${formatNumber(raw)}${col.suffix}`;
  }

  const showLevelScaling = $derived(
    skill.max_level > 1 &&
      (scalingColumns.length > 0 || hasScrollMasteryScaling),
  );

  // Pet/mercenary usage flags for skill-level notes inside the mechanics card
  const usedByMercenary = $derived(data.usedByPets.some((p) => p.is_mercenary));
  const usedByBardMercenary = $derived(
    data.usedByPets.some((p) => p.is_mercenary && p.type_monster === "Bard"),
  );
  const usedByCompanion = $derived(
    data.usedByPets.some((p) => !p.is_mercenary && !p.is_familiar),
  );
  const usedByFamiliar = $derived(data.usedByPets.some((p) => p.is_familiar));

  // Source: server-scripts/Skills.cs:924-933 — player and mercenary spells subtract their spell-haste percentage of the cast time; monsters cast with 0 spell haste.
  const shortensCast = $derived(
    skill.is_spell &&
      !skill.is_scroll &&
      skill.channel_pulses === 0 &&
      (skill.cast_time?.base_value ?? 0) > 0 &&
      (skill.player_classes.length > 0 || usedByMercenary),
  );
  const timingModels = $derived(
    new Set(data.mechanicsSpec.timingContexts.map((ctx) => ctx.model)),
  );
  // Source: server-scripts/Skills.cs:1141-1169 — Haste shortens the cooldown of mercenary auto attacks, a companion's first non-spell skill and monster or NPC non-spell attacks.
  const hasteCooldownCasters = $derived(
    new Intl.ListFormat("en", { type: "conjunction" }).format(
      (
        [
          ["merc_auto", "mercenaries"],
          ["companion_auto", "companions"],
          ["monster", "monsters and NPCs"],
        ] as const
      )
        .filter(([model]) => timingModels.has(model))
        .map(([, casters]) => casters),
    ),
  );

  const isDamageType = $derived(
    skill.skill_type === "target_damage" ||
      skill.skill_type === "area_damage" ||
      skill.skill_type === "frontal_damage" ||
      skill.skill_type === "target_projectile" ||
      skill.skill_type === "frontal_projectiles",
  );

  const isHealType = $derived(
    skill.skill_type === "target_heal" || skill.skill_type === "area_heal",
  );

  const isBuffType = $derived(
    skill.skill_type === "target_buff" ||
      skill.skill_type === "area_buff" ||
      skill.skill_type === "passive",
  );

  const isDebuffType = $derived(
    skill.skill_type === "target_debuff" || skill.skill_type === "area_debuff",
  );

  // Source: server-scripts/Combat.cs:1534-1578 — melee debuffs resist with Defense, the others with their matching resistance.
  const debuffResistance = $derived(
    skill.is_melee_debuff
      ? "Defense"
      : skill.is_poison_debuff
        ? "Poison Resist"
        : skill.is_fire_debuff
          ? "Fire Resist"
          : skill.is_cold_debuff
            ? "Cold Resist"
            : skill.is_disease_debuff
              ? "Disease Resist"
              : skill.is_magic_debuff
                ? "Magic Resist"
                : null,
  );

  // showMechanics: true iff at least one inner mechanics section will actually render.
  // Mirrors the exact conditions of each inner section to avoid empty cards.
  // No isPlayerUsable dependency — monster-only skills are included when the spec
  // has computed contexts for them.
  const showMechanics = $derived(
    skill.is_necromancer_blood_pact ||
      skill.is_necromancer_death_bloom ||
      skill.is_necromancer_reaper_form ||
      skill.is_necromancer_pet_buff ||
      skill.also_buff_active_pet ||
      skill.channel_pulses > 0 ||
      hasNonZeroField(skill.lifetap_healing_percent_bonus) ||
      hasNonZeroField(skill.damage_over_time_execute_bonus) ||
      (skill.skill_type === "passive" &&
        skill.is_pet_skill &&
        hasNonZeroField(skill.health_max_percent_bonus)) ||
      skill.is_bard_song ||
      skill.is_bard_final_cadence ||
      skill.is_bard_virtuosity ||
      skill.additional_active_bard_songs > 0 ||
      skill.bard_song_duration_bonus_per_level > 0 ||
      // A. Damage formula + pipeline
      (isDamageType &&
        data.mechanicsSpec.damageContexts.length > 0 &&
        hasActualDamage) ||
      // Aggro-only skills still show their calculation and tooltip warning.
      (isDamageType &&
        (skill.aggro?.base_value ?? 0) > 0 &&
        (skill.player_classes.length > 0 ||
          usedByMercenary ||
          usedByCompanion)) ||
      // B. Heal formula
      (isHealType &&
        !skill.is_resurrect_skill &&
        data.mechanicsSpec.healContexts.length > 0) ||
      // C. Buff scaling (passives excluded: PassiveSkill.Apply is a no-op)
      (isBuffType &&
        skill.skill_type !== "passive" &&
        hasAttributeScaledBonuses &&
        data.mechanicsSpec.buffContexts.length > 0) ||
      // Mana shield and dispel have dedicated mechanics sections
      skill.is_mana_shield ||
      skill.is_dispel ||
      // D. Debuff scaling or cleanse resistance
      (isDebuffType &&
        (data.mechanicsSpec.debuffContexts.length > 0 ||
          skill.prob_ignore_cleanse != null)) ||
      // E2. Cleanse mechanics
      skill.is_cleanse ||
      skill.is_assassination_skill ||
      skill.id === "wild_strike" ||
      skill.id === "parry" ||
      hasScrollMasteryScaling ||
      skill.is_decrease_resists_skill ||
      // H. Fear mechanics section (stun has no mechanics card section)
      skill.is_teleport ||
      hasLinearValue(skill.fear_chance) ||
      !!skill.fear_resist_chance_bonus ||
      hasLinearValue(skill.block_chance_bonus) ||
      hasLinearValue(skill.accuracy_bonus) ||
      hasLinearValue(skill.critical_chance_bonus) ||
      hasLinearValue(skill.critical_resist_bonus) ||
      hasLinearValue(skill.lifetap_percent) ||
      skill.break_armor_prob > 0 ||
      hasLinearValue(skill.heal_on_hit_percent) ||
      hasLinearValue(skill.cooldown_reduction_percent) ||
      hasLinearValue(skill.damage_shield) ||
      skill.is_blindness,
  );

  // Jump list entries, in document order. Each predicate mirrors the {#if}
  // guarding the matching Card.Root, so the list never points at a section
  // this skill does not render.
  const sections = $derived(
    [
      {
        id: "appearance",
        label: "Appearance",
        show: Boolean(data.visualAsset),
      },
      {
        id: "description",
        label: "Description",
        show: Boolean(data.effectSummary || skill.tooltip_template),
      },
      { id: "requirements", label: "Requirements", show: hasRequirements },
      {
        id: "cost-timing",
        label: "Cost & Timing",
        show: Boolean(
          skill.mana_cost ||
          skill.energy_cost ||
          skill.cooldown ||
          skill.cast_time ||
          skill.cast_range,
        ),
      },
      { id: "damage", label: "Damage", show: hasDamage },
      {
        id: "healing",
        label: "Healing",
        show:
          (hasLinearValue(skill.heals_health) ||
            hasLinearValue(skill.heals_mana) ||
            skill.is_balance_health) &&
          !skill.is_resurrect_skill,
      },
      { id: "crowd-control", label: "Crowd Control", show: hasCrowdControl },
      {
        id: "summon-info",
        label: "Summon Info",
        show:
          skill.skill_type === "summon" ||
          skill.skill_type === "summon_monsters",
      },
      {
        id: "buff-debuff",
        label: "Buff/Debuff Effects",
        show: hasBuffEffects,
      },
      { id: "level-scaling", label: "Rank Scaling", show: showLevelScaling },
      { id: "mechanics", label: "Mechanics", show: showMechanics },
      {
        id: "granted-by-items",
        label: "Granted by Items",
        show: data.grantedByItems.length > 0,
      },
      {
        id: "learned-by-classes",
        label: "Learned by Classes",
        show: skill.player_classes.length > 0,
      },
      {
        id: "applied-by-traps",
        label: "Applied by Traps",
        show: data.appliedByTraps.length > 0,
      },
      {
        id: "used-by-pets",
        label: "Used by Pets",
        show: data.usedByPets.length > 0,
      },
      {
        id: "used-by-monsters",
        label: "Used by Monsters",
        show: data.usedByMonsters.length > 0,
      },
    ].filter((section) => section.show),
  );

  /**
   * How each damage type is mitigated and avoided, mirroring the game one row per type.
   *
   * `stat` is the stat that reduces the damage. Source: server-scripts/Combat.cs:844-861 — the
   * per-damage-type switch, each read multiplied by 0.0005.
   * `avoidance` is which roll can prevent the hit. Source: server-scripts/Combat.cs:654-661 —
   * Normal damage goes to GetProbResistMeleeDamage, every other type to its own GetProbResist*.
   *
   * Physical is the one type whose stat does double duty. `defense` reduces the damage at 0.0005
   * per point, and it also feeds the block roll at 0.0001 per point, because blockChance is
   * derived from it. Source: server-scripts/Combat.cs:307-319. Both physical formulas refer
   * to Defense.
   *
   * Stat names are looked up here and never assembled from a fragment. Appending "Resist" to a
   * damage type once produced `physicalResist`, which the game does not implement.
   */
  type DamageMechanics = {
    stat: string;
    avoidance: "block" | "resist";
  };

  const DAMAGE_MECHANICS: Record<string, DamageMechanics> = {
    Physical: { stat: "Defense", avoidance: "block" },
    Magic: { stat: "Magic Resist", avoidance: "resist" },
    Fire: { stat: "Fire Resist", avoidance: "resist" },
    Cold: { stat: "Cold Resist", avoidance: "resist" },
    Poison: { stat: "Poison Resist", avoidance: "resist" },
    Disease: { stat: "Disease Resist", avoidance: "resist" },
  };

  const damageMechanics = $derived.by((): DamageMechanics | null => {
    if (!isDamageType) return null;
    // The game's enum value is DamageType.Normal and "Physical" is only its exported spelling, so
    // a damage skill that declares no type is physical rather than untyped.
    if (!skill.damage_type) return DAMAGE_MECHANICS.Physical;
    // Unknown exported types render an explicit unmapped-rule warning.
    return DAMAGE_MECHANICS[skill.damage_type] ?? null;
  });
</script>

<Seo
  title={`${skill.name} - Ancient Kingdoms`}
  description={data.description}
  path={`/skills/${skill.id}`}
/>

<div class="container mx-auto p-8 space-y-6 max-w-5xl">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Skills", href: "/skills" },
      { label: skill.name },
    ]}
  />

  <!-- Header -->
  <div>
    <div class="flex items-center gap-3 flex-wrap">
      <h1 class="text-3xl font-bold">{skill.name}</h1>
      {#if skill.is_spell}
        <span
          class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
        >
          Spell
        </span>
      {/if}
      {#if skill.is_veteran}
        <span
          class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
        >
          Veteran
        </span>
      {/if}
      {#if skill.is_pet_skill}
        <span
          class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200"
        >
          Targets Pets
        </span>
      {/if}
      {#if skill.is_mercenary_skill}
        <span
          class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
        >
          Targets Mercenaries
        </span>
      {/if}
      {#if skill.followup_default_attack}
        <span
          class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
        >
          Weapon Strike
        </span>
      {/if}
      {#if skill.is_decrease_resists_skill}
        <span
          class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
        >
          Bypasses Debuff Immunity
        </span>
      {/if}
      {#if skill.is_teleport}
        <span
          class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
        >
          Teleport
        </span>
      {/if}

      <DungeonRestrictionBadge allowDungeon={skill.allow_dungeon} />
    </div>

    <div class="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
      {#if skill.player_classes.length > 0 && !skill.is_veteran}
        <span>
          {#if skill.base_skill}
            Base
          {:else if skill.tier === 0}
            Core
          {:else}
            Tier {skill.tier}
          {/if}
        </span>
      {/if}
      <span>Max Rank {skill.max_level}</span>
    </div>
  </div>

  <!-- Page Anchor Navigation -->
  <PageSections {sections} />

  <!-- Appearance -->
  {#if data.visualAsset}
    <Card.Root id="appearance" class="bg-muted/30">
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <ImageIcon class="h-5 w-5 text-purple-500" />
          Appearance
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="flex min-h-32 w-full items-center justify-center">
          <EntityIcon
            src={skillIconSrc}
            alt={`${skill.name} icon`}
            width={128}
            height={128}
            size={128}
            fallback={ImageIcon}
            class="max-h-40 max-w-full object-contain [image-rendering:pixelated]"
          />
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Effect / Game Tooltip -->
  {#if data.effectSummary || skill.tooltip_template}
    <Card.Root id="description" class="bg-muted/30">
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <ScrollText class="h-5 w-5 text-sky-500" />
          Description
        </Card.Title>
      </Card.Header>
      <Card.Content>
        {#if data.effectSummary && skill.tooltip_template}
          <Tabs.Root value="effect">
            <Tabs.List class="mb-4">
              <Tabs.Trigger value="effect">Effect</Tabs.Trigger>
              <Tabs.Trigger value="tooltip">Game Tooltip</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="effect">
              <dl
                class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4"
              >
                <div>
                  <dt class="text-muted-foreground">Skill Type</dt>
                  <dd class="font-medium">
                    {formatSkillType(skill.skill_type)}
                  </dd>
                </div>
                <div class="col-span-2 sm:col-span-3">
                  <dt class="text-muted-foreground">Effect</dt>
                  <dd class="font-medium">
                    <SkillEffect
                      effect={data.effectSummary}
                      entityName={skill.summoned_monster_name ?? skill.pet_name}
                      entityHref={skill.summoned_monster_id
                        ? `/monsters/${skill.summoned_monster_id}`
                        : skill.pet_id
                          ? petHref(skill.pet_id, skill.pet_is_mercenary)
                          : null}
                    />
                  </dd>
                </div>
              </dl>
            </Tabs.Content>
            <Tabs.Content value="tooltip">
              <p class="mb-3 text-sm text-muted-foreground">
                Rank 1. Base values before equipment and attribute bonuses.
              </p>
              <div class="text-sm whitespace-pre-wrap">
                <!-- eslint-disable-next-line svelte/no-at-html-tags -- Safe: Unity color tags from controlled data -->
                {@html convertTooltip(data.gameTooltip)}
              </div>
            </Tabs.Content>
          </Tabs.Root>
        {:else if data.effectSummary}
          <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <dt class="text-muted-foreground">Skill Type</dt>
              <dd class="font-medium">
                {formatSkillType(skill.skill_type)}
              </dd>
            </div>
            <div class="col-span-2 sm:col-span-3">
              <dt class="text-muted-foreground">Effect</dt>
              <dd class="font-medium">
                <SkillEffect
                  effect={data.effectSummary}
                  entityName={skill.summoned_monster_name ?? skill.pet_name}
                  entityHref={skill.summoned_monster_id
                    ? `/monsters/${skill.summoned_monster_id}`
                    : skill.pet_id
                      ? petHref(skill.pet_id, skill.pet_is_mercenary)
                      : null}
                />
              </dd>
            </div>
          </dl>
        {:else}
          <p class="mb-3 text-sm text-muted-foreground">
            Rank 1. Base values before equipment and attribute bonuses.
          </p>
          <div class="text-sm whitespace-pre-wrap">
            <!-- eslint-disable-next-line svelte/no-at-html-tags -- Safe: Unity color tags from controlled data -->
            {@html convertTooltip(data.gameTooltip)}
          </div>
        {/if}
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Requirements -->
  {#if hasRequirements}
    <Card.Root id="requirements" class="bg-muted/30">
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Target class="h-5 w-5 text-orange-500" />
          Requirements
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
          {#if skill.level_required > 1}
            <div>
              <dt class="text-muted-foreground">Level Required</dt>
              <dd class="font-medium">{skill.level_required}</dd>
            </div>
          {/if}
          {#if skill.required_skill_points > 1}
            <div>
              <dt class="text-muted-foreground">Skill Points</dt>
              <dd class="font-medium">{skill.required_skill_points}</dd>
            </div>
          {/if}
          {#if skill.required_spent_points > 0}
            <div>
              <dt class="text-muted-foreground">
                {skill.is_veteran
                  ? "Veteran Points Spent"
                  : "Skill Points Spent"}
              </dt>
              <dd class="font-medium">{skill.required_spent_points}</dd>
            </div>
          {/if}
          {#if skill.prerequisite_skill_id}
            <div>
              <dt class="text-muted-foreground">Prerequisite</dt>
              <dd class="font-medium">
                <a
                  href="/skills/{skill.prerequisite_skill_id}"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {skill.prerequisite_skill_name ?? skill.prerequisite_skill_id}
                </a>
                {#if skill.prerequisite_level > 0}
                  <span class="text-muted-foreground">
                    Rank {skill.prerequisite_level}
                  </span>
                {/if}
              </dd>
            </div>
          {/if}
          {#if skill.prerequisite2_skill_id}
            <div>
              <dt class="text-muted-foreground">Prerequisite 2</dt>
              <dd class="font-medium">
                <a
                  href="/skills/{skill.prerequisite2_skill_id}"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {skill.prerequisite2_skill_name ??
                    skill.prerequisite2_skill_id}
                </a>
                {#if skill.prerequisite2_level > 0}
                  <span class="text-muted-foreground">
                    Rank {skill.prerequisite2_level}
                  </span>
                {/if}
              </dd>
            </div>
          {/if}
          {#if meaningfulWeapon && skill.required_weapon_category}
            <div>
              <dt class="text-muted-foreground">Required Weapon</dt>
              <dd class="font-medium">
                {formatEquipmentCategory(skill.required_weapon_category)}
              </dd>
            </div>
          {/if}
        </dl>
        {#if losesVeteranPoints}
          <!-- Source: server-scripts/PlayerSkills.cs:1762-1772,1826-1866,2477-2480 — upgrade pays the authored cost, progression and reset sum one point per learned rank. -->
          <!-- Runtime verification: docs/game-bugs/two-point-veteran-skills-lose-points-and-progression.md -->
          <p
            class="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
          >
            Each rank costs {skill.required_skill_points} veteran points, but a game
            defect counts it as 1 point toward your Veteran Level and the next veteran
            point's experience cost. A token reset refunds 1 point per rank, so each
            reset loses {skill.required_skill_points - 1}
            {skill.required_skill_points - 1 === 1 ? "point" : "points"} per rank.
          </p>
        {/if}
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Cost & Timing -->
  {#if skill.is_bard_song || skill.mana_cost || skill.energy_cost || skill.cooldown || skill.cast_time || skill.cast_range}
    <Card.Root id="cost-timing" class="bg-muted/30">
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Clock class="h-5 w-5 text-blue-500" />
          Cost & Timing
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
          {#if skill.is_bard_song}
            <div>
              <dt class="text-muted-foreground">Song Slot Cost</dt>
              <dd class="font-medium">1</dd>
            </div>
          {/if}
          {#if skill.mana_cost && !skill.is_bard_song}
            <div>
              <dt class="text-muted-foreground">Mana Cost</dt>
              <dd class="font-medium">{formatLinear(skill.mana_cost)}</dd>
            </div>
          {/if}
          {#if skill.energy_cost}
            <div>
              <dt class="text-muted-foreground">Rage Cost</dt>
              <dd class="font-medium">{formatLinear(skill.energy_cost)}</dd>
            </div>
          {/if}
          {#if skill.cast_time}
            <div>
              <dt class="text-muted-foreground">Cast Time</dt>
              <dd class="font-medium">{formatLinear(skill.cast_time, "s")}</dd>
            </div>
          {/if}
          {#if skill.cooldown}
            <div>
              <dt class="text-muted-foreground">Cooldown</dt>
              <dd class="font-medium">{formatLinear(skill.cooldown, "s")}</dd>
            </div>
          {/if}
          {#if skill.cast_range}
            <div>
              <dt class="text-muted-foreground">Range</dt>
              <dd class="font-medium">
                {formatLinear(skill.cast_range, " yd")}
              </dd>
            </div>
          {/if}
        </dl>
        {#if shortensCast || timingModels.has("player_auto") || hasteCooldownCasters}
          <!-- Source: server-scripts/Skills.cs:924-933,1141-1169; Player.cs:3394-3431 — spell haste shortens casts, Haste shortens auto-attack waits and some cooldowns. -->
          <div class="mt-3 space-y-1 text-sm text-muted-foreground">
            {#if shortensCast && skill.cast_time}
              <p>
                <a
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                  href="/mechanics/combat#timing">Spell haste</a
                >
                shortens the cast by its percentage, so 20% spell haste turns the
                {fmt.formatSeconds(
                  fmt.atRank(skill.cast_time, skill.max_level),
                )} cast{fmt.scalesWithRank(skill.cast_time, skill.max_level)
                  ? ` at rank ${skill.max_level}`
                  : ""} into {fmt.formatSeconds(
                  spellInterval(
                    fmt.atRank(skill.cast_time, skill.max_level),
                    0.2,
                  ).casting,
                )}.
              </p>
            {/if}
            {#if timingModels.has("player_auto")}
              <p>
                <a
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                  href="/mechanics/combat#timing">Haste</a
                > shortens the wait between your auto attacks.
              </p>
            {/if}
            {#if hasteCooldownCasters}
              <p>
                <a
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                  href="/mechanics/combat#timing">Haste</a
                >
                shortens this skill's cooldown for {hasteCooldownCasters}.
              </p>
            {/if}
          </div>
        {/if}
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Damage -->
  {#if hasDamage}
    <Card.Root id="damage" class="bg-muted/30">
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Swords class="h-5 w-5 text-red-500" />
          Damage
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
          {#if skill.damage}
            <div>
              <dt class="text-muted-foreground">Damage</dt>
              <dd class="font-medium">
                {formatLinear(skill.damage)}
              </dd>
            </div>
          {/if}
          {#if skill.damage_percent}
            <div>
              <dt class="text-muted-foreground">Damage %</dt>
              <dd class="font-medium">
                {formatLinearPercent(skill.damage_percent)}
              </dd>
            </div>
          {/if}
          {#if skill.damage_type && skill.damage_type !== "Unknown"}
            <div>
              <dt class="text-muted-foreground">Damage Type</dt>
              <dd class="font-medium">{skill.damage_type}</dd>
            </div>
          {/if}
          {#if skill.damage_over_time_type && skill.damage_over_time_type !== "Unknown"}
            <div>
              <dt class="text-muted-foreground">Damage-over-Time Type</dt>
              <dd class="font-medium">{skill.damage_over_time_type}</dd>
            </div>
          {/if}
          {#if skill.damage_shield_type && skill.damage_shield_type !== "Unknown"}
            <div>
              <dt class="text-muted-foreground">Damage Shield Type</dt>
              <dd class="font-medium">{skill.damage_shield_type}</dd>
            </div>
          {/if}
          {#if hasLinearValue(skill.lifetap_percent)}
            <div>
              <dt class="text-muted-foreground">Lifetap</dt>
              <dd class="font-medium">
                {formatLinearPercent(skill.lifetap_percent)}
              </dd>
            </div>
          {/if}
          {#if skill.aggro}
            <div>
              <dt class="text-muted-foreground">Aggro</dt>
              <dd class="font-medium">{formatLinear(skill.aggro)}</dd>
            </div>
          {/if}
          {#if skill.break_armor_prob > 0}
            <div>
              <dt class="text-muted-foreground">Break Armor</dt>
              <dd class="font-medium">
                {formatPercent(skill.break_armor_prob)}
              </dd>
            </div>
          {/if}
        </dl>
        {#if skill.is_assassination_skill || skill.is_manaburn_skill}
          <div class="mt-3 space-y-1 text-sm">
            {#if skill.is_assassination_skill}
              <p class="text-amber-600 dark:text-amber-400">
                Assassination requires the target to have less than 25% health.
              </p>
            {/if}
            {#if skill.is_manaburn_skill}
              <!-- Source: server-scripts/TargetDamageSkill.cs:132-160, TargetProjectileSkill.cs:211-220 — Rageblow spends all rage for double damage; Mana Burn spends all mana for triple damage. -->
              <p class="text-purple-600 dark:text-purple-400">
                {skill.skill_type === "target_projectile"
                  ? "Mana Burn spends all your mana to deal three times that amount as damage."
                  : "Rageblow spends all your rage to deal twice that amount as damage."}
              </p>
            {/if}
          </div>
        {/if}
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Healing -->
  {#if (hasLinearValue(skill.heals_health) || hasLinearValue(skill.heals_mana) || skill.is_balance_health) && !skill.is_resurrect_skill}
    <Card.Root id="healing" class="bg-muted/30">
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Heart class="h-5 w-5 text-green-500" />
          Healing
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
          {#if skill.heals_health}
            <div>
              <dt class="text-muted-foreground">Heals Health</dt>
              <dd class="font-medium">
                {formatLinear(skill.heals_health)}
              </dd>
            </div>
          {/if}
          {#if skill.heals_mana}
            <div>
              <dt class="text-muted-foreground">Heals Mana</dt>
              <dd class="font-medium">
                {formatLinear(skill.heals_mana)}
              </dd>
            </div>
          {/if}
          {#if skill.can_heal_self || skill.can_heal_others}
            <div>
              <dt class="text-muted-foreground">Target</dt>
              <dd class="font-medium">
                {#if skill.can_heal_self && skill.can_heal_others}
                  Self & Others
                {:else if skill.can_heal_self}
                  Self Only
                {:else}
                  Others Only
                {/if}
              </dd>
            </div>
          {/if}
        </dl>
        {#if skill.is_balance_health}
          <div class="mt-3 space-y-1 text-sm">
            <p class="text-green-600 dark:text-green-400">
              Sets each group member's health to the same percentage.
            </p>
          </div>
        {/if}
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Crowd Control -->
  {#if hasCrowdControl}
    <Card.Root id="crowd-control" class="bg-muted/30">
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Zap class="h-5 w-5 text-yellow-500" />
          Crowd Control
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
          {#if hasLinearValue(skill.stun_chance)}
            <div>
              <dt class="text-muted-foreground">Stun Chance</dt>
              <dd class="font-medium">
                {formatLinearPercent(skill.stun_chance)}
              </dd>
            </div>
            {#if hasLinearValue(skill.stun_time)}
              <div>
                <dt class="text-muted-foreground">Stun Duration</dt>
                <dd class="font-medium">
                  {formatLinear(skill.stun_time, "s")}
                </dd>
              </div>
            {/if}
          {/if}
          {#if hasLinearValue(skill.fear_chance)}
            <div>
              <dt class="text-muted-foreground">Fear Chance</dt>
              <dd class="font-medium">
                {formatLinearPercent(skill.fear_chance)}
              </dd>
            </div>
            {#if hasLinearValue(skill.fear_time)}
              <div>
                <dt class="text-muted-foreground">Fear Duration</dt>
                <dd class="font-medium">
                  {formatLinear(skill.fear_time, "s")}
                </dd>
              </div>
            {/if}
          {/if}
          {#if hasLinearValue(skill.knockback_chance)}
            <div>
              <dt class="text-muted-foreground">Knockback Chance</dt>
              <dd class="font-medium">
                {formatLinearPercent(skill.knockback_chance)}
              </dd>
            </div>
          {/if}
        </dl>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Summon Info -->
  {#if skill.skill_type === "summon" || skill.skill_type === "summon_monsters"}
    <Card.Root id="summon-info" class="bg-muted/30">
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Ghost class="h-5 w-5 text-violet-500" />
          Summon Info
        </Card.Title>
      </Card.Header>
      <Card.Content>
        {#if skill.skill_type === "summon_monsters" && skill.summon_count_per_cast === 0}
          <p class="text-sm font-medium">
            Teleports the target to the character using this skill and stuns the
            target for 2 seconds.
          </p>
        {:else if skill.skill_type === "summon_monsters" && skill.summoned_monster_id}
          <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <dt class="text-muted-foreground">Summons</dt>
              <dd class="font-medium">
                <a
                  href="/monsters/{skill.summoned_monster_id}"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {skill.summoned_monster_name ?? skill.summoned_monster_id}
                </a>
              </dd>
            </div>
            {#if skill.summoned_monster_level}
              <div>
                <dt class="text-muted-foreground">Level</dt>
                <dd class="font-medium">{skill.summoned_monster_level}</dd>
              </div>
            {/if}
            <div>
              <dt class="text-muted-foreground">Count per Cast</dt>
              <dd class="font-medium">
                {#if skill.summon_count_per_cast === -1}
                  1 per player/mercenary
                {:else}
                  {skill.summon_count_per_cast}
                {/if}
              </dd>
            </div>
            {#if skill.max_active_summons}
              <div>
                <dt class="text-muted-foreground">Max Active</dt>
                <dd class="font-medium">{skill.max_active_summons}</dd>
              </div>
            {/if}
          </dl>
        {:else if skill.skill_type === "summon"}
          <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <dt class="text-muted-foreground">Summons</dt>
              <dd class="font-medium">
                {#if skill.pet_id}
                  <a
                    href={petHref(skill.pet_id, skill.pet_is_mercenary)}
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {skill.pet_name ?? skill.pet_prefab_name}
                  </a>
                {:else}
                  {skill.pet_prefab_name}
                {/if}
              </dd>
            </div>
            {#if skill.is_familiar}
              <div>
                <dt class="text-muted-foreground">Type</dt>
                <dd class="font-medium">Familiar</dd>
              </div>
            {/if}
          </dl>
          {#if skill.player_classes.includes("necromancer") && !skill.is_familiar}
            <!-- Source: server-scripts/SummonSkill.cs:UsesPetAttackCommand,56,106-113 — a different Necromancer combat-pet summon replaces the active pet; matching the active pet gives the attack command. -->
            <p class="mt-3 text-muted-foreground">
              Summoning a different companion replaces your current pet. Using
              this summon while its pet is active commands that pet to attack
              your target instead.
            </p>
          {/if}
        {/if}
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Buff/Debuff Effects -->
  {#if hasBuffEffects}
    <Card.Root id="buff-debuff" class="bg-muted/30">
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Sparkles class="h-5 w-5 text-purple-500" />
          Buff/Debuff Effects
        </Card.Title>
      </Card.Header>
      <Card.Content class="space-y-4">
        {#if hasAnyBonuses}
          <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
            <!-- 1. Duration -->
            {#if !skill.is_necromancer_reaper_form && (skill.duration_base > 0 || skill.duration_per_level > 0)}
              <div>
                <dt class="text-muted-foreground">Duration</dt>
                <dd class="font-medium">
                  {formatDuration(
                    skill.duration_base,
                    skill.duration_per_level,
                  )}
                </dd>
              </div>
            {/if}
            {#if skill.buff_category}
              <div>
                <dt class="text-muted-foreground">Overwrite Group</dt>
                <dd class="font-medium">{skill.buff_category}</dd>
              </div>
            {/if}
            <!-- 2. Resource pools -->
            {#if skill.health_max_bonus}
              <div>
                <dt class="text-muted-foreground">Max Health</dt>
                <dd class="font-medium">
                  {formatLinear(skill.health_max_bonus)}
                </dd>
              </div>
            {/if}
            {#if skill.health_max_percent_bonus}
              <div>
                <dt class="text-muted-foreground">Max Health %</dt>
                <dd class="font-medium">
                  {formatLinearPercent(skill.health_max_percent_bonus)}
                </dd>
              </div>
            {/if}
            {#if skill.mana_max_bonus}
              <div>
                <dt class="text-muted-foreground">Max Mana</dt>
                <dd class="font-medium">
                  {formatLinear(skill.mana_max_bonus)}
                </dd>
              </div>
            {/if}
            {#if skill.mana_max_percent_bonus}
              <div>
                <dt class="text-muted-foreground">Max Mana %</dt>
                <dd class="font-medium">
                  {formatLinearPercent(skill.mana_max_percent_bonus)}
                </dd>
              </div>
            {/if}
            {#if skill.energy_max_bonus}
              <div>
                <dt class="text-muted-foreground">Max Rage</dt>
                <dd class="font-medium">
                  {formatLinear(skill.energy_max_bonus)}
                </dd>
              </div>
            {/if}
            <!-- 2. Movement -->
            {#if skill.speed_bonus}
              <div>
                <dt class="text-muted-foreground">Movement Speed</dt>
                <dd class="font-medium">
                  {formatLinear(skill.speed_bonus)}
                </dd>
              </div>
            {/if}
            <!-- 3. Offense -->
            {#if skill.damage_bonus}
              <div>
                <dt class="text-muted-foreground">Damage</dt>
                <dd class="font-medium">{formatLinear(skill.damage_bonus)}</dd>
              </div>
            {/if}
            {#if skill.damage_percent_bonus}
              <div>
                <dt class="text-muted-foreground">Physical Damage %</dt>
                <dd class="font-medium">
                  {formatLinearPercent(skill.damage_percent_bonus)}
                </dd>
              </div>
            {/if}
            {#if skill.magic_damage_bonus}
              <div>
                <dt class="text-muted-foreground">Magic Damage</dt>
                <dd class="font-medium">
                  {formatLinear(skill.magic_damage_bonus)}
                </dd>
              </div>
            {/if}
            {#if skill.magic_damage_percent_bonus}
              <div>
                <dt class="text-muted-foreground">Magic Damage %</dt>
                <dd class="font-medium">
                  {formatLinearPercent(skill.magic_damage_percent_bonus)}
                </dd>
              </div>
            {/if}
            <!-- 4. Defense (mitigation grouped together) -->
            {#if skill.defense_bonus}
              <div>
                <dt class="text-muted-foreground">Defense</dt>
                <dd class="font-medium">{formatLinear(skill.defense_bonus)}</dd>
              </div>
            {/if}
            {#if skill.ward_bonus}
              <div>
                <dt class="text-muted-foreground">Ward</dt>
                <dd class="font-medium">{formatLinear(skill.ward_bonus)}</dd>
              </div>
            {/if}
            {#if skill.magic_resist_bonus}
              <div>
                <dt class="text-muted-foreground">Magic Resist</dt>
                <dd class="font-medium">
                  {formatLinear(skill.magic_resist_bonus)}
                </dd>
              </div>
            {/if}
            {#if skill.poison_resist_bonus}
              <div>
                <dt class="text-muted-foreground">Poison Resist</dt>
                <dd class="font-medium">
                  {formatLinear(skill.poison_resist_bonus)}
                </dd>
              </div>
            {/if}
            {#if skill.fire_resist_bonus}
              <div>
                <dt class="text-muted-foreground">Fire Resist</dt>
                <dd class="font-medium">
                  {formatLinear(skill.fire_resist_bonus)}
                </dd>
              </div>
            {/if}
            {#if skill.cold_resist_bonus}
              <div>
                <dt class="text-muted-foreground">Cold Resist</dt>
                <dd class="font-medium">
                  {formatLinear(skill.cold_resist_bonus)}
                </dd>
              </div>
            {/if}
            {#if skill.disease_resist_bonus}
              <div>
                <dt class="text-muted-foreground">Disease Resist</dt>
                <dd class="font-medium">
                  {formatLinear(skill.disease_resist_bonus)}
                </dd>
              </div>
            {/if}
            <!-- 5. Attack speed -->
            {#if skill.haste_bonus}
              <div>
                <dt class="text-muted-foreground">Haste</dt>
                <dd class="font-medium">
                  {formatLinearPercent(skill.haste_bonus)}
                </dd>
              </div>
            {/if}
            {#if skill.spell_haste_bonus}
              <div>
                <dt class="text-muted-foreground">Spell Haste</dt>
                <dd class="font-medium">
                  {formatLinearPercent(skill.spell_haste_bonus)}
                </dd>
              </div>
            {/if}
            <!-- 6. Hit/chance modifiers -->
            {#if skill.critical_chance_bonus}
              <div>
                <dt class="text-muted-foreground">Critical Chance</dt>
                <dd class="font-medium">
                  {formatLinearPercent(skill.critical_chance_bonus)}
                </dd>
              </div>
            {/if}
            {#if skill.critical_resist_bonus}
              <div>
                <dt class="text-muted-foreground">Critical Resist</dt>
                <dd class="font-medium">
                  {formatLinearPercent(skill.critical_resist_bonus)}
                </dd>
              </div>
            {/if}
            {#if skill.accuracy_bonus}
              <div>
                <dt class="text-muted-foreground">Accuracy</dt>
                <dd class="font-medium">
                  {formatLinearPercent(skill.accuracy_bonus)}
                </dd>
              </div>
            {/if}
            {#if skill.block_chance_bonus}
              <div>
                <dt class="text-muted-foreground">Block Chance</dt>
                <dd class="font-medium">
                  {formatLinearPercent(skill.block_chance_bonus)}
                </dd>
              </div>
            {/if}
            {#if skill.fear_resist_chance_bonus}
              <div>
                <dt class="text-muted-foreground">Fear Resist</dt>
                <dd class="font-medium">
                  {formatLinearPercent(skill.fear_resist_chance_bonus)}
                  {#if skill.fear_resist_chance_bonus_cap > 0}
                    (max {formatPercent(skill.fear_resist_chance_bonus_cap)})
                  {/if}
                </dd>
              </div>
            {/if}
            <!-- 8. Cooldown reduction -->
            {#if skill.cooldown_reduction_percent}
              <div>
                <dt class="text-muted-foreground">Cooldown Reduction</dt>
                <dd class="font-medium">
                  {formatLinearPercent(skill.cooldown_reduction_percent)}
                </dd>
              </div>
            {/if}
            <!-- 9. On-hit proc effects -->
            {#if skill.damage_shield}
              <div>
                <dt class="text-muted-foreground">Damage Shield</dt>
                <dd class="font-medium">{formatLinear(skill.damage_shield)}</dd>
              </div>
            {/if}
            {#if skill.heal_on_hit_percent}
              <div>
                <dt class="text-muted-foreground">Heal on Hit</dt>
                <dd class="font-medium">
                  {formatLinearPercent(skill.heal_on_hit_percent)}
                </dd>
              </div>
            {/if}
            <!-- 10. Regen / DoT -->
            {#if skill.healing_per_second_bonus}
              <div>
                <dt class="text-muted-foreground">
                  {isNegativeLinear(skill.healing_per_second_bonus)
                    ? "Damage/sec"
                    : "Health/sec"}
                </dt>
                <dd class="font-medium">
                  {formatLinearAbs(skill.healing_per_second_bonus)}
                </dd>
              </div>
            {/if}
            {#if skill.health_percent_per_second_bonus}
              <div>
                <!-- Source: server-scripts/Skills.cs:1617-1623 — Reaper Form drains the caster's maximum Health each second. -->
                <dt class="text-muted-foreground">
                  {skill.is_necromancer_reaper_form
                    ? "Self Health drain %/sec"
                    : isNegativeLinear(skill.health_percent_per_second_bonus)
                      ? "Damage %/sec"
                      : "Health %/sec"}
                </dt>
                <dd class="font-medium">
                  {formatLinearPercentAbs(
                    skill.health_percent_per_second_bonus,
                  )}
                </dd>
              </div>
            {/if}
            {#if skill.mana_per_second_bonus}
              <div>
                <dt class="text-muted-foreground">Mana/sec</dt>
                <dd class="font-medium">
                  {formatLinear(skill.mana_per_second_bonus)}
                </dd>
              </div>
            {/if}
            {#if skill.mana_percent_per_second_bonus}
              <div>
                <dt class="text-muted-foreground">Mana %/sec</dt>
                <dd class="font-medium">
                  {formatLinearPercent(skill.mana_percent_per_second_bonus)}
                </dd>
              </div>
            {/if}
            {#if skill.energy_per_second_bonus}
              <div>
                <dt class="text-muted-foreground">Rage/sec</dt>
                <dd class="font-medium">
                  {formatLinear(skill.energy_per_second_bonus)}
                </dd>
              </div>
            {/if}
            {#if skill.energy_percent_per_second_bonus}
              <div>
                <dt class="text-muted-foreground">Rage %/sec</dt>
                <dd class="font-medium">
                  {formatLinearPercent(skill.energy_percent_per_second_bonus)}
                </dd>
              </div>
            {/if}
            <!-- 11. Primary stats -->
            {#if skill.strength_bonus}
              <div>
                <dt class="text-muted-foreground">Strength</dt>
                <dd class="font-medium">
                  {formatLinear(skill.strength_bonus)}
                </dd>
              </div>
            {/if}
            {#if skill.intelligence_bonus}
              <div>
                <dt class="text-muted-foreground">Intelligence</dt>
                <dd class="font-medium">
                  {formatLinear(skill.intelligence_bonus)}
                </dd>
              </div>
            {/if}
            {#if skill.dexterity_bonus}
              <div>
                <dt class="text-muted-foreground">Dexterity</dt>
                <dd class="font-medium">
                  {formatLinear(skill.dexterity_bonus)}
                </dd>
              </div>
            {/if}
            {#if skill.constitution_bonus}
              <div>
                <dt class="text-muted-foreground">Constitution</dt>
                <dd class="font-medium">
                  {formatLinear(skill.constitution_bonus)}
                </dd>
              </div>
            {/if}
            {#if skill.wisdom_bonus}
              <div>
                <dt class="text-muted-foreground">Wisdom</dt>
                <dd class="font-medium">{formatLinear(skill.wisdom_bonus)}</dd>
              </div>
            {/if}
            {#if skill.charisma_bonus}
              <div>
                <dt class="text-muted-foreground">Charisma</dt>
                <dd class="font-medium">
                  {formatLinear(skill.charisma_bonus)}
                </dd>
              </div>
            {/if}
          </dl>
        {/if}

        <!-- Special Flags -->
        {#if skill.is_invisibility || skill.is_mana_shield || skill.is_blindness || skill.is_enrage || skill.is_permanent}
          <div class="space-y-1 text-sm">
            {#if skill.is_enrage}
              <p class="text-red-600 dark:text-red-400">
                Enraged monsters with less than 10% health deal 50–75% more
                damage with non-spell skills.
              </p>
            {/if}
            {#if skill.is_invisibility}
              <!-- Source: server-scripts/Entity.cs:363-379 — invisibility that ignores detection hides the target from every observer; ordinary invisibility yields to a monster that sees invisibility. -->
              <!-- Source: server-scripts/Skills.cs:1012, server-scripts/UsableItem.cs:53 — casting a skill or using an item ends invisibility. -->
              <p class="text-purple-600 dark:text-purple-400">
                <span class="block"
                  >Grants invisibility{#if skill.ignores_see_invisibility}, even
                    against monsters that can see invisible targets{/if}.</span
                >
                <span class="block"
                  >Casting a skill or using an item ends invisibility.</span
                >
              </p>
            {/if}
            {#if skill.is_mana_shield}
              <p class="text-blue-600 dark:text-blue-400">
                Mana Shield uses mana to absorb incoming damage.
              </p>
            {/if}

            {#if skill.is_blindness}
              <p class="text-amber-600 dark:text-amber-400">
                Blinds the target.
              </p>
            {/if}
            {#if skill.is_permanent && !skill.is_necromancer_reaper_form}
              <p class="text-muted-foreground">
                The game hides the timer, but the effect still has a duration.
              </p>
            {/if}
          </div>
        {/if}
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Level Scaling Table -->
  {#if showLevelScaling}
    <Card.Root id="level-scaling" class="bg-muted/30">
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <TrendingUp class="h-5 w-5 text-emerald-500" />
          Rank Scaling
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="overflow-x-auto">
          <table class="w-full text-sm table-fixed">
            <thead>
              <tr class="border-b">
                <th
                  class="py-2 pr-4 text-left font-medium text-muted-foreground"
                  >Rank</th
                >
                {#if hasScrollMasteryScaling}
                  <th
                    class="py-2 px-3 font-medium text-muted-foreground text-right"
                    >Scroll Mastery Needed</th
                  >
                {/if}
                {#each scalingColumns as col (col.label)}
                  <th
                    class="py-2 px-3 font-medium text-muted-foreground text-right"
                    >{col.label}</th
                  >
                {/each}
                {#if hasScrollDispelScaling}
                  <th
                    class="py-2 px-3 font-medium text-muted-foreground text-right"
                    >Dispel Resist Reduction</th
                  >
                {/if}
              </tr>
            </thead>
            <tbody>
              {#each Array.from({ length: skill.max_level }, (_, i) => i + 1) as level (level)}
                <tr class="border-b border-border/50 even:bg-muted/40">
                  <td class="py-1.5 pr-4 font-medium">{level}</td>
                  {#if hasScrollMasteryScaling}
                    <td class="py-1.5 px-3 text-right text-muted-foreground"
                      >{formatMasteryNeeded(level)}</td
                    >
                  {/if}
                  {#each scalingColumns as col (col.label)}
                    <td class="py-1.5 px-3 text-right"
                      >{computeScalingValue(col, level)}</td
                    >
                  {/each}
                  {#if hasScrollDispelScaling}
                    <td class="py-1.5 px-3 text-right"
                      >{level} percentage points</td
                    >
                  {/if}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Mechanics (Theorycrafter Reference) -->
  {#if showMechanics}
    <Card.Root id="mechanics" class="bg-muted/30">
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <FlaskConical class="h-5 w-5 text-cyan-500" />
          Mechanics
        </Card.Title>
      </Card.Header>
      <Card.Content class="space-y-6 text-sm">
        {#if skill.is_necromancer_blood_pact}
          <!-- Source: server-scripts/NecromancerBloodPactSkill.cs:CanConvert,Apply — both amounts must be positive, Mana below maximum and current Health above the cost; the full Health cost is paid when the Mana gain is capped. -->
          <div class="space-y-3">
            <h3 class="font-semibold">Blood Pact</h3>
            <Calculation calculation={bloodPactCalculation(skill)} />
            <p class="text-muted-foreground">
              You can use it only while your Mana is below maximum, your current
              Health is above the Health spent and both amounts are above 0. You
              pay the full Health cost even when the Mana restored is capped.
            </p>
          </div>
        {/if}

        {#if skill.is_necromancer_death_bloom}
          <div class="space-y-3">
            <h3 class="font-semibold">Death Bloom</h3>
            <Calculation calculation={deathBloomCalculation(skill)} />
            <!-- Source: server-scripts/NecromancerDeathBloomSkill.cs:GetIntelligenceBonus,GetHealingAmount — Max(0, intelligence.value) feeds the heal, and the override adds no Wisdom bonus. -->
            <p class="text-muted-foreground">
              Negative Intelligence counts as 0. Wisdom does not increase this
              heal.
            </p>
            <!-- Source: server-scripts/NecromancerDeathBloomSkill.cs:CheckSelf,CorrectedTarget,Apply; server-scripts/TargetHealSkill.cs:125-132 — another living Player or non-familiar Pet within cast range; current Health must exceed the cost, which is paid in full. -->
            <p class="text-muted-foreground">
              Targets another living player or a non-familiar pet, including
              mercenaries and other players' companions, within {formatLinear(
                skill.cast_range,
                " yd",
              )}. It cannot target you, familiars, monsters or NPCs. Your
              current Health must be above the Health spent. You pay the full
              cost even if the target is already at maximum Health.
            </p>
            <!-- Source: server-scripts/TargetHealSkill.cs:272-280 — canHealOthers uses caster criticalChance; critical healing multiplies by 3 when the second random roll exceeds 0.9, otherwise 2. -->
            <p class="text-muted-foreground">
              Your critical chance applies to this heal. Critical heals restore
              double Health, or triple Health in 10% of cases. Healing is capped
              by the target's missing Health.
            </p>
          </div>
        {/if}

        {#if skill.is_necromancer_reaper_form}
          <!-- Source: server-scripts/NecromancerReaperFormSkill.cs:15-26; server-scripts/Buff.cs:347-355 — applying an active form removes it and its timer stays positive while active. -->
          <div class="space-y-2">
            <h3 class="font-semibold">Reaper Form</h3>
            <p class="text-muted-foreground">The form has no time limit.</p>
            <!-- Source: server-scripts/Skills.cs:ApplyDamageOverTimeBonuses — an active NecromancerReaperFormSkill buff multiplies the caster's debuff ticks on others by 1 + its magicDamagePercentBonus. -->
            <p class="text-muted-foreground">
              While the form is active, your magic damage gains {formatLinearPercent(
                skill.magic_damage_percent_bonus,
              )}, and your damage-over-time ticks on other targets gain the same
              {formatLinearPercent(skill.magic_damage_percent_bonus)}. Lifetap
              healing grows with the damage it is based on.
            </p>
            {#if skill.health_percent_per_second_bonus}
              {@const drain = drainMagnitude(
                skill.health_percent_per_second_bonus,
              )}
              <!-- Source: server-scripts/Skills.cs:1617-1623 — NecromancerReaperFormSkill drains RoundToInt(max(0, -healthPercentPerSecondBonus) × health.max) before ordinary DoT mitigation. -->
              <p class="text-muted-foreground">
                Each second, the form drains {fmt.formatPercent(
                  fmt.atRank(drain, skill.max_level),
                )} of your maximum Health{fmt.scalesWithRank(
                  drain,
                  skill.max_level,
                )
                  ? ` at rank ${skill.max_level}`
                  : ""}, rounded. With {fmt.formatNumber(MAX_HEALTH.value)} maximum
                Health, you lose {fmt.formatNumber(
                  reaperDrain(
                    skill.health_percent_per_second_bonus,
                    skill.max_level,
                  ),
                )} Health each second. {fmt.describeRankGrowth(
                  drain,
                  skill.max_level,
                  fmt.formatPercent,
                )}
              </p>
              <RoundingDefinition />
            {/if}
            <!-- Source: server-scripts/NetworkManagerMMO.cs:116 — UpdateEnergies repeats every 1 second. -->
            <!-- Source: server-scripts/Skills.cs:251-256 — recovery ticks skip BreakMezz for NecromancerReaperFormSkill. -->
            <!-- Source: server-scripts/Skills.cs:251-268,1617-1623 — the self-drain has no low-health guard and can kill the caster. -->
            <p class="text-muted-foreground">
              Drain ignores resistance, wards and critical hits. The drain can
              kill you. It does not break Sleep.
            </p>
            <!-- Source: server-scripts/MountItem.cs:58-63 — removes reaperForm.formSkill before mounting. -->
            <!-- Source: server-scripts/Skills.cs:OnDeath — buffs without remainAfterDeath are removed. -->
            <!-- Source: server-scripts/UIBuffs.cs:292-303; server-scripts/Player.cs:10310-10328 — Reaper Form can be removed through the buff bar. -->
            <p class="text-muted-foreground">
              It ends when you toggle it off, remove it from your buff bar or
              mount.
              {skill.remain_after_death
                ? "The form survives death."
                : "Death removes the form."}
            </p>
            <!-- Source: server-scripts/NetworkManagerMMO.cs:674-684 — restores NecromancerReaperFormSkill when saved remaining time is positive. -->
            <p class="text-muted-foreground">
              The form persists when you log out and back in.
            </p>
            <!-- Source: server-scripts/Player.cs:HasActiveAppearanceIllusion — active NecromancerReaperFormSkill is an appearance illusion. -->
            <!-- Source: server-scripts/Player.cs:9310-9313 — HasActiveAppearanceIllusion blocks the barber. -->
            <p class="text-muted-foreground">
              The barber cannot change your appearance while the form is active.
            </p>
            <!-- Source: server-scripts/PlayerSkills.cs:636-646 — active NecromancerReaperFormSkill removal precedes FEAR and STUNNED checks. -->
            <p class="text-muted-foreground">
              Using the skill again dismisses it immediately, even while feared
              or stunned.
            </p>
          </div>
        {/if}

        {#if skill.is_necromancer_pet_buff || skill.also_buff_active_pet}
          <!-- Source: server-scripts/NecromancerPetBuffSkill.cs:6-28 — direct pet buffs require an owned living combat pet. -->
          <!-- Source: server-scripts/TargetBuffSkill.cs:477-482 — alsoBuffActivePet copies a self-buff to the owned living non-familiar, non-mercenary active pet within castRange. -->
          <div class="space-y-2">
            <h3 class="font-semibold">Companion Buff</h3>
            <!-- Source: server-scripts/TargetBuffSkill.cs:477-480; server-scripts/NecromancerPetBuffSkill.cs:24-28 — the pet must be within cast range. -->
            <p class="text-muted-foreground">
              {#if skill.also_buff_active_pet}
                When applied to yourself, the same buff also reaches your living
                companion within {formatLinear(skill.cast_range, " yd")}.
                Familiars and mercenaries cannot receive this copy.
              {:else}
                Targets your living companion within {formatLinear(
                  skill.cast_range,
                  " yd",
                )}. Familiars and mercenaries cannot receive this buff.
              {/if}
            </p>
          </div>
        {/if}

        {#if skill.channel_pulses > 0}
          <!-- Source: server-scripts/PlayerSkills.cs:StartCast,UpdateChannel,CancelCast — channel duration minimum 0.05, upfront mana/energy costs, pulses at (k+1)/N, movement squared above 0.0001 cancels and starts full cooldown. -->
          <div class="space-y-2">
            <h3 class="font-semibold">
              Channel: {skill.channel_pulses} Pulses
            </h3>
            <Calculation calculation={channelCalculation(skill)} />
            <p class="text-muted-foreground">
              Full skill damage is recalculated before mitigation for each
              pulse. No pulse occurs at the start. Mana and energy are paid at
              the start and are not refunded on interruption.
            </p>
            <!-- Source: server-scripts/Player.cs:UpdateServer_CASTING — fear and stun cancel ChanneledTargetDamageSkill; stun skips halving the channel cooldown. -->
            <p class="text-muted-foreground">
              Moving more than 0.01 yd from your starting position, losing the
              target, range or sight, stun or fear cancels the channel.
              Cancellation starts the full cooldown immediately, including when
              a pulse kills the target.
            </p>
            <!-- Source: server-scripts/PlayerSkills.cs:437-454,464-514,2145-2149,2237-2244 — a valid replacement skill cancels the channel with full cooldown and then starts or applies. -->
            <p class="text-muted-foreground">
              Using another skill cancels the channel, starts its full cooldown
              immediately and starts the new skill. You must be free of stun and
              fear. The new skill must be active, meet its casting requirements
              and have a valid target within range and sight when required.
            </p>
          </div>
        {/if}

        {#if skill.damage_over_time_execute_bonus && hasNonZeroField(skill.damage_over_time_execute_bonus)}
          {@const execute = skill.damage_over_time_execute_bonus}
          <!-- Source: server-scripts/Skills.cs:ApplyDamageOverTimeBonuses — after the NecromancerReaperFormSkill multiplier, below 0.3 health.max, sums learned source-player PassiveSkill damageOverTimeExecuteBonus. -->
          <!-- Source: server-scripts/Skills.cs:1903-1938 — a positive summed execute bonus multiplies the tick, which then rounds before critical ticks. -->
          <div class="space-y-2">
            <h3 class="font-semibold">Damage-over-Time Execute</h3>
            <p class="text-muted-foreground">
              While the target is below 30% of its maximum Health, your
              damage-over-time ticks deal {fmt.formatPercent(
                fmt.atRank(execute, skill.max_level),
              )} more damage, rounded, so a {fmt.formatNumber(
                EXAMPLE_HIT,
              )}-damage tick deals {fmt.formatNumber(
                executeTick(execute, skill.max_level),
              )}{fmt.scalesWithRank(execute, skill.max_level)
                ? ` at rank ${skill.max_level}`
                : ""}. {fmt.describeRankGrowth(
                execute,
                skill.max_level,
                fmt.formatPercent,
              )} Learned execute bonuses add together. See
              <a
                class="text-blue-600 dark:text-blue-400 hover:underline"
                href="/mechanics/combat#debuffs">damage over time</a
              > for the full tick.
            </p>
            <RoundingDefinition />
            <p class="text-muted-foreground">
              You must remain in the game as the player who applied the debuff
              to another character. Ticks from pets and monsters receive no
              bonus.
            </p>
          </div>
        {/if}

        {#if skill.skill_type === "passive" && skill.is_pet_skill && hasNonZeroField(skill.health_max_percent_bonus)}
          <!-- Source: server-scripts/Skills.cs:GetHealthPercentBonus — owner's learned isPetSkill PassiveSkill.healthMaxPercentBonus goes to non-mercenary, non-familiar pets, not the owner. -->
          <div class="space-y-2">
            <h3 class="font-semibold">Pet Maximum Health</h3>
            <p class="text-muted-foreground">
              Your companion receives {fmt.formatPercent(
                fmt.atRank(skill.health_max_percent_bonus!, skill.max_level),
              )} more maximum Health{fmt.scalesWithRank(
                skill.health_max_percent_bonus!,
                skill.max_level,
              )
                ? ` at rank ${skill.max_level}`
                : ""}. {fmt.describeRankGrowth(
                skill.health_max_percent_bonus!,
                skill.max_level,
                fmt.formatPercent,
              )} This passive does not increase your own maximum Health, and does
              not affect familiars or mercenaries.
            </p>
          </div>
        {/if}

        {#if skill.lifetap_healing_percent_bonus && hasNonZeroField(skill.lifetap_healing_percent_bonus)}
          {@const bonus = skill.lifetap_healing_percent_bonus}
          <!-- Source: server-scripts/Combat.cs:1318-1333 — active or isPermanent attacker buffs sum lifetapHealingPercentBonus for FloorToInt lifetap healing. -->
          <div class="space-y-2">
            <h3 class="font-semibold">Lifetap Healing Bonus</h3>
            <p class="text-muted-foreground">
              Your lifetap healing is {fmt.formatPercent(
                fmt.atRank(bonus, skill.max_level),
              )} higher, so a lifetap that would heal {fmt.formatNumber(
                EXAMPLE_HIT,
              )} heals {fmt.formatNumber(
                lifetapWithBonus(bonus, skill.max_level),
              )}{fmt.scalesWithRank(bonus, skill.max_level)
                ? ` at rank ${skill.max_level}`
                : ""}. {fmt.describeRankGrowth(
                bonus,
                skill.max_level,
                fmt.formatPercent,
              )} Lifetap damage is unchanged. Bonuses from unexpired and permanent
              buffs add together. See
              <a
                class="text-blue-600 dark:text-blue-400 hover:underline"
                href="/mechanics/combat#lifetap">lifetap</a
              >.
            </p>
          </div>
        {/if}
        <!-- Source: server-scripts/PetSkills.cs:RefreshSkillLevels — Bard mercenary skill ranks have a minimum of 1. -->
        {#if usedByMercenary && skill.max_level > 1}
          <Calculation
            calculation={mercenaryRank(skill.max_level, usedByBardMercenary)}
          />
        {/if}
        {#if usedByCompanion && skill.max_level > 1}
          <p class="text-muted-foreground">
            Companion skills gain a rank every 10 veteran points, capped at the
            skill's maximum rank.
          </p>
        {/if}
        {#if usedByFamiliar && skill.max_level > 1}
          <p class="text-muted-foreground">
            <!-- Source: server-scripts/SummonSkill.cs:99; PetSkills.cs:114-116 — familiar level is its summoning rank, and skill rank is capped at its maximum. -->
            A familiar uses its summoning skill's rank, at most rank {skill.max_level}.
          </p>
        {/if}

        <!-- Scroll Mastery -->
        {#if hasScrollMasteryScaling}
          <!-- Source: server-scripts/ScrollItem.cs:125 — a scroll casts at RoundToInt(scrollMasteryLevel × 20), clamped between 1 and the skill's maximum rank. -->
          <div class="space-y-1">
            <h3 class="font-semibold">
              <a
                href="/professions/scroll_mastery"
                class="text-blue-600 dark:text-blue-400 hover:underline"
                >Scroll Mastery</a
              >
            </h3>
            <p class="text-muted-foreground">
              A scroll casts this skill at one rank per 5 percentage points of
              Scroll Mastery, rounded, from rank 1 up to rank {skill.max_level}.
              At {fmt.formatPercent(EXAMPLE_SCROLL_MASTERY)} Scroll Mastery, it casts
              at rank {scrollRank(skill.max_level)}. The Rank Scaling table
              lists the mastery each rank needs.
            </p>
            <RoundingDefinition />
          </div>
        {/if}

        {#if skill.additional_active_bard_songs > 0}
          <!-- Source: PassiveSkill.cs:12-13 and PlayerSkills.cs:1156-1167 -->
          <div class="space-y-1">
            <h3 class="font-semibold">Song Capacity</h3>
            <p>
              A Bard sustains two songs before bonuses from learned passives.
            </p>
            <p class="text-muted-foreground">
              Learning this passive adds {skill.additional_active_bard_songs} to your
              active song limit.
            </p>
          </div>
        {/if}

        {#if skill.bard_song_duration_bonus_per_level > 0}
          <!-- Source: PassiveSkill.cs:15-27 and PlayerSkills.cs:1169-1180 -->
          <!-- Source: server-scripts/PlayerSkills.cs:1271,1618-1628 — learned song-duration bonuses add, then multiply the base duration. -->
          <div class="space-y-1">
            <h3 class="font-semibold">Song Duration Bonus</h3>
            <p class="text-muted-foreground">
              Each rank lengthens your songs by {fmt.formatPercent(
                skill.bard_song_duration_bonus_per_level,
              )}, so at rank {skill.max_level} a {fmt.formatSeconds(
                EXAMPLE_SONG_SECONDS,
              )} song lasts {fmt.formatSeconds(
                passiveSongDuration(
                  skill.bard_song_duration_bonus_per_level,
                  skill.max_level,
                ),
              )}. Learned song-duration bonuses add together.
            </p>
          </div>
        {/if}

        {#if skill.is_bard_virtuosity}
          <!-- Source: BardVirtuositySkill.cs:7-12 -->
          <div class="space-y-1">
            <h3 class="font-semibold">Virtuosity</h3>
            <p>
              Virtuosity activates when the number of active songs reaches the
              active song limit.
            </p>
          </div>
        {/if}

        {#if skill.is_bard_song && usedByBardMercenary}
          <!-- Source: server-scripts/BardMercenarySkills.cs:OnStartServer,LateUpdate,RefreshAura,MaximumCombatSongs -->
          <div class="space-y-1">
            <h3 class="font-semibold">Mercenary Song Aura</h3>
            <p>
              The song lasts {formatDuration(
                skill.duration_base,
                skill.duration_per_level,
              )}. The mercenary refreshes its aura every 2.5 seconds while the
              song stays active.
            </p>
            <p class="text-muted-foreground">
              <span class="block">The Bard mercenary sings automatically.</span>
              <span class="block"
                >Out of combat, it keeps only Wayfarer's Rhythm active.</span
              >
              <span class="block"
                >In combat, it keeps Grand Symphony and March of Celerity
                active.</span
              >
              <span class="block"
                >From level 40, it also keeps Anthem of Focus active.</span
              >
              <span class="block">It starts one song at a time.</span>
              <span class="block"
                >The songs stop when the mercenary or its owner dies, or when
                the mercenary is hidden, stunned, feared, or asleep.</span
              >
            </p>
          </div>
          <div class="space-y-1">
            <h3 class="font-semibold">Active Song Limit</h3>
            <p>
              The mercenary sustains two combat songs below level 40 and three
              from level 40 onward.
            </p>
            <p class="text-muted-foreground">
              Polyphony and learned song-duration bonuses do not apply to the
              mercenary.
            </p>
          </div>
        {:else if skill.is_bard_song}
          {@const songSeconds = fmt.atRank(
            {
              base_value: skill.duration_base,
              bonus_per_level: skill.duration_per_level,
            },
            skill.max_level,
          )}
          <!-- Source: PlayerSkills.cs:911-917,1169-1180 -->
          <!-- Source: server-scripts/PlayerSkills.cs:1271,1618-1628 — learned song-duration bonuses add, then multiply the base duration. -->
          <div class="space-y-1">
            <h3 class="font-semibold">Song Aura</h3>
            <p class="text-muted-foreground">
              The song lasts {fmt.formatSeconds(
                songSeconds,
              )}{skill.duration_per_level && skill.max_level > 1
                ? ` at rank ${skill.max_level}`
                : ""}. Learned song-duration bonuses lengthen it by their total
              percentage, so with a {fmt.formatPercent(EXAMPLE_SONG_BONUS)} bonus
              it lasts {fmt.formatSeconds(
                songDuration(songSeconds, EXAMPLE_SONG_BONUS),
              )}.
            </p>
          </div>
          <!-- Source: PlayerSkills.cs:937-950,1156-1167. Current exported Polyphony data sets additional_active_bard_songs to 1. -->
          <div class="space-y-1">
            <h3 class="font-semibold">Active Song Limit</h3>
            <p class="text-muted-foreground">
              <span class="block">A Bard can sustain two songs by default.</span
              >
              <span class="block"
                >Learning Polyphony raises the limit to three.</span
              >
              <span class="block"
                >Starting another song at the limit ends the oldest active song.</span
              >
            </p>
          </div>
        {/if}

        {#if skill.is_bard_song && skill.buff_category}
          <!-- Source: server-scripts/BardSongSkill.cs:TryApplyAuraBuff,GetStackingStrength -->
          <div class="space-y-1">
            <h3 class="font-semibold">Song Category: {skill.buff_category}</h3>
            <p>
              Song strength adds its movement speed, physical damage percentage,
              magic damage percentage, Haste, spell haste and Accuracy bonuses.
            </p>
            <p class="text-muted-foreground">
              <span class="block"
                >A target keeps one song of each category, including songs from
                other Bards and Bard mercenaries.</span
              >
              <span class="block"
                >A stronger song replaces a song in the same category.</span
              >
              <span class="block"
                >At equal strength, the song already active stays.</span
              >
            </p>
          </div>
        {/if}

        {#if skill.is_bard_charm}
          <!-- Source: BardCharmSongSkill.cs:GetCharmTarget,GetCharmResistChance,Apply and Combat.cs:GetProbResistMagic -->
          <div class="space-y-1">
            <h3 class="font-semibold">Charm</h3>
            <Calculation calculation={charmDamageCalculation(skill)} />
            <!-- Source: server-scripts/BardCharmSongSkill.cs:66-70 — ordinary Magic Resist roll without Accuracy, then +2.5 percentage points per higher target level and −0.02 per nonnegative Charisma, capped at 95%. -->
            <p class="text-muted-foreground">
              Charm uses the target's <a
                class="text-blue-600 dark:text-blue-400 hover:underline"
                href="/mechanics/combat#resistance">Magic Resist roll</a
              >, without Accuracy. Each level the target is above you adds 2.5
              percentage points to its chance to resist. Each point of your
              Charisma above 0 removes 0.02 percentage points. The final chance
              is between 0% and 95%.
            </p>
            <p class="text-muted-foreground">
              <span class="block"
                >Only living monsters that are not bosses, elites, training
                dummies, or returning home can be charmed.</span
              >
              <span class="block"
                >A Bard can control one charmed monster at a time.</span
              >
              <span class="block"
                >Casting the song again refreshes that monster before
                considering the Bard's selected target.</span
              >
            </p>
          </div>
        {/if}

        {#if skill.is_bard_final_cadence}
          <!-- Source: server-scripts/BardFinalCadenceSkill.cs:HasMaximumSongsActive,Apply,FindEnemies,HealNearbyAllies; PlayerSkills.cs:ConsumeFinalCadenceRepertoireBonus -->
          <div class="space-y-1">
            <h3 class="font-semibold">Final Cadence</h3>
            <p>
              {#if usedByBardMercenary}
                The mercenary casts it only from level 50, while it sustains its
                full combat song limit.
              {:else}
                You can cast it only while you sustain your full active song
                limit.
              {/if}
            </p>
            <Calculation
              calculation={cadenceCalculation(skill, usedByBardMercenary)}
            />
            <p>
              Critical heals restore double Health, or triple Health in 10% of
              cases.
            </p>
            {#if !usedByBardMercenary}
              <!-- Source: server-scripts/PlayerSkills.cs:1157,1576-1603 — distinct completed manual songs in the preceding 40 seconds are consumed for the Melody bonus. -->
              <p class="text-muted-foreground">
                Songs completed less than 40s ago count. Automatic renewal
                contributes 0 songs. Casting Final Cadence clears the Melody
                bonus.
              </p>
            {/if}
            <!-- Source: server-scripts/BardFinalCadenceSkill.cs:Apply and BardFinalCadenceSkill.cs:HealNearbyAllies — a Bard mercenary uses its own Charisma and critical chance. -->
            <p class="text-muted-foreground">
              <span class="block"
                >The {usedByBardMercenary ? "mercenary's" : "Bard's"} critical chance
                determines one roll shared by every recipient.</span
              >
              <span class="block"
                >Its damage hits living, visible, attackable monsters within
                range in the same zone that have a nonempty aggro list and speed
                above −50.</span
              >
              <span class="block">Final Cadence does not heal familiars.</span>
              {#if usedByBardMercenary}
                <span class="block"
                  >The mercenary damages only enemies that target its owner, a
                  party member, or one of their pets.</span
                >
              {/if}
            </p>
            <!-- Source: server-scripts/Combat.cs:654-661,844-861,1539-1580 — Magic Resist reduces magic damage by 0.0005 per point, at most 90%, and adds 0.0005 per point to the resist chance. -->
            <p class="text-muted-foreground">
              The target's Magic Resist reduces the damage by 5% per 100 points,
              at most 90%, and gives 5 percentage points of chance per 100
              points to resist it entirely. See the <a
                class="text-blue-600 dark:text-blue-400 hover:underline"
                href="/mechanics/combat#damage-pipeline">damage pipeline</a
              >,
              <a
                class="text-blue-600 dark:text-blue-400 hover:underline"
                href="/mechanics/combat#resistance">resistance</a
              >
              and
              <a
                class="text-blue-600 dark:text-blue-400 hover:underline"
                href="/mechanics/combat#combat-advantage">combat advantage</a
              >.
            </p>
          </div>
        {/if}

        {#if isDamageType && !isWildStrike && !skill.is_bard_final_cadence && damageBlocks.length > 0 && hasActualDamage}
          <div class="space-y-3">
            <h3 class="font-semibold">Skill Damage</h3>
            <!-- Source: server-scripts/Combat.cs:119-178 — character-window Damage and Magic Damage include base and flat bonuses, then separately rounded percentage bonuses. -->
            {#if damageStatNames.length > 0}
              <p class="text-muted-foreground">
                <a
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                  href="/mechanics/combat#damage-formulas"
                  >{damageStatNames.join(" and ")}</a
                >
                {damageStatNames.length === 1
                  ? "is the value"
                  : "are the values"} in your character window.
              </p>
            {/if}
            {#each damageBlocks as block (block.key)}
              <div class="space-y-2">
                <h4 class="font-medium text-muted-foreground">
                  {calculationCasterLabel(block.casterLabel)}
                </h4>
                {#if block.kind === "monster_magic" || block.kind === "monster_melee"}
                  <p class="text-muted-foreground">
                    The caster uses its own {block.stats
                      .map((stat) => stat.label)
                      .join(" and ")} at its level.
                  </p>
                {/if}
                <Calculation calculation={block.calculation} />
              </div>
            {/each}
            <!-- Source: server-scripts/Combat.cs:654-661,844-861 — physical hits use block/miss and Defense, elemental hits use the matching resist. -->
            {#if skill.is_manaburn_skill}
              <!-- Source: server-scripts/Combat.cs:700-703,836-875 — Mana Burn and Rageblow skip avoidance and mitigation, not variance, combat advantage, level adjustment or critical scaling. -->
              <p class="text-muted-foreground">
                This skill skips avoidance and damage reduction from Defense or
                resistance. Variance, combat advantage, level adjustment and
                eligible critical hits still apply. See the <a
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                  href="/mechanics/combat#damage-pipeline">damage pipeline</a
                >.
              </p>
            {:else if damageMechanics}
              <!-- Source: server-scripts/Combat.cs:307-319,844-861,1539-1580 — the matching stat reduces damage by 0.0005 per point, at most 0.9, rounded up; Defense adds 0.0001 per point to blockChance, at most 0.8; a resist stat adds 0.0005 per point to the resist chance. -->
              <p class="text-muted-foreground">
                {#if damageMechanics.avoidance === "block"}
                  The target's Defense reduces this damage by 5% per 100 points,
                  at most 90%, with the reduction rounded up. The hit can also
                  be blocked or missed, at the target's base block chance plus 1
                  percentage point per 100 Defense and any block bonuses, at
                  most 80%.
                {:else}
                  The target's {damageMechanics.stat} reduces this damage by 5% per
                  100 points, at most 90%, with the reduction rounded up, and gives
                  5 percentage points of chance per 100 points to resist the hit entirely.
                {/if}
                See the
                <a
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                  href="/mechanics/combat#damage-pipeline">damage pipeline</a
                >,
                <a
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                  href="/mechanics/combat#resistance"
                  >resistance and avoidance</a
                >
                for level differences and Accuracy, and
                <a
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                  href="/mechanics/combat#combat-advantage"
                  >moving targets and backstabs</a
                >.
              </p>
            {:else}
              <p>
                Unknown damage type: {skill.damage_type}. Its mitigation rule is
                not mapped.
              </p>
            {/if}
            {#if skill.followup_default_attack && skill.skill_type === "target_damage" && skill.player_classes.includes("rogue")}
              <!-- Source: server-scripts/TargetDamageSkill.cs:167-195 — Master Poisoner changes the Rogue auto attack's damage type before damage is computed. -->
              <p class="text-muted-foreground">
                With Master Poisoner active, a Rogue's auto attack adds 250% of
                Dexterity above 0, rounded, and deals Poison damage against
                Poison Resist.
              </p>
              <RoundingDefinition />
            {/if}
          </div>
        {/if}

        {#if isDamageType && (skill.aggro?.base_value ?? 0) > 0 && (skill.player_classes.length > 0 || usedByMercenary || usedByCompanion)}
          <div class="space-y-2">
            <h3 class="font-semibold">Aggro</h3>
            <Calculation
              calculation={aggroCalculation(
                skill,
                skill.player_classes.length > 0
                  ? "player"
                  : usedByMercenary
                    ? "mercenary"
                    : "other",
              )}
            />
            {#if skill.skill_type === "target_damage" || (skill.skill_type === "area_damage" && !skill.is_bard_final_cadence)}
              <!-- Source: server-scripts/DamageSkill.cs:ToolTip; TargetDamageSkill.cs:249; AreaDamageSkill.cs:149-154 — the tooltip divides maximum Health by three, direct hits add it in full. -->
              <!-- Runtime verification: docs/game-bugs/threat-tooltip-understates-health-bonus.md -->
              <p class="text-muted-foreground">
                The skill's tooltip shows only a third of your maximum Health
                for this bonus, but the game adds all of it.
              </p>
            {/if}
          </div>
        {/if}

        {#if skill.is_balance_health}
          <!-- Source: server-scripts/AreaHealSkill.cs:78-96 — each affected character's Health becomes RoundToInt(its maximum Health × the averaged Health fraction). -->
          <div class="space-y-2">
            <h3 class="font-semibold">Balance Health</h3>
            <p class="text-muted-foreground">
              Every affected character ends at the group's average Health
              percentage, applied to its own maximum Health and rounded. At a {fmt.formatPercent(
                EXAMPLE_SHARED_HEALTH,
              )} average, a character with {fmt.formatNumber(MAX_HEALTH.value)}
              maximum Health ends at {fmt.formatNumber(balancedHealth())} Health.
            </p>
            <RoundingDefinition />
          </div>
        {:else if isHealType && !skill.is_resurrect_skill && data.mechanicsSpec.healContexts.length > 0}
          <div class="space-y-3">
            <h3 class="font-semibold">Healing</h3>
            {#each data.mechanicsSpec.healContexts as ctx (ctx.bonusKind)}
              <div class="space-y-2">
                <h4 class="font-medium text-muted-foreground">
                  {calculationCasterLabel(ctx.casterLabels.join(", "))}
                </h4>
                <Calculation
                  calculation={healingCalculation(skill, ctx.bonusKind)}
                />
                {#if ctx.bonusKind === "merc"}
                  <p class="text-muted-foreground">
                    Mercenaries use their own Wisdom. Player Rangers use three
                    times their Wisdom.
                  </p>
                {/if}
                {#if ctx.canCrit && skill.heals_health}
                  <!-- Source: server-scripts/TargetHealSkill.cs:273-280; AreaHealSkill.cs:109-117 — critical heal doubles, with a 10% triple-heal roll, capped by missing Health. -->
                  <p class="text-muted-foreground">
                    Critical heals restore double Health, or triple Health in
                    10% of cases.
                  </p>
                  {#if skill.skill_type === "target_heal" && (skill.is_pet_skill || skill.is_mercenary_skill) && skill.heals_mana}
                    <!-- Source: server-scripts/TargetHealSkill.cs:155-158 — a critical pet heal rolls the resource multiplier independently of the Health multiplier. -->
                    <p class="text-muted-foreground">
                      A critical pet heal also restores double Mana or Rage, or
                      triple in 10% of cases. Its triple-restoration roll is
                      separate from the Health roll.
                    </p>
                  {/if}
                {/if}
              </div>
            {/each}
          </div>
        {/if}

        {#if isBuffType && hasAttributeScaledBonuses && skill.skill_type !== "passive" && data.mechanicsSpec.buffContexts.length > 0}
          <div class="space-y-3">
            <h3 class="font-semibold">
              {skill.is_bard_song ? "Song Scaling" : "Buff Scaling"}
            </h3>
            {#each data.mechanicsSpec.buffContexts as ctx (`${ctx.bonusAttrSource}:${ctx.isAreaBuff}`)}
              {#each calculationCasters(ctx.casterLabels) as casterLabel (casterLabel)}
                <div class="space-y-2">
                  <h4 class="font-medium text-muted-foreground">
                    {calculationCasterLabel(casterLabel)}
                  </h4>
                  {#if ctx.bonusAttrSource === "none"}
                    <p class="text-muted-foreground">
                      This buff receives no attribute bonus.
                    </p>
                  {:else}
                    <Calculation
                      calculation={effectScalingCalculation(
                        skill,
                        ctx.bonusAttrSource,
                        false,
                        casterLabel.includes("mercenary"),
                      )}
                    />
                    {#if skill.scales_with_charisma}
                      <!-- Source: server-scripts/BardSongSkill.cs:Apply; Skills.cs:307-318 — Charisma-scaled song heals skip the Wisdom healing bonus. -->
                      <p class="text-muted-foreground">
                        Wisdom does not change this song.
                      </p>
                      {#if hasNonZeroField(skill.healing_per_second_bonus)}
                        <!-- Source: server-scripts/Skills.cs:323-359 — ApplyCriticalToOverTime multiplies an eligible recovery tick by 1.5 on a critical roll. -->
                        <p class="text-muted-foreground">
                          Each healing tick can critically heal for 150% at the
                          caster's critical chance.
                        </p>
                      {/if}
                    {/if}
                  {/if}
                </div>
              {/each}
            {/each}
          </div>
        {/if}

        {#if isDebuffType && data.mechanicsSpec.debuffContexts.length > 0}
          <div class="space-y-3">
            <h3 class="font-semibold">
              {skill.is_bard_song ? "Song Scaling" : "Debuff Scaling"}
            </h3>
            {#each data.mechanicsSpec.debuffContexts as ctx (ctx.bonusAttrKind)}
              {#each calculationCasters(ctx.casterLabels) as casterLabel (casterLabel)}
                <div class="space-y-2">
                  <h4 class="font-medium text-muted-foreground">
                    {calculationCasterLabel(casterLabel)}
                  </h4>
                  {#if ctx.bonusAttrKind === "none"}
                    <p class="text-muted-foreground">
                      This debuff receives no attribute bonus.
                    </p>
                  {:else}
                    <Calculation
                      calculation={effectScalingCalculation(
                        skill,
                        ctx.bonusAttrKind,
                        true,
                        casterLabel.includes("mercenary"),
                      )}
                    />
                    {#if skill.scales_with_charisma}
                      <!-- Source: server-scripts/BuffSkill.cs:473-478 — Charisma scaling precedes all other attribute branches. -->
                      <p class="text-muted-foreground">
                        Intelligence does not change this song.
                      </p>
                    {/if}
                  {/if}
                </div>
              {/each}
            {/each}
          </div>
        {/if}

        <!-- Source: server-scripts/Combat.cs:1534-1578; TargetDebuffSkill.cs:105-143; AreaDebuffSkill.cs:104-139 — the debuff resist chance adds 0.0005 per point of Defense or the matching resist, at most 0.9. -->
        {#if isDebuffType && !skill.is_cleanse && !skill.is_bard_charm && debuffResistance}
          <p class="text-muted-foreground">
            The target's {debuffResistance} gives it 5 percentage points of chance
            per 100 points to resist this {skill.is_dispel
              ? "skill"
              : "debuff"}, at most 90%. See
            <a
              class="text-blue-600 dark:text-blue-400 hover:underline"
              href="/mechanics/combat#resistance">resistance and avoidance</a
            > for Accuracy and level differences.
          </p>
        {/if}

        <!-- E. Cleanse Resistance (on debuff skill pages) -->
        <!-- Source: server-scripts/Buff.cs:19 (3 counters); BuffSkill.cs:518-540 (GetCleanseCountersRemoved); TargetBuffSkill.cs:137-161 (HasMatchingCleanseDebuff), 239-432 (Apply cleanse branch); Skills.cs:1866-1872 (DoT per-counter scaling) -->
        {#if isDebuffType && !skill.is_cleanse && !skill.is_dispel && skill.prob_ignore_cleanse != null}
          <div class="space-y-1">
            <h3 class="font-semibold">Cleanse Resistance</h3>
            {#if skill.prob_ignore_cleanse >= 1}
              <p class="text-muted-foreground">
                This debuff cannot be cleansed.
              </p>
            {:else if skill.prob_ignore_cleanse <= 0}
              <p class="text-muted-foreground">
                A matching cleanse removes this debuff completely in a single
                cast.
              </p>
            {:else}
              <p class="text-muted-foreground">
                <span class="block"
                  >This debuff has three layers, and cleansing it removes the
                  debuff only after all three are gone.</span
                >
                <span class="block"
                  >A matching cleanse always removes one layer.</span
                >
                <span class="block"
                  >It rolls twice more to remove one additional layer per roll.</span
                >
                <span class="block"
                  >Each extra-layer roll starts at {formatPercent(
                    1 - skill.prob_ignore_cleanse,
                  )}. Accuracy increases that chance. See
                  <a
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                    href="/mechanics/combat#cleanse">cleanse calculations</a
                  >.</span
                >
                {#if skill.healing_per_second_bonus}
                  <span class="block"
                    >While layers remain, each damage tick deals 85% of its full
                    damage at two layers or 70% at one layer.</span
                  >
                {/if}
              </p>
            {/if}
          </div>
        {/if}

        <!-- E2. Cleanse Mechanics (on cleanse skill pages) -->
        <!-- Source: server-scripts/RelicItem.cs:20-35 (finite-charge item gate); BuffSkill.cs:518-540 (GetCleanseCountersRemoved); TargetBuffSkill.cs:137-161 (HasMatchingCleanseDebuff), 239-432 (Apply cleanse branch); Buff.cs:19 (3 counters); Skills.cs:1866-1872 (DoT per-counter scaling) -->
        {#if skill.is_cleanse}
          <div class="space-y-1">
            <h3 class="font-semibold">
              <a
                href="/mechanics/combat#cleanse"
                class="text-blue-600 dark:text-blue-400 hover:underline"
                >Cleanse Mechanics</a
              >
            </h3>
            <p class="text-muted-foreground">
              <span class="block"
                >Cast on yourself or an ally, this skill removes harmful debuffs
                of the types it cleanses.</span
              >
              <span class="block">The target cannot resist the cleanse.</span>
              <span class="block"
                >See <a
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                  href="/mechanics/combat#cleanse">cleanse calculations</a
                > for layer removal and damage-over-time scaling.</span
              >
            </p>
          </div>
        {/if}

        <!-- F. Dispel Mechanics -->
        {#if skill.is_dispel}
          {@const playerCast =
            skill.is_scroll || skill.player_classes.length > 0}
          <div class="space-y-1">
            <!-- Source: server-scripts/TargetDebuffSkill.cs:105-143 (resist gate), 173-205,209-234,238-250 (removal); AreaDebuffSkill.cs:104-139 (resist gate), 164-205,209-233,238-258 (removal); Combat.cs:1540-1567 GetProbResistMagic/Disease -->
            <h3 class="font-semibold">
              <a
                href="/mechanics/combat#dispel"
                class="text-blue-600 dark:text-blue-400 hover:underline"
                >Dispel Mechanics</a
              >
            </h3>
            {#if playerCast}
              <p class="text-muted-foreground">
                <span class="block"
                  >You cast this on a monster to remove its beneficial buffs.</span
                >
                <span class="block"
                  >First the monster can resist the skill, then each buff has a
                  separate removal chance.</span
                >
              </p>
              <p class="text-muted-foreground">
                <span class="block"
                  ><span class="font-medium">1. Resist.</span> The monster rolls
                  to resist this skill with its {debuffResistance}, and your
                  Accuracy lowers the chance.</span
                >
                <span class="block"
                  >If the monster resists, no buffs are removed.</span
                >
              </p>
              <p class="text-muted-foreground">
                <span class="block"
                  ><span class="font-medium">2. Remove buffs.</span> Each buff has
                  a separate removal roll.</span
                >
                <span class="block"
                  >The chance to remove a buff is 100% minus its Dispel Resist,
                  plus your Dispel Resist reduction.</span
                >
                <span class="block"
                  >A buff with 0% Dispel Resist is always removed.</span
                >
              </p>
              {#if skill.skill_type === "target_debuff"}
                {#if skill.is_scroll}
                  <p>
                    Each effective scroll rank lowers Dispel Resist by 1
                    percentage point.
                  </p>
                  <p class="text-muted-foreground">
                    Your reduction grows with your
                    <a
                      href="/professions/scroll_mastery"
                      class="text-blue-600 dark:text-blue-400 hover:underline"
                      >Scroll Mastery</a
                    >
                    rank, lowering a monster's Dispel Resist by 1 percentage point
                    per effective rank (up to {skill.max_level}).
                    <span class="block"
                      >Accuracy helps the scroll land in step 1.</span
                    >
                    <span class="block"
                      >Scroll Mastery removes more buffs in step 2.</span
                    >
                  </p>
                {:else}
                  <p>
                    Half your Accuracy reduces Dispel Resist by the same number
                    of percentage points.
                  </p>
                  <p class="text-muted-foreground">
                    <span class="block"
                      >Your Accuracy helps the dispel land and reduces each
                      buff's Dispel Resist.</span
                    >
                    <span class="block"
                      >For example, 20% Accuracy lowers Dispel Resist by 10
                      percentage points.</span
                    >
                  </p>
                {/if}
              {:else}
                <p class="text-muted-foreground">
                  <span class="block"
                    >Area dispels do not lower any buff's Dispel Resist, so each
                    buff faces its full removal chance.</span
                  >
                  <span class="block"
                    >Your Accuracy still helps the skill land.</span
                  >
                </p>
              {/if}
            {:else}
              <p class="text-muted-foreground">
                <span class="block"
                  >Monsters use this to remove beneficial buffs from you and
                  your pets.</span
                >
                <span class="block"
                  >First you can resist the skill, then it removes your buffs.</span
                >
              </p>
              <p class="text-muted-foreground">
                <span class="block"
                  ><span class="font-medium">1. Resist.</span> You roll to
                  resist this skill with your {debuffResistance}, and the
                  monster's Accuracy lowers the chance.</span
                >
                <span class="block">If you resist, your buffs stay.</span>
              </p>
              <p class="text-muted-foreground">
                <span class="block"
                  ><span class="font-medium">2. Remove buffs.</span> If the skill
                  lands, it removes all your buffs except Rest.</span
                >
                <span class="block"
                  >It removes all buffs from an affected pet.</span
                >
              </p>
            {/if}
          </div>
        {/if}

        <!-- G. Special Mechanic Notes -->
        {#if isWildStrike}
          <!-- Source: server-scripts/DamageSkill.cs:49-67 (TryConsumeWildStrike) -->
          <!-- Source: server-scripts/TargetDamageSkill.cs:244,291 (ApplyDamage) -->
          <!-- Source: server-scripts/TargetProjectileSkill.cs:221-222,252-256 (Apply) -->
          <!-- Source: server-scripts/Combat.cs:521,776,842-849,1191-1204 (DealDamageAt) -->
          <div class="space-y-1">
            <h3 class="font-semibold">Wild Strike</h3>
            <p class="text-muted-foreground">
              The next sword or bow auto attack consumes the buff. After its
              ordinary damage calculation, the hit deals 10% more per Wild
              Strike rank, rounded, and becomes Magic damage, which Magic Resist
              reduces. At rank {skill.max_level}, a {fmt.formatNumber(
                EXAMPLE_HIT,
              )}-damage auto attack deals {fmt.formatNumber(
                wildStrikeHit(skill.max_level),
              )}. See
              <a
                class="text-blue-600 dark:text-blue-400 hover:underline"
                href="/mechanics/combat#wild-strike">Wild Strike</a
              >,
              <a
                class="text-blue-600 dark:text-blue-400 hover:underline"
                href="/mechanics/combat#damage-pipeline">the damage pipeline</a
              >
              and
              <a
                class="text-blue-600 dark:text-blue-400 hover:underline"
                href="/mechanics/combat#resistance">resistance</a
              >.
            </p>
            <RoundingDefinition />
            <!-- Source: server-scripts/Skills.cs:460-475; Combat.cs:119-146 — the active buff's flat Damage bonus is already included in the character-window Damage used by the auto-attack calculators. -->
            <p class="text-muted-foreground">
              Use the <a
                class="text-blue-600 dark:text-blue-400 hover:underline"
                href="/skills/swift_slash#mechanics">Swift Slash</a
              >
              or
              <a
                class="text-blue-600 dark:text-blue-400 hover:underline"
                href="/skills/archer_shot#mechanics">Archer Shot</a
              > calculator while Wild Strike is active to find the auto attack's damage
              before the target's defenses. Your character-window Damage already includes
              this buff's flat Damage bonus.
            </p>
          </div>
        {/if}
        {#if skill.id === "parry"}
          <!-- Source: server-scripts/Combat.cs:1344-1359, isParry; Player.cs:12225-12229 -->
          <div class="space-y-1">
            <h3 class="font-semibold">
              <a
                href="/mechanics/combat#parry"
                class="text-blue-600 dark:text-blue-400 hover:underline"
                >Parry</a
              >
            </h3>
            <p class="text-muted-foreground">
              <span class="block"
                >During Parry's cast window, Parry blocks the health damage from
                a single-target physical melee attack by your selected target.</span
              >
              <span class="block"
                >Your counterattack uses the damage left after reduction, Ward
                and Mana Shield. See <a
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                  href="/mechanics/combat#parry">Parry's calculation</a
                >. Fully absorbed hits do not trigger it.</span
              >
            </p>
          </div>
        {/if}
        {#if skill.is_assassination_skill}
          <p>
            You can cast this skill only when the target has less than 25%
            health.
          </p>
        {/if}
        {#if skill.is_decrease_resists_skill}
          <!-- Source: BuffSkill.cs:99-106, TargetDebuffSkill.cs:134-136 -->
          <p>
            <span class="block"
              >This skill bypasses monsters' immunity to debuffs.</span
            >
            <span class="block"
              >It lowers the target's resist chance by 30 percentage points
              before the resist roll.</span
            >
          </p>
        {/if}
        {#if skill.is_mana_shield}
          <!-- Source: Combat.cs — DealDamageAt, ward check before mana shield check -->
          <p>
            <span class="block">Ward absorbs damage first.</span>
            <span class="block"
              >Mana Shield then absorbs the remaining damage using mana.</span
            >
          </p>
        {/if}
        {#if hasLinearValue(skill.fear_chance)}
          <!-- Source: server-scripts/Combat.cs:1104-1138 — DealDamageAt fear branch -->
          <div class="space-y-1">
            <h3 class="font-semibold">Fear</h3>
            <p class="text-muted-foreground">
              <span class="block"
                >Boss monsters and fear-immune targets cannot be feared. Fear
                requires a successful fear roll and a failed resistance roll.
                Stun from the same hit prevents Fear.</span
              >
              <span class="block"
                >Fear lasts a random duration between half and all of the
                skill's fear duration.</span
              >
              <!-- Source: server-scripts/Combat.cs:1104-1108; Monster.cs:speed; Npc.cs:speed — Necromancer-player fear halves positive monster/NPC movement speed. -->
              <span class="block"
                >Fear applied by a Necromancer player halves a monster's or
                NPC's positive movement speed while feared.</span
              >
            </p>
          </div>
        {/if}
        {#if skill.fear_resist_chance_bonus}
          <!-- Source: server-scripts/Combat.cs:278-290 — fearResistChance property -->
          <div class="space-y-1">
            <h3 class="font-semibold">Fear Resist</h3>
            <p class="text-muted-foreground">
              <span class="block"
                >When fear would apply, the target has a chance to resist it.</span
              >
              {#if skill.fear_resist_chance_bonus_cap > 0}
                <span class="block"
                  >This skill adds at most {formatPercent(
                    skill.fear_resist_chance_bonus_cap,
                  ).replace("%", "")} percentage points to that chance after Charisma
                  scaling.</span
                >
              {/if}
              <span class="block"
                >Total Fear Resist from all sources is capped at 100%.</span
              >
              <span class="block"
                >At 100%, the target resists every fear effect.</span
              >
            </p>
          </div>
        {/if}
        {#if hasLinearValue(skill.stun_chance)}
          <!-- Source: server-scripts/Combat.cs:1066-1103 — DealDamageAt stun branch -->
          <div class="space-y-1">
            <h3 class="font-semibold">Stun</h3>
            <p class="text-muted-foreground">
              <span class="block"
                >Stun applies on one roll, but cannot affect a feared target.</span
              >
              <span class="block"
                >Another stun extends the existing stun instead of replacing its
                end time.</span
              >
              <span class="block">Bear mounts resist 90% of stun attempts.</span
              >
            </p>
          </div>
        {/if}
        {#if hasLinearValue(skill.knockback_chance)}
          <!-- Source: server-scripts/Combat.cs:88 (knockbackTime = 0.25f), 90 (knockbackObstacleDamageBonus = 0.0125f), 1139-1159 -->
          <div class="space-y-1">
            <h3 class="font-semibold">Knockback</h3>
            <p class="text-muted-foreground">
              <span class="block"
                >Knockback applies only if stun and fear did not apply on the
                same hit and the target is not already stunned.</span
              >
              <span class="block"
                >It pushes the target back{skill.knockback_distance
                  ? ` ${skill.knockback_distance} yd`
                  : ""} and stuns them for 0.25 seconds.</span
              >
              <span class="block"
                >If an obstacle blocks the path, the target also takes 1.25% of
                the damage just dealt, rounded up to at least 1.</span
              >
              <span class="block"
                >The target must be within 15 levels of the attacker, unless the
                attacker is a boss.</span
              >
            </p>
          </div>
        {/if}
        {#if skill.speed_bonus && skill.speed_bonus.base_value <= -10 && skill.speed_bonus.base_value > -50}
          <!-- Source: server-scripts/Monster.cs and Pet.cs (root/full-stop threshold speed <= -10f, timerRoot 2s, RemoveRoot) -->
          <!-- Source: server-scripts/Npc.cs (root/full-stop threshold speed <= -10f, timerRoot 1s, 10% fixed) -->
          <!-- Source: server-scripts/TargetDebuffSkill.cs:141 (boss/elite auto-resist speedBonus < -10) -->
          <div class="space-y-1">
            <h3 class="font-semibold">Root</h3>
            <p class="text-muted-foreground">
              <span class="block"
                >Root stops movement and does not break when the target takes
                damage.</span
              >
              <span class="block"
                >Every 2 seconds, a rooted monster rolls to break free. Each
                point of its Magic Resist adds 0.1 percentage points to that
                chance, which stays between 5% and 95%.</span
              >
              <span class="block"
                >A rooted NPC has a 10% chance to break free every second.</span
              >
              <span class="block"
                >Bosses and elite monsters always resist this debuff.</span
              >
            </p>
          </div>
        {/if}
        {#if skill.speed_bonus && skill.speed_bonus.base_value <= -50}
          <!-- Source: server-scripts/Skills.cs:1592-1597 (BreakMezz — entity.speed <= -50f) -->
          <!-- Source: server-scripts/Combat.cs:DealDamageAt (any damage > 0 calls BreakMezz) -->
          <!-- Source: server-scripts/Monster.cs:1539-1553 (monster self-break roll every 6s) -->
          <!-- Source: server-scripts/TargetDebuffSkill.cs:141 (boss/elite auto-resist speedBonus < -10) -->
          <!-- Source: server-scripts/Skills.cs:251-256 — NecromancerReaperFormSkill recovery drain skips BreakMezz. -->
          <div class="space-y-1">
            <h3 class="font-semibold">Sleep</h3>
            <p class="text-muted-foreground">
              <span class="block"
                >Sleep stops movement, but direct damage or ordinary
                damage-over-time ticks wake the target. Reaper Form health drain
                does not.</span
              >
              <span class="block"
                >Bosses and elite monsters always resist sleep.</span
              >
              <span class="block"
                >Every 6 seconds, a sleeping monster rolls to wake. Each point
                of its Magic Resist adds 0.1 percentage points to that chance,
                which stays between 5% and 95%.</span
              >
            </p>
          </div>
        {/if}
        {#if skill.is_teleport}
          <!-- Source: server-scripts/AreaBuffSkill.cs:125-137 — isTeleport branch -->
          <div class="space-y-1">
            <h3 class="font-semibold">Teleport</h3>
            <p class="text-muted-foreground">
              <span class="block"
                >This skill teleports each party member in range to the nearest
                safe city.</span
              >
              <span class="block"
                >Each player is stunned for 1 second on arrival.</span
              >
            </p>
          </div>
        {/if}
        {#if hasLinearValue(skill.block_chance_bonus)}
          <!-- Source: server-scripts/Combat.cs:315-325 (blockChance property) -->
          <!-- Source: server-scripts/Skills.cs:557-572 (GetBlockChanceBonus) -->
          <div class="space-y-1">
            <h3 class="font-semibold">Block Chance</h3>
            <p class="text-muted-foreground">
              <span class="block"
                >This skill adds its Block Chance bonus to the target's chance
                to block.</span
              >
              <span class="block"
                >Block Chance is capped at 80% before Accuracy and level
                difference are applied.</span
              >
              <span class="block"
                >The final chance for an attack to miss is capped at 90%.</span
              >
            </p>
          </div>
        {/if}
        {#if hasLinearValue(skill.accuracy_bonus)}
          <!-- Source: server-scripts/Combat.cs:1449-1452 (GetProbResistMeleeDamage, all GetProbResist*) -->
          <div class="space-y-1">
            <h3 class="font-semibold">Accuracy</h3>
            <p class="text-muted-foreground">
              <span class="block"
                >This skill's Accuracy bonus lowers the target's chance to block
                or resist an attack by the same number of percentage points.</span
              >
              <span class="block"
                >Total Accuracy is limited to a value between −50% and 100%.</span
              >
            </p>
          </div>
        {/if}
        {#if hasLinearValue(skill.critical_chance_bonus)}
          <!-- Source: server-scripts/Combat.cs:282-297 (criticalChance), crit branch in DealDamageAt -->
          <div class="space-y-1">
            <h3 class="font-semibold">Critical Chance</h3>
            <p class="text-muted-foreground">
              <span class="block"
                >This skill adds to the attacker's critical hit chance, capped
                at 70%.</span
              >
              <span class="block"
                >See the <a
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                  href="/mechanics/combat#damage-pipeline">damage pipeline</a
                > for critical-hit scaling.</span
              >
            </p>
          </div>
        {/if}
        {#if hasLinearValue(skill.critical_resist_bonus)}
          <!-- Source: server-scripts/Combat.cs:293-305 (criticalResist, clamped 0-1), 514-519 (ApplyCriticalResistToMultiplier), 854-869 (crit damage), Dexterity.cs:34-37 -->
          <div class="space-y-1">
            <h3 class="font-semibold">Critical Resist</h3>
            <p class="text-muted-foreground">
              <span class="block"
                >Critical Resist reduces the extra damage from critical hits.</span
              >
              <span class="block"
                >See <a
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                  href="/mechanics/combat#resistance"
                  >critical damage reduction</a
                > for how the stat reduces the extra damage.</span
              >
              <span class="block"
                >At 100% Critical Resist, a critical hit deals the same damage
                as an ordinary hit.</span
              >
              <span class="block"
                >Each point of Dexterity above 0 adds 0.05 percentage points of
                Critical Resist.</span
              >
              <span class="block"
                >Gear and buffs can add more, up to a total of 100%.</span
              >
            </p>
          </div>
        {/if}
        {#if skill.lifetap_percent && hasLinearValue(skill.lifetap_percent)}
          {@const share = skill.lifetap_percent}
          <!-- Source: server-scripts/Combat.cs:1318-1333 — lifetap heals FloorToInt(share × damage after Ward and Mana Shield × (1 + summed bonuses)); overkill counts. -->
          <div class="space-y-1">
            <h3 class="font-semibold">Lifetap</h3>
            <p class="text-muted-foreground">
              Heals you for {fmt.formatPercent(
                fmt.atRank(share, skill.max_level),
              )} of each hit's damage after the target's defenses, Ward and Mana Shield,
              rounded down, so a {fmt.formatNumber(EXAMPLE_HIT)}-damage hit
              heals {fmt.formatNumber(
                lifetapFromHit(share, skill.max_level),
              )}{fmt.scalesWithRank(share, skill.max_level)
                ? ` at rank ${skill.max_level}`
                : ""}. {fmt.describeRankGrowth(
                share,
                skill.max_level,
                fmt.formatPercent,
              )} Damage beyond the target's remaining Health still counts. Lifetap
              Healing bonuses multiply the healing. See
              <a
                class="text-blue-600 dark:text-blue-400 hover:underline"
                href="/mechanics/combat#lifetap">lifetap</a
              >.
            </p>
          </div>
        {/if}
        {#if skill.break_armor_prob > 0}
          <!-- Source: server-scripts/Combat.cs:541-569 (break armor roll, DecreaseDurability) -->
          <div class="space-y-1">
            <h3 class="font-semibold">Break Armor</h3>
            <p class="text-muted-foreground">
              <span class="block"
                >Each hit can trigger Break Armor at the skill's listed chance.</span
              >
              <span class="block"
                >When it triggers, the game picks one random equipment slot on
                the target.</span
              >
              <span class="block"
                >If that slot contains an item with durability remaining, the
                item loses 1–4 durability.</span
              >
              <span class="block"
                >Break Armor affects players and mercenaries.</span
              >
            </p>
          </div>
        {/if}
        {#if skill.heal_on_hit_percent && hasLinearValue(skill.heal_on_hit_percent)}
          {@const share = skill.heal_on_hit_percent}
          <!-- Source: server-scripts/Combat.cs:883-897 — positive effects on the victim heal the attacker for each qualifying damage-skill hit before Ward, capped at missing Health. -->
          <div class="space-y-2">
            <h3 class="font-semibold">Heal on Hit</h3>
            <p class="text-muted-foreground">
              The affected target heals anyone who hits it in melee for {fmt.formatPercent(
                fmt.atRank(share, skill.max_level),
              )} of each hit's damage after defenses and critical hits, rounded, up
              to the attacker's missing Health. A {fmt.formatNumber(
                EXAMPLE_HIT,
              )}-damage hit heals {fmt.formatNumber(
                healOnHit(share, skill.max_level),
              )}{fmt.scalesWithRank(share, skill.max_level)
                ? ` at rank ${skill.max_level}`
                : ""}. {fmt.describeRankGrowth(
                share,
                skill.max_level,
                fmt.formatPercent,
              )}
            </p>
            <p class="text-muted-foreground">
              A melee hit is a non-spell damage skill with a base cast range
              below 2 yd. Several such effects each round their healing, then
              add together.
            </p>
            <RoundingDefinition />
          </div>
        {/if}
        {#if hasLinearValue(skill.cooldown_reduction_percent)}
          <!-- Source: server-scripts/TargetBuffSkill.cs:269-284 (instant CD reduction on buff apply) -->
          <div class="space-y-1">
            <h3 class="font-semibold">Cooldown Reduction</h3>
            <p class="text-muted-foreground">
              <span class="block"
                >Applying this buff reduces each skill's remaining cooldown by
                the listed percentage, up to 30 seconds per skill.</span
              >
              <span class="block"
                >The reduction happens once when the buff is applied.</span
              >
            </p>
          </div>
        {/if}
        {#if hasLinearValue(skill.damage_shield)}
          <!-- Source: server-scripts/Combat.cs:888-898,900-921,936-946,798-822 (damage_shield reflect block; gated by !isProcWeapon && !isScroll) -->
          <div class="space-y-1">
            <h3 class="font-semibold">Damage Shield</h3>
            <p class="text-muted-foreground">
              <span class="block"
                >Damage Shield reflects damage when a non-spell, single-target
                melee attack with a cast range below 1.5 hits the wearer.</span
              >
              <span class="block"
                >Scroll skills and weapon effects triggered on hit cannot
                trigger it.</span
              >
              <span class="block"
                >The shield uses the caster's attribute contribution stored when
                the buff is applied. See Buff Scaling above for the amount. The
                attacker's Defense or matching resist reduces the reflected hit.
                See <a
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                  href="/mechanics/combat#resistance"
                  >resistance and mitigation</a
                >.</span
              >
            </p>
          </div>
        {/if}
        {#if skill.is_blindness}
          <!-- Source: server-scripts/Player.cs:UserCode_TargetRpcAddBlind and UserCode_TargetRpcRemoveBlind -->
          <!-- Source: server-scripts/Skills.cs:1261-1263 (isBlindness check, Player only) -->
          <div class="space-y-1">
            <h3 class="font-semibold">Blindness</h3>
            <p class="text-muted-foreground">
              <span class="block"
                >Blindness covers the affected player's screen with a black
                overlay for the effect's duration.</span
              >
              <span class="block"
                >It changes no combat stats and affects only players.</span
              >
              <span class="block"
                >The overlay fades out over 1 second when the effect ends.</span
              >
            </p>
          </div>
        {/if}
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Granted By Items -->
  {#if data.grantedByItems.length > 0}
    <Card.Root id="granted-by-items" class="bg-muted/30">
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Gem class="h-5 w-5 text-amber-500" />
          Granted by Items
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="space-y-2">
          {#each data.grantedByItems as item (item.item_id)}
            <div class="flex items-center gap-2">
              <a
                href="/items/{item.item_id}"
                class="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {item.item_name}
              </a>
              <span class="text-xs text-muted-foreground">({item.type})</span>
              {#if item.probability !== undefined && item.probability < 1}
                <span class="text-xs text-muted-foreground">
                  {formatPercent(item.probability)} chance
                </span>
              {/if}
            </div>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Used By Classes -->
  {#if skill.player_classes.length > 0}
    <Card.Root id="learned-by-classes" class="bg-muted/30">
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Star class="h-5 w-5 text-indigo-500" />
          Learned by Classes
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="space-y-2">
          {#each skill.player_classes as cls (cls)}
            <div class="flex items-center gap-2">
              <a
                href="/classes/{cls}"
                class="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {formatClassName(cls)}
              </a>
            </div>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Applied by Traps -->
  {#if data.appliedByTraps.length > 0}
    <Card.Root id="applied-by-traps" class="bg-muted/30">
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <TriangleAlert class="h-5 w-5 text-rose-600" />
          Applied by Traps ({data.appliedByTraps.reduce(
            (total, usage) => total + usage.trap_count,
            0,
          )})
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="space-y-2">
          {#each data.appliedByTraps as usage (`${usage.zone_id}-${usage.type}`)}
            <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>{TRAP_TYPE_LABELS[usage.type]}</span>
              <span class="text-muted-foreground">×{usage.trap_count} in</span>
              <a
                href="/zones/{usage.zone_id}"
                class="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {usage.zone_name}
              </a>
            </div>
          {/each}
        </div>
        <a
          href="/traps?traps.effect={skill.id}"
          class="mt-4 inline-block text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          View matching traps
        </a>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Used By Pets -->
  {#if data.usedByPets.length > 0}
    <Card.Root id="used-by-pets" class="bg-muted/30">
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Cat class="h-5 w-5 text-teal-500" />
          Used by Pets
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="space-y-2">
          {#each data.usedByPets as pet (pet.id)}
            <div class="flex items-center gap-2">
              <a
                href={petHref(pet.id, pet.is_mercenary)}
                class="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {pet.name}
              </a>
            </div>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Used by Monsters -->
  {#if data.usedByMonsters.length > 0}
    <Card.Root id="used-by-monsters" class="bg-muted/30">
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Skull class="h-5 w-5 text-red-500" />
          Used by Monsters ({data.usedByMonsters.length})
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="space-y-2">
          {#each data.usedByMonsters as monster (monster.id)}
            <div class="flex items-center gap-2">
              <MonsterTypeIcon
                isBoss={Boolean(monster.is_boss)}
                isFabled={Boolean(monster.is_fabled)}
                isElite={Boolean(monster.is_elite)}
              />
              <a
                href="/monsters/{monster.id}"
                class="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {monster.name}
              </a>
              <span class="text-muted-foreground text-sm">
                Lv {monster.level_min === monster.level_max
                  ? monster.level_min
                  : `${monster.level_min}-${monster.level_max}`}
              </span>
            </div>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>
  {/if}
</div>

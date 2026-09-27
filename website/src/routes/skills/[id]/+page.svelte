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
    formatLinearValue as formatSkillLinear,
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
  import FormulaDisplay from "$lib/components/FormulaDisplay.svelte";
  import MonsterTypeIcon from "$lib/components/MonsterTypeIcon.svelte";
  import Skull from "@lucide/svelte/icons/skull";
  import Cat from "@lucide/svelte/icons/cat";
  import Star from "@lucide/svelte/icons/star";
  import Ghost from "@lucide/svelte/icons/ghost";
  import TrendingUp from "@lucide/svelte/icons/trending-up";
  import FlaskConical from "@lucide/svelte/icons/flask-conical";
  import {
    renderFormulaDisplay,
    renderWildStrikeFormulaDisplay,
  } from "$lib/utils/formula-eval";
  import { petHref } from "$lib/utils/pets";
  import {
    hasCharismaScaledIntegerEffect,
    hasCharismaScaledPercentageEffect,
  } from "$lib/utils/skillMechanics";
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
  const isScrollTriggered = $derived(
    data.grantedByItems.some((item) => item.type === "scroll"),
  );
  const hasScrollMasteryScaling = $derived(
    isScrollTriggered && skill.max_level > 1,
  );
  const hasScrollDispelScaling = $derived(
    hasScrollMasteryScaling && skill.is_dispel,
  );

  function formatMasteryNeeded(level: number): string {
    const pct = level <= 1 ? 0 : level * 5 - 2.5;
    return `${pct.toFixed(1)}%`;
  }

  function formatDispelReduction(level: number): string {
    return `${level} pp`;
  }

  function formatLinear(
    value: LinearValue | null,
    suffix: string = "",
  ): string {
    if (!value) return "-";
    return `${formatSkillLinear(value, undefined)}${suffix}`;
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
      (ctx) => ctx.bonusAttrSource === "player_cha",
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

  const hasBardIntegerScaling = $derived(
    skill.scales_with_charisma && hasCharismaScaledIntegerEffect(skill),
  );
  const hasBardPercentageScaling = $derived(
    skill.scales_with_charisma && hasCharismaScaledPercentageEffect(skill),
  );
  const hasBardFlatDamageScaling = $derived(
    skill.scales_with_charisma &&
      skill.damage_over_time_bonus_per_charisma_point > 0,
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
    if (skill.duration_per_level > 0) {
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
        const label =
          def.key === "healing_per_second_bonus" && val.base_value < 0
            ? "Damage/sec"
            : def.key === "health_percent_per_second_bonus" &&
                val.base_value < 0
              ? "Damage %/sec"
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

  // showMechanics: true iff at least one inner mechanics section will actually render.
  // Mirrors the exact conditions of each inner section to avoid empty cards.
  // No isPlayerUsable dependency — monster-only skills are included when the spec
  // has computed contexts for them.
  const showMechanics = $derived(
    skill.is_bard_song ||
      skill.is_bard_final_cadence ||
      skill.is_bard_virtuosity ||
      skill.additional_active_bard_songs > 0 ||
      skill.bard_song_duration_bonus_per_level > 0 ||
      // A. Damage formula + pipeline
      (isDamageType &&
        data.mechanicsSpec.damageContexts.length > 0 &&
        hasActualDamage) ||
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
      // C2. Attack timing
      data.mechanicsSpec.timingContexts.length > 0 ||
      // E2. Cleanse mechanics
      skill.is_cleanse ||
      skill.is_assassination_skill ||
      skill.id === "wild_strike" ||
      skill.id === "parry" ||
      hasScrollMasteryScaling ||
      skill.is_decrease_resists_skill ||
      (hasLinearValue(skill.cast_time) && skill.is_spell && !skill.is_scroll) ||
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
      { id: "level-scaling", label: "Level Scaling", show: showLevelScaling },
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
   * `stat` is the stat that reduces the damage. Source: server-scripts/Combat.cs:842-859 — the
   * per-damage-type switch, each read multiplied by 0.0005.
   * `avoidance` is which roll can prevent the hit. Source: server-scripts/Combat.cs:652-659 —
   * Normal damage goes to GetProbResistMeleeDamage, every other type to its own GetProbResist*.
   *
   * Physical is the one type whose stat does double duty. `defense` reduces the damage at 0.0005
   * per point, and it also feeds the block roll at 0.0001 per point, because blockChance is
   * derived from it. Source: server-scripts/Combat.cs:305-317. Both physical formulas refer
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
    // An unrecognised type means the exported vocabulary grew. Render nothing rather than guess.
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
      <span>Max Level {skill.max_level}</span>
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
              <div class="font-mono text-sm whitespace-pre-wrap">
                <!-- eslint-disable-next-line svelte/no-at-html-tags -- Safe: Unity color tags from controlled data -->
                {@html convertTooltip(skill.tooltip_template)}
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
          <div class="font-mono text-sm whitespace-pre-wrap">
            <!-- eslint-disable-next-line svelte/no-at-html-tags -- Safe: Unity color tags from controlled data -->
            {@html convertTooltip(skill.tooltip_template)}
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
                    Lvl {skill.prerequisite_level}
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
                    Lvl {skill.prerequisite2_level}
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
              <!-- Source: server-scripts/TargetDamageSkill.cs:127-155, TargetProjectileSkill.cs:211-220 — Rageblow spends all rage for double damage; Mana Burn spends all mana for triple damage. -->
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
            {#if skill.duration_base > 0 || skill.duration_per_level > 0}
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
                <dt class="text-muted-foreground">
                  {isNegativeLinear(skill.health_percent_per_second_bonus)
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
              <!-- Source: server-scripts/Entity.cs:346-362 — invisibility that ignores detection hides the target from every observer; ordinary invisibility yields to a monster that sees invisibility. -->
              <!-- Source: server-scripts/Skills.cs:983, server-scripts/UsableItem.cs:53 — casting a skill or using an item ends invisibility. -->
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
            {#if skill.is_permanent}
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
          Level Scaling
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="overflow-x-auto">
          <table class="w-full text-sm table-fixed">
            <thead>
              <tr class="border-b">
                <th
                  class="py-2 pr-4 text-left font-medium text-muted-foreground"
                  >Skill Level</th
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
                <tr class="border-b border-border/50">
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
                      >{formatDispelReduction(level)}</td
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
        <!-- Source: server-scripts/PetSkills.cs:OnStartServer — Bard mercenary skill ranks have a minimum of 1. -->
        {#if usedByMercenary && skill.max_level > 1}
          <p class="text-muted-foreground">
            {#if usedByBardMercenary}
              Bard mercenary skill level = min(max skill level, max(1,
              floor(regular level &divide; 5) + floor(veteran level &divide;
              10))).
            {:else}
              When used by a mercenary, skill level = floor(regular level
              &divide; 5) + floor(veteran level &divide; 10), capped at max
              skill level.
            {/if}
          </p>
        {/if}
        {#if usedByCompanion && skill.max_level > 1}
          <p class="text-muted-foreground">
            When used by a companion, skill level = floor(veteran level &divide;
            10), capped at max skill level.
          </p>
        {/if}
        {#if usedByFamiliar && skill.max_level > 1}
          <p class="text-muted-foreground">
            When used by a familiar, skill level equals the summoning skill
            rank.
          </p>
        {/if}

        <!-- Scroll Mastery -->
        {#if hasScrollMasteryScaling}
          <div class="space-y-1">
            <h3 class="font-semibold">
              <a
                href="/professions/scroll_mastery"
                class="text-blue-600 dark:text-blue-400 hover:underline"
                >Scroll Mastery</a
              >
            </h3>
            <p class="font-mono">
              Skill level = clamp(round(Scroll Mastery% &divide; 5), 1, {skill.max_level})
            </p>
          </div>
        {/if}

        {#if skill.additional_active_bard_songs > 0}
          <!-- Source: PassiveSkill.cs:12-13 and PlayerSkills.cs:1156-1167 -->
          <div class="space-y-1">
            <h3 class="font-semibold">Song Capacity</h3>
            <p class="font-mono">
              Active song limit = 2 + bonuses from learned passives
            </p>
            <p class="text-muted-foreground">
              Learning this passive adds {skill.additional_active_bard_songs} to your
              active song limit.
            </p>
          </div>
        {/if}

        {#if skill.bard_song_duration_bonus_per_level > 0}
          <!-- Source: PassiveSkill.cs:15-27 and PlayerSkills.cs:1169-1180 -->
          <div class="space-y-1">
            <h3 class="font-semibold">Song Duration Bonus</h3>
            <p class="font-mono">
              Song duration bonus = skill level &times; {formatPercent(
                skill.bard_song_duration_bonus_per_level,
              )}
            </p>
            <p class="font-mono">
              Song duration = base duration &times; (1 + learned song duration
              bonuses)
            </p>
          </div>
        {/if}

        {#if skill.is_bard_virtuosity}
          <!-- Source: BardVirtuositySkill.cs:7-12 -->
          <div class="space-y-1">
            <h3 class="font-semibold">Virtuosity</h3>
            <p class="font-mono">
              Virtuosity activates when active songs &gt;= active song limit.
            </p>
          </div>
        {/if}

        {#if skill.is_bard_song && usedByBardMercenary}
          <!-- Source: server-scripts/BardMercenarySkills.cs:OnStartServer,LateUpdate,RefreshAura,MaximumCombatSongs -->
          <div class="space-y-1">
            <h3 class="font-semibold">Mercenary Song Aura</h3>
            <p class="font-mono">
              <span class="block">Song duration = base duration.</span>
              <span class="block"
                >The mercenary refreshes the song every 2.5s while it stays
                active.</span
              >
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
            <p class="font-mono">
              Combat song limit = 2 below level 40, 3 from level 40 onward.
            </p>
            <p class="text-muted-foreground">
              Polyphony and learned song duration bonuses do not apply to the
              mercenary.
            </p>
          </div>
        {:else if skill.is_bard_song}
          <!-- Source: PlayerSkills.cs:911-917,1169-1180 -->
          <div class="space-y-1">
            <h3 class="font-semibold">Song Aura</h3>
            <p class="font-mono">
              Song duration = base duration &times; (1 + learned song duration
              bonuses)
            </p>
          </div>
          <!-- Source: PlayerSkills.cs:937-950,1156-1167. Current exported Polyphony data sets additional_active_bard_songs to 1. -->
          <div class="space-y-1">
            <h3 class="font-semibold">Active Song Limit</h3>
            <p class="font-mono">
              Active song limit = 2 + the bonus from Polyphony.
            </p>
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
            <p class="font-mono">
              Song strength = speed + physical damage % + magic damage % + haste
              + spell haste + accuracy
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
            <p class="font-mono">
              Song multiplier = 1 + min(max(CHA, 0) &times; 0.001, 2)
            </p>
            <p class="font-mono">
              Charmed damage = min(100%, skill value at level &times; song
              multiplier)
            </p>
            <p class="font-mono">
              Level difference = target level &minus; Bard level
            </p>
            <p class="font-mono">
              Base resist chance = clamp(target Magic Resist &times; 0.0005 +
              clamp(level difference &times; 0.005, &minus;0.1, 0.1), 0, 0.9)
            </p>
            <p class="font-mono">
              Resist chance = clamp(base resist chance + max(level difference,
              0) &times; 0.025 &minus; max(CHA, 0) &times; 0.0002, 0, 0.95)
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
          <!-- Source: BardFinalCadenceSkill.cs:17-68,78-135 -->
          <div class="space-y-1">
            <h3 class="font-semibold">Final Cadence</h3>
            <p class="font-mono">
              {#if usedByBardMercenary}
                Requires mercenary level &gt;= 50 and active songs = combat song
                limit.
              {:else}
                Requires active songs &gt;= active song limit.
              {/if}
            </p>
            <p class="font-mono">
              Base healing = round(skill healing at level &times; (1 +
              min(max(CHA, 0) &times; 0.001, 2)))
            </p>
            <p class="font-mono">
              Critical multiplier = 1 normally, 2 on a critical heal, or 3 on
              10% of critical heals
            </p>
            <p class="font-mono">
              Final healing = base healing &times; critical multiplier
            </p>
            <p class="text-muted-foreground">
              <span class="block"
                >The Bard's critical chance determines one roll shared by every
                recipient.</span
              >
              <span class="block"
                >Damage uses the same Charisma multiplier before the usual magic
                damage reductions.</span
              >
              <span class="block">Final Cadence does not heal familiars.</span>
              {#if usedByBardMercenary}
                <span class="block"
                  >The mercenary damages only enemies that target its owner, a
                  party member, or one of their pets.</span
                >
              {/if}
            </p>
          </div>
        {/if}

        <!-- A. Damage Formula (spec-driven, one block per distinct formula/context) -->
        {#if isDamageType && !isWildStrike && data.mechanicsSpec.damageContexts.length > 0 && hasActualDamage}
          <div class="space-y-3">
            <h3 class="font-semibold">Damage Formula</h3>
            {#each data.mechanicsSpec.damageContexts as ctx (ctx.formula)}
              <div>
                {#if data.mechanicsSpec.damageContexts.length > 1}
                  <p class="text-xs text-muted-foreground mb-1">
                    {ctx.casterLabels.join(", ")}
                  </p>
                {/if}
                <FormulaDisplay
                  display={renderFormulaDisplay(ctx.formula, skill.skill_type)}
                />
              </div>
            {/each}

            {#if skill.damage_percent}
              <p class="text-muted-foreground">
                Multiply the damage before reductions by {formatLinearPercent(
                  skill.damage_percent,
                )}.
              </p>
            {/if}

            <!-- Damage Pipeline (universal) -->
            <!-- Source: Combat.cs — DealDamageAt -->
            {#if !data.mechanicsSpec.damageContexts.some((c) => c.formula === "manaburn")}
              <div class="space-y-1">
                <h4 class="font-medium text-muted-foreground">
                  How Damage Is Calculated
                </h4>
                <ol class="list-decimal list-inside space-y-0.5 font-mono">
                  <li>Variance: &times;0.9&ndash;1.1</li>
                  <li>
                    Backstab: +10% damage when attacking from behind (Rogues
                    with Improved Backstab: +25% instead)
                  </li>
                  <li>
                    Level difference: &plusmn;2% per level (max &plusmn;20%)
                  </li>
                  <li>
                    Slayer reduction (boss or elite attacking a player or pet):
                    &minus;Slayer level &times; 10%
                  </li>
                  <li>
                    Enrage: non-spell attacks by monsters below 10% health deal
                    50–75% more damage.
                  </li>
                  {#if damageMechanics}
                    <li>
                      Damage reduction: &minus;ceil(damage &times;
                      clamp(target's {damageMechanics.stat}
                      &times; 0.0005, 0, 0.9))
                    </li>
                  {/if}
                  <li>Critical hit: &times;1.5</li>
                  <li>
                    Radiant Aether (15% on a critical hit, consumes one item):
                    &times;2 again, for &times;3 total
                  </li>
                </ol>
                {#if damageMechanics}
                  <!-- Source: server-scripts/Combat.cs:842-859 — each 100 Defense or matching Resist points reduces damage by 5%, up to 90% before rounding. -->
                  <p class="text-muted-foreground">
                    Every 100 points of {damageMechanics.avoidance === "block"
                      ? "Defense"
                      : "the matching Resist"} reduce the damage you take from a hit
                    by 5%, up to a 90% reduction before rounding.
                  </p>
                {/if}
              </div>
            {/if}

            <!-- Block/Resist Chance -->
            {#if damageMechanics && !data.mechanicsSpec.damageContexts.some((c) => c.formula === "manaburn")}
              <div class="space-y-1">
                <h4 class="font-medium text-muted-foreground">
                  {damageMechanics.avoidance === "block"
                    ? "Block/Miss Chance"
                    : "Resist Chance"}
                </h4>
                {#if damageMechanics.avoidance === "block"}
                  <!-- Source: Combat.cs:1310-1314 — GetProbResistMeleeDamage -->
                  <!-- Source: Combat.cs:272-284 — blockChance is defense × 0.0001 plus bonuses -->
                  <p class="font-mono">
                    clamp(<br />&nbsp;&nbsp;clamp(target's base block chance +
                    target's Defense &times; 0.0001 + buff bonuses, 0, 0.8)<br
                    />&nbsp;&nbsp;+ clamp((target level &minus; attacker level)
                    &times; 0.005, &minus;0.1, 0.1)<br />&nbsp;&nbsp;&minus;
                    attacker's Accuracy<br />, 0, 0.9)
                  </p>
                  <!-- Source: server-scripts/Combat.cs:305-317,1528-1531 — blockChance adds defense × 0.0001, and GetProbResistMeleeDamage then applies level difference and casterAccuracy. -->
                  <p class="text-muted-foreground">
                    Every 100 Defense adds 1 percentage point to block chance
                    before Accuracy and level difference.
                  </p>
                {:else}
                  <!-- Source: Combat.cs:1322-1349 — GetProbResistMagic/Fire/Cold/Poison/Disease -->
                  <p class="font-mono">
                    clamp(<br />&nbsp;&nbsp;target's {damageMechanics.stat}
                    &times; 0.0005<br />&nbsp;&nbsp;+ (target level &minus;
                    attacker level) &times; 0.005<br />&nbsp;&nbsp;&minus;
                    attacker's Accuracy<br />, 0, 0.9)
                  </p>
                  <!-- Source: server-scripts/Combat.cs:1540-1567 — GetProbResistMagic, Poison, Fire, Cold, and Disease each add magicResist, poisonResist, fireResist, coldResist, or diseaseResist × 0.0005. -->
                  <p class="text-muted-foreground">
                    Every 100 points of the matching Resist add 5 percentage
                    points to resist chance before Accuracy and level
                    difference.
                  </p>
                {/if}
                <!-- Source: Combat.cs — moving player gets -0.25 resist and +10% damage -->
                <dl
                  class="font-mono grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5"
                >
                  <dt>Moving target:</dt>
                  <dd>
                    resist chance &minus;25 percentage points, damage +10%
                  </dd>
                  <dt>Backstab:</dt>
                  <dd>resist chance &times; 0.8</dd>
                </dl>
              </div>
            {/if}
          </div>
        {/if}

        <!-- E. Aggro Formula -->
        {#if isDamageType && (skill.aggro?.base_value ?? 0) > 0}
          <div class="space-y-1">
            <h3 class="font-semibold">Aggro</h3>
            <p class="font-mono">Aggro = min(target health,</p>
            <ul class="font-mono list-none ml-4 space-y-0.5">
              <li>skill aggro + caster maximum health</li>
              <li>+ damage</li>
              <li>+ round(stunChance &times; stunTime &times; 10)</li>
              <li>+ round(fearChance &times; fearTime &times; 10)</li>
            </ul>
            <p class="font-mono">)</p>
          </div>
        {/if}

        <!-- B. Heal Formula (spec-driven, per caster context) -->
        {#if isHealType && !skill.is_resurrect_skill && data.mechanicsSpec.healContexts.length > 0}
          <div class="space-y-2">
            <h3 class="font-semibold">Healing Formula</h3>
            {#each data.mechanicsSpec.healContexts as ctx (ctx.bonusKind)}
              <div class="space-y-1">
                {#if data.mechanicsSpec.healContexts.length > 1}
                  <p class="text-xs text-muted-foreground mb-1">
                    {ctx.casterLabels.join(", ")}
                  </p>
                {/if}
                {#if ctx.bonusKind === "player_ranger"}
                  <!-- Source: Wisdom.cs — GetHealBonus(isRanger:true) → WIS×3×0.004, capped at 5.0 (500%) -->
                  <p class="font-mono">
                    Final Heal = Base Heal + round(Base Heal &times; min(WIS
                    &times; 3 &times; 0.004, 5.0))
                  </p>
                {:else if ctx.bonusKind === "player_other"}
                  <!-- Source: Wisdom.cs — GetHealBonus(isRanger:false) → WIS×0.004, capped at 5.0 -->
                  <p class="font-mono">
                    Final Heal = Base Heal + round(Base Heal &times; min(WIS
                    &times; 0.004, 5.0))
                  </p>
                {:else if ctx.bonusKind === "merc"}
                  <!-- Source: TargetHealSkill.cs — `caster is Pet { isMercenary: not false }` → pet.wisdom.GetHealBonus() -->
                  <!-- No Ranger×3 multiplier for merc — GetHealBonus() called without isRanger flag -->
                  <p class="font-mono">
                    Final Heal = Base Heal + round(Base Heal &times; min(WIS
                    &times; 0.004, 5.0))
                  </p>
                  <p class="text-muted-foreground">
                    <span class="block"
                      >Mercenaries use their own Wisdom to increase healing.</span
                    >
                    <span class="block"
                      >Ranger mercenaries do not receive the triple-Wisdom bonus
                      that Ranger players receive.</span
                    >
                  </p>
                {:else}
                  <p class="font-mono">Final Heal = Base Heal (no bonus)</p>
                {/if}
                {#if ctx.canCrit}
                  <p class="text-muted-foreground">
                    Critical Heal: 90% chance &times;2.0 | 10% chance &times;3.0
                  </p>
                {/if}
              </div>
            {/each}
          </div>
        {/if}

        <!-- C. Buff Scaling (spec-driven, per caster context) -->
        <!-- Source: PassiveSkill.cs:20-22 — Apply() is a no-op; passives grant flat values, no WIS scaling -->
        {#if isBuffType && hasAttributeScaledBonuses && skill.skill_type !== "passive" && data.mechanicsSpec.buffContexts.length > 0}
          <div class="space-y-3">
            <h3 class="font-semibold">
              {skill.is_bard_song ? "Song Scaling" : "Buff Scaling"}
            </h3>
            {#each data.mechanicsSpec.buffContexts as ctx (`${ctx.bonusAttrSource}:${ctx.isAreaBuff}`)}
              <div class="space-y-1">
                {#if data.mechanicsSpec.buffContexts.length > 1}
                  <p class="text-xs text-muted-foreground mb-1">
                    {ctx.casterLabels.join(", ")}
                  </p>
                {/if}
                {#if ctx.bonusAttrSource === "none"}
                  <p class="text-muted-foreground">
                    This buff receives no attribute bonus.
                  </p>
                {:else if ctx.bonusAttrSource === "player_cha"}
                  <!-- Source: BardSongSkill.cs:42-51, Buff.cs:45-275, BuffSkill.cs:ScaleFearResistChanceBonus, BuffSkill.cs:ScaleHealingPerSecondBonus, and Charisma.cs:21-36 -->
                  {#if hasBardFlatDamageScaling}
                    <p class="font-mono">
                      Damage per second = abs(skill value at level) +
                      round(max(CHA, 0) &times; {formatNumber(
                        skill.damage_over_time_bonus_per_charisma_point,
                      )})
                    </p>
                  {/if}
                  {#if hasBardIntegerScaling || hasBardPercentageScaling}
                    <p class="font-mono">
                      Song multiplier = 1 + min(max(CHA, 0) &times; 0.001, 2)
                    </p>
                  {/if}
                  {#if hasBardIntegerScaling}
                    <p class="font-mono">
                      final value = round(base value at skill level &times; song
                      multiplier)
                    </p>
                  {/if}
                  {#if hasBardPercentageScaling}
                    <p class="font-mono">
                      {#if skill.fear_resist_chance_bonus_cap > 0}
                        Fear Resist = min(base value at skill level &times; song
                        multiplier,
                        {formatPercent(skill.fear_resist_chance_bonus_cap)})
                      {:else}
                        final value = base value at skill level &times; song
                        multiplier
                      {/if}
                    </p>
                  {/if}
                  {#if hasNonZeroField(skill.healing_per_second_bonus)}
                    <p class="text-muted-foreground">
                      Each healing tick can critically heal for 1.5&times; at
                      the Bard's critical chance.
                    </p>
                  {/if}
                {:else}
                  {#if ctx.bonusAttrSource === "player_ranger_wis"}
                    <!-- Source: TargetBuffSkill.cs:419 — Ranger → wisdom.value * 3 -->
                    <p class="font-mono">
                      Attribute contribution = WIS &times; 3 (Ranger Wisdom
                      tripled)
                    </p>
                  {:else if ctx.bonusAttrSource === "player_wis_con_cha_half"}
                    <!-- Source: AreaBuffSkill.cs:14-17,52 — Leadership uses GetLeadershipAttributeBonus(player3) -->
                    <p class="font-mono">
                      Attribute contribution = round((WIS + CON + CHA) / 2)
                    </p>
                  {:else if ctx.bonusAttrSource === "player_wis_con_avg"}
                    <!-- Source: AreaBuffSkill.cs:52 — ordinary player-cast mercenary buffs use round((WIS+CON)/2) -->
                    <p class="font-mono">
                      Attribute contribution = round((WIS + CON) / 2)
                    </p>
                  {:else if ctx.bonusAttrSource === "merc_wis"}
                    <!-- Source: TargetBuffSkill.cs:419 / AreaBuffSkill.cs:25 — pet3.wisdom.value -->
                    <p class="font-mono">Attribute contribution = WIS</p>
                  {:else if ctx.bonusAttrSource === "player_level"}
                    <!-- Source: AreaBuffSkill.cs:34-37 — isRelic → num2 = caster.level.current * 10 -->
                    <p class="font-mono">
                      Attribute contribution = skill user's level &times; 10
                    </p>
                  {:else}
                    <!-- player_wis -->
                    <p class="font-mono">Attribute contribution = WIS</p>
                  {/if}
                  <dl
                    class="grid grid-cols-1 sm:grid-cols-[12rem_1fr] gap-x-4 gap-y-1 font-mono"
                  >
                    {#if hasNonZeroField(skill.health_max_bonus)}
                      <dt class="text-muted-foreground">Max Health</dt>
                      <dd>
                        skill value at level + attribute contribution &times; 2
                      </dd>
                    {/if}
                    {#if hasNonZeroField(skill.defense_bonus)}
                      <dt class="text-muted-foreground">Defense</dt>
                      <dd>
                        skill value at level + attribute contribution &times;
                        0.15
                      </dd>
                    {/if}
                    {#if hasNonZeroField(skill.magic_resist_bonus)}
                      <dt class="text-muted-foreground">Magic Resist</dt>
                      <dd>
                        skill value at level + attribute contribution &times;
                        0.15
                      </dd>
                    {/if}
                    {#if hasNonZeroField(skill.ward_bonus)}
                      <dt class="text-muted-foreground">Ward</dt>
                      {#if ctx.isAreaBuff}
                        <!-- Source: AreaBuffSkill.cs — scroll runs before wardBonus transform (different order vs TargetBuff) -->
                        <dd>
                          Ward at skill level + attribute contribution &times; 2
                        </dd>
                      {:else}
                        <dd>
                          Ward at skill level + attribute contribution &times; 2
                        </dd>
                      {/if}
                    {/if}
                    {#if hasNonZeroField(skill.damage_shield)}
                      <dt class="text-muted-foreground">Damage Shield</dt>
                      <dd>
                        skill value at level + attribute contribution &times;
                        0.75
                      </dd>
                    {/if}
                    {#if hasNonZeroField(skill.poison_resist_bonus)}
                      <dt class="text-muted-foreground">Poison Resist</dt>
                      <dd>
                        skill value at level + attribute contribution &times;
                        0.15
                      </dd>
                    {/if}
                    {#if hasNonZeroField(skill.fire_resist_bonus)}
                      <dt class="text-muted-foreground">Fire Resist</dt>
                      <dd>
                        skill value at level + attribute contribution &times;
                        0.15
                      </dd>
                    {/if}
                    {#if hasNonZeroField(skill.cold_resist_bonus)}
                      <dt class="text-muted-foreground">Cold Resist</dt>
                      <dd>
                        skill value at level + attribute contribution &times;
                        0.15
                      </dd>
                    {/if}
                    {#if hasNonZeroField(skill.disease_resist_bonus)}
                      <dt class="text-muted-foreground">Disease Resist</dt>
                      <dd>
                        skill value at level + attribute contribution &times;
                        0.15
                      </dd>
                    {/if}
                    {#if hasNonZeroField(skill.healing_per_second_bonus)}
                      <dt class="text-muted-foreground">
                        {isNegativeLinear(skill.healing_per_second_bonus)
                          ? "Damage per second"
                          : "Healing per second"}
                      </dt>
                      {#if isNegativeLinear(skill.healing_per_second_bonus)}
                        <!-- Source: Wisdom.cs:118-121 — GetHealingPerSecondBuffBonus returns 0 for healingPerSecondBonus <= 0; a DoT tick gets no attribute scaling -->
                        <dd>skill value at level</dd>
                      {:else if skill.duration_base >= 60}
                        <!-- Source: Wisdom.cs:116-128 — buffs 60s or longer add flat bonusAttribute × 0.3 -->
                        <dd>
                          skill value at level + attribute contribution &times;
                          0.3
                        </dd>
                      {:else}
                        <!-- Source: Wisdom.cs:116-128 — buffs under 60s scale base by min(bonusAttribute × 0.004, 5.0) -->
                        <dd>
                          skill value at level &times; (1 + min(attribute
                          contribution &times; 0.004, 5.0))
                        </dd>
                      {/if}
                    {/if}
                    {#if skill.id === "leadership" && hasNonZeroField(skill.damage_bonus)}
                      <!-- Source: Buff.cs:64-67 — Leadership-only: damageBonus.Get(level) + bonusAttribute on positive branch -->
                      <dt class="text-muted-foreground">Damage</dt>
                      <dd>skill value at level + attribute contribution</dd>
                    {/if}
                    {#if skill.id === "leadership" && hasNonZeroField(skill.magic_damage_bonus)}
                      <!-- Source: Buff.cs:84-87 — Leadership-only: magicDamageBonus.Get(level) + bonusAttribute on positive branch -->
                      <dt class="text-muted-foreground">Magic Damage</dt>
                      <dd>skill value at level + attribute contribution</dd>
                    {/if}
                  </dl>
                {/if}
              </div>
            {/each}
          </div>
        {/if}

        <!-- C2. Attack Timing (spec-driven, per caster context) -->
        <!-- Source: Skills.cs:762-773, Player.cs:2783, Skills.cs:814-815 -->
        {#if data.mechanicsSpec.timingContexts.length > 0}
          <div class="space-y-2">
            <h3 class="font-semibold">Attack Timing</h3>
            {#each data.mechanicsSpec.timingContexts as ctx (ctx.model)}
              <div>
                {#if data.mechanicsSpec.timingContexts.length > 1}
                  <p class="text-xs text-muted-foreground mb-1">
                    {ctx.casterLabels.join(", ")}
                  </p>
                {/if}
                {#if ctx.model === "player_auto"}
                  <!-- Source: Player.cs:2783 — refractoryPeriod = clamp(delay*(1-haste)/25, 0.25, 2.0) -->
                  <!-- Source: Skills.cs:772 — player cooldownEnd = now + cooldown (no haste reduction) -->
                  <p class="font-mono">interval = cast time + recovery time</p>
                  <p class="font-mono">
                    recovery time = clamp(weapon delay &times; (1 &minus; haste)
                    / 25, 0.25s, 2s)
                  </p>
                  <p class="text-muted-foreground">
                    <span class="block"
                      >Haste shortens the recovery time between auto attacks,
                      but not the cooldown.</span
                    >
                    <span class="block"
                      >Auto attacks can trigger weapon effects on hit.</span
                    >
                  </p>
                  {#if ctx.casterLabels.some((l) => l.startsWith("Warrior") || l.startsWith("Rogue"))}
                    <p class="text-muted-foreground">
                      Auto attacks generate rage equal to 25% of the damage
                      dealt on hit.
                    </p>
                  {/if}
                {:else if ctx.model === "player_spell"}
                  <!-- Source: server-scripts/Skills.cs:902-904, server-scripts/Combat.cs:346-358 -->
                  <!-- Source: server-scripts/Player.cs:refractoryPeriodSkill — refractoryPeriodSkill = 0.75f; blocks next cast after FinishCast -->
                  <p class="font-mono">
                    interval = cast time &times; (1 &minus; spell haste) + 0.75s
                  </p>
                  <p class="text-muted-foreground">
                    <span class="block"
                      >Spell haste shortens cast time by up to 50%.</span
                    >
                    <span class="block"
                      >The 0.75-second recovery time before the next cast does
                      not change.</span
                    >
                  </p>
                {:else if ctx.model === "merc_auto"}
                  <!-- Source: Skills.cs:766-768 — followupDefaultAttack && !isSpell → cooldown * (1 - haste) -->
                  <p class="font-mono">
                    interval = cast time + cooldown &times; (1 &minus; haste)
                  </p>
                  <p class="text-muted-foreground">
                    <span class="block"
                      >Weapon delay does not affect mercenary auto attacks.</span
                    >
                    <span class="block"
                      >Haste shortens their cooldown by up to 80%.</span
                    >
                  </p>
                {:else if ctx.model === "merc_spell"}
                  <!-- Source: server-scripts/Skills.cs:902-904, server-scripts/Skills.cs:1009-1012, server-scripts/Combat.cs:346-358 -->
                  <p class="font-mono">
                    interval = cast time &times; (1 &minus; spell haste) +
                    cooldown
                  </p>
                  <p class="text-muted-foreground">
                    <span class="block"
                      >Spell haste shortens cast time by up to 50%.</span
                    >
                    <span class="block">It does not shorten the cooldown.</span>
                  </p>
                {:else if ctx.model === "monster"}
                  <!-- Source: Monster.cs:1625, Npc.cs:1266 — FinishCastMeleeAttackMonster (haste-reduced for all monster skills) -->
                  <p class="font-mono">
                    interval = cast time + cooldown &times; (1 &minus; haste)
                  </p>
                {:else}
                  <!-- companion: companions, familiars -->
                  <!-- Source: server-scripts/Pet.cs -->
                  <!-- Source: server-scripts/Skills.cs:1009-1012 — companion cooldown remains flat -->
                  <p class="font-mono">interval = cast time + cooldown</p>
                  <p class="text-muted-foreground">
                    Haste does not shorten this cooldown.
                  </p>
                {/if}
              </div>
            {/each}
          </div>
        {/if}

        <!-- D. Debuff Scaling (spec-driven, per caster context) -->
        <!-- Source: TargetDebuffSkill.cs:265-279 — bonusAttribute per caster type and skill flags. -->
        <!-- Non-Player casters (monsters, NPCs, non-merc pets) fall through to bonusAttribute = 0. -->
        {#if isDebuffType && data.mechanicsSpec.debuffContexts.length > 0}
          <div class="space-y-3">
            <h3 class="font-semibold">
              {skill.is_bard_song ? "Song Scaling" : "Debuff Scaling"}
            </h3>
            {#each data.mechanicsSpec.debuffContexts as ctx (ctx.bonusAttrKind)}
              <div class="space-y-1">
                {#if data.mechanicsSpec.debuffContexts.length > 1}
                  <p class="text-xs text-muted-foreground mb-1">
                    {ctx.casterLabels.join(", ")}
                  </p>
                {/if}
                {#if ctx.bonusAttrKind === "none"}
                  <p class="text-muted-foreground">
                    This debuff receives no attribute bonus.
                  </p>
                {:else}
                  {#if skill.scales_with_charisma}
                    <!-- Source: Buff.cs:70-275, BuffSkill.cs:ScaleHealingPerSecondBonus, and Charisma.cs:21-36 -->
                    {#if hasBardFlatDamageScaling}
                      <p class="font-mono">
                        Damage per second = abs(skill value at level) +
                        round(max(CHA, 0) &times; {formatNumber(
                          skill.damage_over_time_bonus_per_charisma_point,
                        )})
                      </p>
                    {/if}
                    {#if hasBardIntegerScaling || hasBardPercentageScaling}
                      <p class="font-mono">
                        Song multiplier = 1 + min(max(CHA, 0) &times; 0.001, 2)
                      </p>
                    {/if}
                    {#if hasBardIntegerScaling}
                      <p class="font-mono">
                        final value = round(base value at skill level &times;
                        song multiplier)
                      </p>
                    {/if}
                    {#if hasBardPercentageScaling}
                      <p class="font-mono">
                        final value = base value at skill level &times; song
                        multiplier
                      </p>
                    {/if}
                  {:else}
                    <p class="font-mono">
                      Attribute contribution = {ctx.bonusAttrKind === "str"
                        ? "STR"
                        : ctx.bonusAttrKind === "dex"
                          ? "DEX"
                          : "INT"}
                    </p>
                    <!-- Source: server-scripts/Buff.cs:97-111 — defense getter, negative branch: bonusAttribute × 0.4 -->
                    <dl
                      class="grid grid-cols-1 sm:grid-cols-[16rem_1fr] gap-x-4 gap-y-1 font-mono"
                    >
                      {#if hasNonZeroField(skill.defense_bonus)}
                        <dt class="text-muted-foreground">Defense reduction</dt>
                        <dd>
                          skill value at level + attribute contribution &times;
                          0.4
                        </dd>
                      {/if}
                      {#if hasNonZeroField(skill.magic_resist_bonus)}
                        <dt class="text-muted-foreground">
                          Magic Resist reduction
                        </dt>
                        <dd>
                          skill value at level + attribute contribution &times;
                          0.4
                        </dd>
                      {/if}
                      {#if hasNonZeroField(skill.poison_resist_bonus)}
                        <dt class="text-muted-foreground">
                          Poison Resist reduction
                        </dt>
                        <dd>
                          skill value at level + attribute contribution &times;
                          0.4
                        </dd>
                      {/if}
                      {#if hasNonZeroField(skill.fire_resist_bonus)}
                        <dt class="text-muted-foreground">
                          Fire Resist reduction
                        </dt>
                        <dd>
                          skill value at level + attribute contribution &times;
                          0.4
                        </dd>
                      {/if}
                      {#if hasNonZeroField(skill.cold_resist_bonus)}
                        <dt class="text-muted-foreground">
                          Cold Resist reduction
                        </dt>
                        <dd>
                          skill value at level + attribute contribution &times;
                          0.4
                        </dd>
                      {/if}
                      {#if hasNonZeroField(skill.disease_resist_bonus)}
                        <dt class="text-muted-foreground">
                          Disease Resist reduction
                        </dt>
                        <dd>
                          skill value at level + attribute contribution &times;
                          0.4
                        </dd>
                      {/if}
                      {#if hasNonZeroField(skill.damage_bonus)}
                        <dt class="text-muted-foreground">Damage reduction</dt>
                        <dd>
                          skill value at level + attribute contribution &times;
                          0.5
                        </dd>
                      {/if}
                      {#if hasNonZeroField(skill.magic_damage_bonus)}
                        <dt class="text-muted-foreground">
                          Magic Damage reduction
                        </dt>
                        <dd>
                          skill value at level + attribute contribution &times;
                          0.5
                        </dd>
                      {/if}
                      {#if hasNonZeroField(skill.healing_per_second_bonus)}
                        <dt class="text-muted-foreground">Damage per second</dt>
                        {#if skill.is_poison_debuff || skill.is_disease_debuff}
                          <!-- Source: server-scripts/Skills.cs:1609-1625 — the poison and disease branch adds RoundToInt(bonusAttribute * 1.5) before resistance. -->
                          <dd>
                            skill value at level + round(attribute contribution
                            &times; 1.5)
                          </dd>
                        {:else if skill.is_melee_debuff}
                          <!-- melee (str × 0.5) or scroll of melee type -->
                          <dd>
                            skill value at level + attribute contribution
                            &times; 0.5
                          </dd>
                        {:else}
                          <!-- other (int × 1.25) or scroll of other type -->
                          <dd>
                            skill value at level + attribute contribution
                            &times; 1.25
                          </dd>
                        {/if}
                      {/if}
                    </dl>
                  {/if}
                {/if}
              </div>
            {/each}
          </div>
        {/if}

        <!-- D2. Resist Chance — shown for debuffs and dispels; cleanse has no resist roll, and Bard charm uses its custom formula above. -->
        <!-- Source: server-scripts/Combat.cs:1523-1556 — GetProbResistMeleeDebuff adds defense × 0.0005, and each other GetProbResist* adds its matching resist × 0.0005, before diff_levels and casterAccuracy; resist gate TargetDebuffSkill.cs:105-143 / AreaDebuffSkill.cs:104-139 -->
        {#if isDebuffType && !skill.is_cleanse && !skill.is_bard_charm && (skill.is_melee_debuff || skill.is_poison_debuff || skill.is_fire_debuff || skill.is_cold_debuff || skill.is_disease_debuff || skill.is_magic_debuff)}
          <div class="space-y-1">
            <h4 class="font-medium text-muted-foreground">Resist Chance</h4>
            <p class="font-mono">
              clamp(<br />&nbsp;&nbsp;target's {skill.is_melee_debuff
                ? "Defense"
                : skill.is_poison_debuff
                  ? "Poison Resist"
                  : skill.is_fire_debuff
                    ? "Fire Resist"
                    : skill.is_cold_debuff
                      ? "Cold Resist"
                      : skill.is_disease_debuff
                        ? "Disease Resist"
                        : "Magic Resist"} &times; 0.0005<br />&nbsp;&nbsp;+
              clamp((target level &minus; skill user level) &times; 0.005,
              &minus;0.1, 0.1)<br />&nbsp;&nbsp;&minus; skill user's Accuracy<br
              />, 0, 0.9)
            </p>
            <!-- Source: server-scripts/Combat.cs:1523-1556 — each 100 points of the matching Defense or Resist add 5 percentage points before level difference and Accuracy. -->
            <p class="text-muted-foreground">
              Every 100 points of the target's {skill.is_melee_debuff
                ? "Defense"
                : "matching Resist"} add 5 percentage points to resist chance before
              level difference and Accuracy.
            </p>
          </div>
        {/if}

        <!-- E. Cleanse Resistance (on debuff skill pages) -->
        <!-- Source: server-scripts/Buff.cs:19 (3 counters); BuffSkill.cs:470-492 (GetCleanseCountersRemoved); TargetBuffSkill.cs:134-158 (HasMatchingCleanseDebuff), 236-458 (Apply cleanse branch); Skills.cs:1611-1616 (DoT per-counter scaling) -->
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
                  >Each roll has a {formatPercent(
                    1 - skill.prob_ignore_cleanse,
                  )} chance, multiplied by (1 + the cleanser's Accuracy) and capped
                  at 100%.</span
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
        <!-- Source: server-scripts/RelicItem.cs:20-35 (finite-charge item gate); BuffSkill.cs:470-492 (GetCleanseCountersRemoved); TargetBuffSkill.cs:134-158 (HasMatchingCleanseDebuff), 236-458 (Apply cleanse branch); Buff.cs:19 (3 counters); Skills.cs:1611-1616 (DoT per-counter scaling) -->
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
                >Each matching debuff has three layers, and the cleanse removes
                the debuff only after all three are gone.</span
              >
              <span class="block"
                >If the debuff has 0% Cleanse Resist, one cast removes all three
                layers.</span
              >
              <span class="block"
                >Otherwise, the cast always removes one layer and rolls twice to
                remove one additional layer per roll.</span
              >
              <span class="block"
                >Each roll has a (100% &minus; Cleanse Resist) &times; (1 + the
                cleanser's Accuracy) chance, capped at 100%.</span
              >
              <span class="block"
                >A debuff with 100% Cleanse Resist cannot be cleansed.</span
              >
              <span class="block"
                >For damage-over-time debuffs, each tick deals 85% of its full
                damage at two layers or 70% at one layer.</span
              >
            </p>
          </div>
        {/if}

        <!-- F. Dispel Mechanics -->
        {#if skill.is_dispel}
          {@const playerCast =
            skill.is_scroll || skill.player_classes.length > 0}
          <div class="space-y-1">
            <!-- Source: server-scripts/TargetDebuffSkill.cs:105-143 (resist gate), 173-205,209-234,238-250 (removal); AreaDebuffSkill.cs:104-139 (resist gate), 164-205,209-233,238-258 (removal); Combat.cs:1529-1556 GetProbResistMagic/Disease -->
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
                  ><span class="font-medium">1. Resist.</span> Your Accuracy lowers
                  the monster's chance to resist this skill (shown above).</span
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
                  <p class="font-mono">
                    Dispel Resist reduction = clamp(round(Mastery% &divide; 5),
                    1, {skill.max_level}) &times; 0.01
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
                  <p class="font-mono">
                    Dispel Resist reduction = Accuracy &times; 0.5
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
                  ><span class="font-medium">1. Resist.</span> You roll to resist
                  this skill (chance shown above).</span
                >
                <span class="block"
                  >The monster's Accuracy lowers your chance to resist; matching
                  resistance raises it.</span
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
          <!-- Source: server-scripts/TargetDamageSkill.cs:239,282 (Apply) -->
          <!-- Source: server-scripts/TargetProjectileSkill.cs:221-222,252-256 (Apply) -->
          <!-- Source: server-scripts/Combat.cs:368,774,840-847,944-955 (DealDamageAt) -->
          <div class="space-y-1">
            <h3 class="font-semibold">Wild Strike</h3>
            <FormulaDisplay display={renderWildStrikeFormulaDisplay()} />
          </div>
        {/if}
        {#if skill.id === "parry"}
          <!-- Source: server-scripts/Combat.cs:1106-1119, 1556-1566; Player.cs:12047-12051 -->
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
                >Your counterattack deals half the health damage the hit would
                have dealt after damage reduction, ward, and mana shield.</span
              >
              <span class="block"
                >The game rounds that damage and limits it to 1–5,000.</span
              >
              <span class="block"
                >Hits fully absorbed before health damage do not trigger Parry.</span
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
        {#if hasLinearValue(skill.cast_time) && skill.is_spell && !skill.is_scroll}
          <!-- Source: Skills.cs:673-675 — castTimeEnd reduction only when isSpell -->
          <p class="text-muted-foreground">
            Cast time = cast time &times; (1 &minus; spell haste)
          </p>
        {/if}
        {#if hasLinearValue(skill.fear_chance)}
          <!-- Source: server-scripts/Combat.cs:978-1011 — DealDamageAt fear branch -->
          <div class="space-y-1">
            <h3 class="font-semibold">Fear</h3>
            <p class="text-muted-foreground">
              <span class="block"
                >Fear applies only when the skill's fear roll succeeds and the
                target fails a separate fear resist roll.</span
              >
              <span class="block"
                >Fear lasts a random duration between half and all of the
                skill's fear duration.</span
              >
            </p>
          </div>
        {/if}
        {#if skill.fear_resist_chance_bonus}
          <!-- Source: server-scripts/Combat.cs:276-288 — fearResistChance property -->
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
                  )} to that chance after Charisma scaling.</span
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
          <!-- Source: server-scripts/Combat.cs:847-884 — DealDamageAt stun branch -->
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
          <!-- Source: server-scripts/Combat.cs:86 (knockbackTime = 0.25f), 88 (knockbackObstacleDamageBonus = 0.0125f), 1348-1369 -->
          <div class="space-y-1">
            <h3 class="font-semibold">Knockback</h3>
            <p class="text-muted-foreground">
              <span class="block"
                >Knockback applies only if stun and fear did not apply on the
                same hit and the target is not already stunned.</span
              >
              <span class="block"
                >It pushes the target back{#if skill.knockback_distance}
                  {skill.knockback_distance}m{/if} and stuns them for 0.25 seconds.</span
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
                >Every 2 seconds, a rooted monster has a chance to break free
                equal to its Magic Resist divided by 1,000, limited to 5–95%.</span
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
          <!-- Source: server-scripts/Skills.cs:1547-1552 (BreakMezz — entity.speed <= -50f) -->
          <!-- Source: server-scripts/Combat.cs:DealDamageAt (any damage > 0 calls BreakMezz) -->
          <!-- Source: server-scripts/Monster.cs:1546-1560 (monster self-break roll every 6s) -->
          <!-- Source: server-scripts/TargetDebuffSkill.cs:141 (boss/elite auto-resist speedBonus < -10) -->
          <div class="space-y-1">
            <h3 class="font-semibold">Sleep</h3>
            <p class="text-muted-foreground">
              <span class="block"
                >Sleep stops movement, but any direct damage or damage-over-time
                tick wakes the target.</span
              >
              <span class="block"
                >Bosses and elite monsters always resist sleep.</span
              >
              <span class="block"
                >Every 6 seconds, a sleeping monster has a chance to wake equal
                to its Magic Resist divided by 1,000, limited to 5–95%.</span
              >
            </p>
          </div>
        {/if}
        {#if skill.is_teleport}
          <!-- Source: server-scripts/AreaBuffSkill.cs:126-139 — isTeleport branch -->
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
          <!-- Source: server-scripts/Combat.cs:313-323 (blockChance property) -->
          <!-- Source: server-scripts/Skills.cs:539-554 (GetBlockChanceBonus) -->
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
          <!-- Source: server-scripts/Combat.cs:1438-1441 (GetProbResistMeleeDamage, all GetProbResist*) -->
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
          <!-- Source: server-scripts/Combat.cs:280-295 (criticalChance), crit branch in DealDamageAt -->
          <div class="space-y-1">
            <h3 class="font-semibold">Critical Chance</h3>
            <p class="text-muted-foreground">
              <span class="block"
                >This skill adds to the attacker's critical hit chance, capped
                at 70%.</span
              >
              <span class="block"
                >Critical hits deal 1.5 times the damage of a noncritical hit.</span
              >
            </p>
          </div>
        {/if}
        {#if hasLinearValue(skill.critical_resist_bonus)}
          <!-- Source: server-scripts/Combat.cs:291-303 (criticalResist, clamped 0-1), 512-517 (ApplyCriticalResistToMultiplier), 852-867 (crit damage), Dexterity.cs:34-37 -->
          <div class="space-y-1">
            <h3 class="font-semibold">Critical Resist</h3>
            <p class="text-muted-foreground">
              <span class="block"
                >Critical Resist reduces the extra damage from critical hits.</span
              >
              <span class="block"
                >The critical multiplier is 1 + (base − 1) × (1 − Critical
                Resist), where base is 1.5 (or 3 with Radiant Aether).</span
              >
              <span class="block"
                >At 100% Critical Resist, a critical hit deals the same damage
                as an ordinary hit.</span
              >
              <span class="block"
                >Each positive point of Dexterity adds 0.05 percentage points of
                Critical Resist.</span
              >
              <span class="block"
                >Gear and buffs can add more, up to a total of 100%.</span
              >
            </p>
          </div>
        {/if}
        {#if hasLinearValue(skill.lifetap_percent)}
          <!-- Source: server-scripts/Combat.cs:1056-1060 (lifetap heal after damage) -->
          <div class="space-y-1">
            <h3 class="font-semibold">Lifetap</h3>
            <p class="text-muted-foreground">
              <span class="block"
                >Lifetap heals the attacker for a percentage of the health
                damage dealt after damage reduction and critical-hit bonuses.</span
              >
              <span class="block">The game rounds the healing down.</span>
            </p>
          </div>
        {/if}
        {#if skill.break_armor_prob > 0}
          <!-- Source: server-scripts/Combat.cs:539-567 (break armor roll, DecreaseDurability) -->
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
        {#if hasLinearValue(skill.heal_on_hit_percent)}
          <!-- Source: server-scripts/Combat.cs:883-897 (heal on hit, melee non-spell only) -->
          <div class="space-y-1">
            <h3 class="font-semibold">Heal on Hit</h3>
            <p class="text-muted-foreground">
              <span class="block"
                >Heal on Hit restores a percentage of melee damage dealt by
                non-spell attacks with a cast range below 2.</span
              >
              <span class="block"
                >Bonuses from multiple active buffs add together.</span
              >
            </p>
          </div>
        {/if}
        {#if hasLinearValue(skill.cooldown_reduction_percent)}
          <!-- Source: server-scripts/TargetBuffSkill.cs:266-281 (instant CD reduction on buff apply) -->
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
          <!-- Source: server-scripts/Combat.cs:886-896,898-919,934-944,796-820 (damage_shield reflect block; gated by !isProcWeapon && !isScroll) -->
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
                >Reflected damage increases by 0.75 per point of the wearer's
                Wisdom.</span
              >
              <span class="block"
                >Every 100 points of the attacker's matching Resist reduce
                reflected damage by 5%, up to a 90% reduction.</span
              >
              <span class="block"
                >The final damage varies randomly by &plusmn;10%.</span
              >
            </p>
          </div>
        {/if}
        {#if skill.is_blindness}
          <!-- Source: server-scripts/Player.cs:UserCode_TargetRpcAddBlind and UserCode_TargetRpcRemoveBlind -->
          <!-- Source: server-scripts/Skills.cs:1213-1215 (isBlindness check, Player only) -->
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

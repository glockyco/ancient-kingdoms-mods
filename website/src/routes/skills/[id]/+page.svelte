<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import * as Card from "$lib/components/ui/card";
  import type { PageData } from "./$types";
  import type { LinearValue } from "$lib/types/skills";
  import * as Tabs from "$lib/components/ui/tabs";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import Clock from "@lucide/svelte/icons/clock";
  import Zap from "@lucide/svelte/icons/zap";
  import Swords from "@lucide/svelte/icons/swords";
  import Heart from "@lucide/svelte/icons/heart";
  import Target from "@lucide/svelte/icons/target";
  import ScrollText from "@lucide/svelte/icons/scroll-text";
  import Gem from "@lucide/svelte/icons/gem";
  import DungeonRestrictionBadge from "$lib/components/DungeonRestrictionBadge.svelte";
  import SkillEffect from "$lib/components/SkillEffect.svelte";
  import MonsterTypeIcon from "$lib/components/MonsterTypeIcon.svelte";
  import Skull from "@lucide/svelte/icons/skull";
  import Cat from "@lucide/svelte/icons/cat";
  import Star from "@lucide/svelte/icons/star";
  import Ghost from "@lucide/svelte/icons/ghost";
  import TrendingUp from "@lucide/svelte/icons/trending-up";
  import FlaskConical from "@lucide/svelte/icons/flask-conical";

  let { data }: { data: PageData } = $props();

  const skill = $derived(data.skill);

  function formatLinear(
    value: LinearValue | null,
    suffix: string = "",
  ): string {
    if (!value) return "-";
    const base = formatNumber(value.base_value);
    if (value.bonus_per_level === 0) {
      return `${base}${suffix}`;
    }
    const bonus = formatNumber(value.bonus_per_level);
    return `${base} (+${bonus}/lvl)${suffix}`;
  }

  function formatLinearPercent(value: LinearValue | null): string {
    if (!value) return "-";
    const basePct = formatPercent(value.base_value);
    if (value.bonus_per_level === 0) {
      return basePct;
    }
    const bonusPct = formatPercent(value.bonus_per_level);
    return `${basePct} (+${bonusPct}/lvl)`;
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
    if (perLevel === 0) return `${formatNumber(base)}s`;
    return `${formatNumber(base)}s (+${formatNumber(perLevel)}s/lvl)`;
  }

  function hasLinearValue(value: LinearValue | null): boolean {
    if (!value) return false;
    return value.base_value !== 0 || value.bonus_per_level !== 0;
  }

  function convertTooltip(text: string | null): string {
    if (!text) return "";
    return text
      .replace(/<color=(#[0-9A-Fa-f]{6})>/g, '<span style="color:$1">')
      .replace(/<\/color>/g, "</span>")
      .replace(/\n/g, "<br>");
  }

  const CLASS_LABELS: Record<string, string> = {
    warrior: "Warrior",
    ranger: "Ranger",
    cleric: "Cleric",
    rogue: "Rogue",
    wizard: "Wizard",
    druid: "Druid",
  };

  const SKILL_TYPE_LABELS: Record<string, string> = {
    target_damage: "Target Damage",
    area_damage: "Area Damage",
    frontal_damage: "Frontal Damage",
    target_projectile: "Target Projectile",
    frontal_projectiles: "Frontal Projectiles",
    target_heal: "Target Heal",
    area_heal: "Area Heal",
    target_buff: "Target Buff",
    area_buff: "Area Buff",
    target_debuff: "Target Debuff",
    area_debuff: "Area Debuff",
    passive: "Passive",
    summon: "Summon",
    summon_monsters: "Summon Monsters",
    area_object_spawn: "Object Spawn",
  };

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

  // Fields that actually scale with WIS at runtime (Buff.cs — bonusAttribute applied)
  // Excludes: speed_bonus, damage_percent_bonus, magic_damage_percent_bonus, haste_bonus,
  // spell_haste_bonus, critical_chance_bonus, accuracy_bonus, block_chance_bonus,
  // mana_max_bonus, energy_max_bonus, *_percent_bonus, cooldown_reduction_percent, heal_on_hit_percent,
  // positive damage_bonus / magic_damage_bonus (only negative values use bonusAttribute)
  const hasWisScaledBonuses = $derived(
    !!(
      skill.health_max_bonus ||
      skill.defense_bonus ||
      skill.magic_resist_bonus ||
      skill.poison_resist_bonus ||
      skill.fire_resist_bonus ||
      skill.cold_resist_bonus ||
      skill.disease_resist_bonus ||
      skill.healing_per_second_bonus ||
      skill.damage_shield ||
      skill.ward_bonus
    ),
  );

  // Fields that scale with DEX/INT/STR on debuff skills at runtime (TargetDebuffSkill.cs — bonusAttribute)
  // DoT (healing_per_second_bonus < 0), resist reductions, damage/magic damage reductions
  // Source: server-scripts/Skills.cs:1108-1266, TargetDebuffSkill.cs:268-275
  const hasDebuffAttrScaling = $derived(
    !!(
      skill.healing_per_second_bonus ||
      skill.defense_bonus ||
      skill.magic_resist_bonus ||
      skill.poison_resist_bonus ||
      skill.fire_resist_bonus ||
      skill.cold_resist_bonus ||
      skill.disease_resist_bonus ||
      skill.damage_bonus ||
      skill.magic_damage_bonus
    ),
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
      skill.is_scroll ||
      skill.is_assassination_skill
    ),
  );

  // "Weapon" means any melee weapon (StartsWith match) — not a meaningful restriction
  // Source: server-scripts/ScriptableSkill.cs — CheckWeapon(), line 100
  const WEAPON_LABELS: Record<string, string> = {
    WeaponDagger: "Dagger",
    WeaponSword: "Sword",
  };

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
        cols.push({
          label: def.label,
          field: val,
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
    skill.max_level > 1 && scalingColumns.length > 0,
  );

  // Mechanics section: only for player-usable skills
  // Scroll skills have no player_classes but are used by players via items
  const isPlayerUsable = $derived(
    skill.player_classes.length > 0 ||
      skill.is_mercenary_skill ||
      skill.is_pet_skill ||
      data.usedByPets.length > 0 ||
      data.grantedByItems.length > 0,
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

  const hasSpecialBuffFlags = $derived(
    skill.is_invisibility ||
      skill.is_mana_shield ||
      skill.is_dispel ||
      skill.is_enrage,
  );

  const showMechanics = $derived(
    (isPlayerUsable &&
      (isDamageType ||
        isHealType ||
        (isBuffType &&
          (hasWisScaledBonuses ||
            hasSpecialBuffFlags ||
            skill.is_cleanse ||
            skill.is_dispel)))) ||
      (isDebuffType &&
        (hasDebuffAttrScaling || skill.prob_ignore_cleanse != null)),
  );

  // Determine damage formula type
  // Source: server-scripts/Combat.cs — DealDamageAt
  // Source: server-scripts/TargetDamageSkill.cs — Apply
  // Source: server-scripts/TargetProjectileSkill.cs — Apply
  const damageFormulaType = $derived.by((): string | null => {
    if (!isDamageType) return null;

    if (skill.is_manaburn_skill) return "manaburn";
    if (skill.is_scroll) return "scroll";

    const dt = skill.damage_type;
    const isSpell = skill.is_spell;
    const classes = skill.player_classes;

    // Source: server-scripts/Combat.cs — DealDamageAt damage type checks
    if (dt === "Poison" && classes.includes("rogue")) return "poison_rogue";
    if (dt === "Poison") return "poison_nonrogue";
    if (
      (dt === "Fire" || dt === "Magic" || dt === "Cold" || dt === "Disease") &&
      isSpell
    )
      return "magic_spell";
    if (dt === "Magic" && !isSpell && skill.required_weapon_category)
      return "magic_weapon";

    // Source: server-scripts/Dexterity.cs — rangedAttackBonusPerPoint
    if (
      skill.skill_type === "target_projectile" ||
      skill.skill_type === "frontal_projectiles"
    ) {
      if (classes.includes("ranger")) return "bow_ranger";
    }

    return "normal_melee";
  });

  // Determine resist type based on damage_type
  // Source: server-scripts/Combat.cs — GetProbResist* methods
  const resistType = $derived.by((): string | null => {
    if (!isDamageType) return null;
    const dt = skill.damage_type;
    if (dt === "Normal") return "melee";
    if (dt === "Magic") return "magic";
    if (dt === "Fire") return "fire";
    if (dt === "Cold") return "cold";
    if (dt === "Poison") return "poison";
    if (dt === "Disease") return "disease";
    return "melee";
  });

  // Buff scaling attribute source
  // Source: server-scripts/TargetBuffSkill.cs — Apply, bonusAttribute = pet3.wisdom.value for all mercenary skills
  // CHA is only referenced in BonusSkill.cs ToolTipUpgrade() (client display only, never applied at runtime)
  const buffScalingAttr = $derived(skill.is_scroll ? "level" : "wis");

  // Debuff bonus attribute label for scaling rows
  // Source: server-scripts/TargetDebuffSkill.cs:277-279 — isScroll → PlayerLevel * 10
  const debuffScrollAttr = "PlayerLevel \u00d7 10";
</script>

<svelte:head>
  <title>{skill.name} - Skills - Ancient Kingdoms Compendium</title>
  <meta name="description" content={data.description} />
</svelte:head>

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
          Pet Skill
        </span>
      {/if}
      {#if skill.is_mercenary_skill}
        <span
          class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
        >
          Mercenary Skill
        </span>
      {/if}
      {#if skill.followup_default_attack}
        <span
          class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
        >
          Weapon Strike
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
  <nav aria-label="Page sections" class="text-sm text-muted-foreground">
    <ul class="flex flex-wrap gap-x-4 gap-y-1">
      {#if data.effectSummary || skill.tooltip_template}
        <li>
          <a href="#description" class="hover:text-foreground hover:underline"
            >Description</a
          >
        </li>
      {/if}
      {#if hasRequirements}
        <li>
          <a href="#requirements" class="hover:text-foreground hover:underline"
            >Requirements</a
          >
        </li>
      {/if}
      {#if skill.mana_cost || skill.energy_cost || skill.cooldown || skill.cast_time || skill.cast_range}
        <li>
          <a href="#cost-timing" class="hover:text-foreground hover:underline"
            >Cost & Timing</a
          >
        </li>
      {/if}
      {#if hasDamage}
        <li>
          <a href="#damage" class="hover:text-foreground hover:underline"
            >Damage</a
          >
        </li>
      {/if}
      {#if (hasLinearValue(skill.heals_health) || hasLinearValue(skill.heals_mana) || skill.is_balance_health) && !skill.is_resurrect_skill}
        <li>
          <a href="#healing" class="hover:text-foreground hover:underline"
            >Healing</a
          >
        </li>
      {/if}
      {#if hasCrowdControl}
        <li>
          <a href="#crowd-control" class="hover:text-foreground hover:underline"
            >Crowd Control</a
          >
        </li>
      {/if}
      {#if skill.skill_type === "summon" || skill.skill_type === "summon_monsters"}
        <li>
          <a href="#summon-info" class="hover:text-foreground hover:underline"
            >Summon Info</a
          >
        </li>
      {/if}
      {#if hasBuffEffects}
        <li>
          <a href="#buff-debuff" class="hover:text-foreground hover:underline"
            >Buff/Debuff Effects</a
          >
        </li>
      {/if}
      {#if showLevelScaling}
        <li>
          <a href="#level-scaling" class="hover:text-foreground hover:underline"
            >Level Scaling</a
          >
        </li>
      {/if}
      {#if showMechanics}
        <li>
          <a href="#mechanics" class="hover:text-foreground hover:underline"
            >Mechanics</a
          >
        </li>
      {/if}
      {#if data.grantedByItems.length > 0}
        <li>
          <a
            href="#granted-by-items"
            class="hover:text-foreground hover:underline">Granted by Items</a
          >
        </li>
      {/if}
      {#if skill.player_classes.length > 0}
        <li>
          <a
            href="#learned-by-classes"
            class="hover:text-foreground hover:underline">Learned by Classes</a
          >
        </li>
      {/if}
      {#if data.usedByPets.length > 0}
        <li>
          <a href="#used-by-pets" class="hover:text-foreground hover:underline"
            >Used by Pets</a
          >
        </li>
      {/if}
      {#if data.usedByMonsters.length > 0}
        <li>
          <a
            href="#used-by-monsters"
            class="hover:text-foreground hover:underline">Used by Monsters</a
          >
        </li>
      {/if}
    </ul>
  </nav>

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
                    {SKILL_TYPE_LABELS[skill.skill_type] ?? skill.skill_type}
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
                          ? `/pets/${skill.pet_id}`
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
                {SKILL_TYPE_LABELS[skill.skill_type] ?? skill.skill_type}
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
                      ? `/pets/${skill.pet_id}`
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
                {WEAPON_LABELS[skill.required_weapon_category] ??
                  skill.required_weapon_category}
              </dd>
            </div>
          {/if}
        </dl>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Cost & Timing -->
  {#if skill.mana_cost || skill.energy_cost || skill.cooldown || skill.cast_time || skill.cast_range}
    <Card.Root id="cost-timing" class="bg-muted/30">
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Clock class="h-5 w-5 text-blue-500" />
          Cost & Timing
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
          {#if skill.mana_cost}
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
          {#if skill.damage_type}
            <div>
              <dt class="text-muted-foreground">Damage Type</dt>
              <dd class="font-medium">{skill.damage_type}</dd>
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
                Assassination: requires target below 25% HP
              </p>
            {/if}
            {#if skill.is_manaburn_skill}
              <p class="text-purple-600 dark:text-purple-400">
                Manaburn: consumes all resource for damage
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
              Equalizes group member HP percentages
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
          <p class="text-sm font-medium">Teleports target to self, stun (2s)</p>
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
                    href="/pets/{skill.pet_id}"
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
                <dt class="text-muted-foreground">Health/sec</dt>
                <dd class="font-medium">
                  {formatLinear(skill.healing_per_second_bonus)}
                </dd>
              </div>
            {/if}
            {#if skill.health_percent_per_second_bonus}
              <div>
                <dt class="text-muted-foreground">Health %/sec</dt>
                <dd class="font-medium">
                  {formatLinearPercent(skill.health_percent_per_second_bonus)}
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
        {#if skill.is_invisibility || skill.is_mana_shield || skill.is_blindness || skill.is_enrage || skill.is_permanent || skill.is_only_for_magic_classes}
          <div class="space-y-1 text-sm">
            {#if skill.is_enrage}
              <p class="text-red-600 dark:text-red-400">
                Enrage: +33% damage when below 25% HP
              </p>
            {/if}
            {#if skill.is_invisibility}
              <p class="text-purple-600 dark:text-purple-400">
                Grants Invisibility
              </p>
            {/if}
            {#if skill.is_mana_shield}
              <p class="text-blue-600 dark:text-blue-400">
                Mana Shield (damage absorbed by mana)
              </p>
            {/if}

            {#if skill.is_blindness}
              <p class="text-amber-600 dark:text-amber-400">Blinds target</p>
            {/if}
            {#if skill.is_permanent}
              <p class="text-muted-foreground">
                Timer hidden in UI (duration still applies)
              </p>
            {/if}
            {#if skill.is_only_for_magic_classes}
              <p class="text-indigo-600 dark:text-indigo-400">
                Magic classes only
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
              <tr class="border-b text-left">
                <th class="py-2 pr-4 font-medium text-muted-foreground"
                  >Level</th
                >
                {#each scalingColumns as col (col.label)}
                  <th class="py-2 px-3 font-medium text-muted-foreground"
                    >{col.label}</th
                  >
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each Array.from({ length: skill.max_level }, (_, i) => i + 1) as level (level)}
                <tr class="border-b border-border/50">
                  <td class="py-1.5 pr-4 font-medium">{level}</td>
                  {#each scalingColumns as col (col.label)}
                    <td class="py-1.5 px-3"
                      >{computeScalingValue(col, level)}</td
                    >
                  {/each}
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
        <!-- A. Damage Formula -->
        {#if isDamageType && damageFormulaType && hasActualDamage}
          <div class="space-y-3">
            <h3 class="font-semibold">Damage Formula</h3>

            {#if damageFormulaType === "manaburn"}
              <!-- Source: server-scripts/TargetDamageSkill.cs — energy.current * 2 -->
              <!-- Source: server-scripts/TargetProjectileSkill.cs — mana.current * 3 -->
              <p>
                Consumes all rage. Damage = Rage &times; 2 (Warrior/Rogue) or
                Mana &times; 3 (Wizard). Bypasses all resistance and mitigation.
              </p>
            {:else if damageFormulaType === "scroll"}
              <!-- Source: server-scripts/TargetDamageSkill.cs — isScroll → player.level.current * 15 -->
              <p>Damage = Player Level &times; 15 (scroll formula)</p>
            {:else if damageFormulaType === "magic_spell"}
              <!-- Source: server-scripts/Intelligence.cs — magicDamageBonusPerPoint = 1.5 -->
              <dl class="space-y-1">
                <div>
                  <dt class="text-muted-foreground">Pre-Mitigation</dt>
                  <dd class="font-mono">Skill Damage + Magic Damage</dd>
                </div>
                <div>
                  <dt class="text-muted-foreground">Magic Damage</dt>
                  <dd class="font-mono">
                    (INT &times; 1.5 + equipment bonuses) &times; (1 + passive%
                    + buff%)
                  </dd>
                </div>
              </dl>
            {:else if damageFormulaType === "magic_weapon"}
              <!-- Source: server-scripts/Strength.cs — damageBonusPerPoint = 1.0 -->
              <!-- Source: server-scripts/Intelligence.cs — magicDamageBonusPerPoint = 1.5 -->
              <dl class="space-y-1">
                <div>
                  <dt class="text-muted-foreground">Pre-Mitigation</dt>
                  <dd class="font-mono">
                    Skill Damage + Magic Damage + Attack Damage
                  </dd>
                </div>
                <div>
                  <dt class="text-muted-foreground">Magic Damage</dt>
                  <dd class="font-mono">
                    (INT &times; 1.5 + equipment bonuses) &times; (1 + passive%
                    + buff%)
                  </dd>
                </div>
                <div>
                  <dt class="text-muted-foreground">Attack Damage</dt>
                  <dd class="font-mono">
                    (STR &times; 1.0 + equipment bonuses) &times; (1 + passive%
                    + buff%)
                  </dd>
                </div>
              </dl>
            {:else if damageFormulaType === "poison_rogue"}
              <!-- Source: server-scripts/Dexterity.cs — poisonDamageBonusPerPoint = 2.5 -->
              <dl class="space-y-1">
                <div>
                  <dt class="text-muted-foreground">Pre-Mitigation</dt>
                  <dd class="font-mono">
                    Skill Damage + Attack Damage + DEX &times; 2.5
                  </dd>
                </div>
                <div>
                  <dt class="text-muted-foreground">Attack Damage</dt>
                  <dd class="font-mono">
                    (STR &times; 1.0 + equipment bonuses) &times; (1 + passive%
                    + buff%)
                  </dd>
                </div>
              </dl>
            {:else if damageFormulaType === "poison_nonrogue"}
              <!-- Source: server-scripts/Intelligence.cs — magicDamageBonusPerPoint = 1.5 -->
              <dl class="space-y-1">
                <div>
                  <dt class="text-muted-foreground">Pre-Mitigation</dt>
                  <dd class="font-mono">Skill Damage + Magic Damage</dd>
                </div>
                <div>
                  <dt class="text-muted-foreground">Magic Damage</dt>
                  <dd class="font-mono">
                    (INT &times; 1.5 + equipment bonuses) &times; (1 + passive%
                    + buff%)
                  </dd>
                </div>
              </dl>
            {:else if damageFormulaType === "bow_ranger"}
              <!-- Source: server-scripts/TargetProjectileSkill.cs:195-200 -->
              <!-- combat.damage - weapon.damageBonus + dex.GetRangedAttackBonusPerPoint() -->
              <!-- The weapon's flat damageBonus is subtracted because combat.damage already -->
              <!-- includes it; only STR scaling and non-weapon equipment contribute here. -->
              <!-- Source: server-scripts/Dexterity.cs — rangedAttackBonusPerPoint = 1.5 -->
              <dl class="space-y-1">
                <div>
                  <dt class="text-muted-foreground">Pre-Mitigation</dt>
                  <dd class="font-mono">
                    Skill Damage + Ranged Attack Damage + DEX &times; 1.5
                  </dd>
                </div>
                <div>
                  <dt class="text-muted-foreground">Ranged Attack Damage</dt>
                  <dd class="font-mono">
                    (STR &times; 1.0 + non-weapon equipment bonuses) &times; (1
                    + passive% + buff%)
                  </dd>
                </div>
              </dl>
            {:else}
              <!-- normal_melee -->
              <!-- Source: server-scripts/Strength.cs — damageBonusPerPoint = 1.0 -->
              <!-- Source: server-scripts/Combat.cs — damage = (baseDamage + ICombatBonus sum) × (1 + passive% + buff%) -->
              <dl class="space-y-1">
                <div>
                  <dt class="text-muted-foreground">Pre-Mitigation</dt>
                  <dd class="font-mono">Skill Damage + Attack Damage</dd>
                </div>
                <div>
                  <dt class="text-muted-foreground">Attack Damage</dt>
                  <dd class="font-mono">
                    (STR &times; 1.0 + equipment bonuses) &times; (1 + passive%
                    + buff%)
                  </dd>
                </div>
              </dl>
            {/if}

            {#if skill.damage_percent}
              <p class="text-muted-foreground">
                Total pre-mitigation damage is then multiplied by {formatLinearPercent(
                  skill.damage_percent,
                )}
              </p>
            {/if}

            <!-- Damage Pipeline (universal for all damage skills) -->
            <!-- Source: server-scripts/Combat.cs — DealDamageAt -->
            {#if damageFormulaType !== "manaburn"}
              <div class="space-y-1">
                <h4 class="font-medium text-muted-foreground">
                  Damage Pipeline
                </h4>
                <ol class="list-decimal list-inside space-y-0.5 font-mono">
                  <li>Variance: &times;0.9&ndash;1.1</li>
                  <!-- Source: server-scripts/Combat.cs — 0.25f : 0.1f; skills[13] = Improved Backstab passive -->
                  <li>
                    Backstab (behind target): +10% | Rogue w/ Improved Backstab:
                    +25%
                  </li>
                  <!-- Source: server-scripts/Combat.cs — Clamp(... * 0.02f, -0.2f, 0.2f) -->
                  <li>
                    Level difference: &plusmn;2% per level (max &plusmn;20%)
                  </li>
                  <!-- Source: server-scripts/Combat.cs — num10 * 0.1f -->
                  <li>
                    Slayer reduction (boss/elite &rarr; player):
                    &minus;slayerLevel &times; 10%
                  </li>
                  <!-- Source: server-scripts/Combat.cs — 0.33f (player), Random.Range(0.5f, 1f) (monster) -->
                  <li>
                    Enrage (&lt;25% HP, non-spell): Player +33% | Monster
                    +50&ndash;100%
                  </li>
                  <!-- Source: server-scripts/Combat.cs — combat.defense/magicResist/etc * 0.0005f -->
                  <li>
                    Mitigation: &minus;ceil(dmg &times; clamp(target.{resistType ===
                    "melee"
                      ? "defense"
                      : `${resistType}Resist`} &times; 0.0005, 0, 0.9))
                  </li>
                  <!-- Source: server-scripts/Combat.cs — criticalChance roll, 0.95 check, num *= 2 -->
                  <li>
                    Crit: on crit &rarr; 95% &times;1.5 (normal) | 5% &times;2.0
                    (super)
                  </li>
                  <!-- Source: server-scripts/Combat.cs — isRadiantAetherActivated → 0.15f roll, consumes 1 item, *3 on top of crit -->
                  <li>
                    Radiant Aether (15% chance on crit, consumes 1 item):
                    &times;3 on top &rarr; &times;4.5 or &times;6.0
                  </li>
                </ol>
              </div>
            {/if}

            <!-- Block/Resist Chance -->
            {#if resistType && damageFormulaType !== "manaburn"}
              <div class="space-y-1">
                <h4 class="font-medium text-muted-foreground">
                  {resistType === "melee"
                    ? "Block/Miss Chance"
                    : "Resist Chance"}
                </h4>
                {#if resistType === "melee"}
                  <!-- Source: server-scripts/Combat.cs — GetProbResistMeleeDamage, blockChance property -->
                  <p class="font-mono">
                    clamp(<br />
                    &nbsp;&nbsp;clamp(target.baseBlock + target.defense &times; 0.0001
                    + buffs, 0, 0.8)<br />
                    &nbsp;&nbsp;+ clamp((target.level &minus; attacker.level) &times;
                    0.005, &minus;0.1, 0.1)<br />
                    &nbsp;&nbsp;&minus; attacker.accuracy<br />
                    , 0, 0.9)
                  </p>
                {:else}
                  <!-- Source: server-scripts/Combat.cs — GetProbResistMagic/Fire/Cold/Poison/Disease -->
                  <p class="font-mono">
                    clamp(<br />
                    &nbsp;&nbsp;target.{resistType}Resist &times; 0.0005<br />
                    &nbsp;&nbsp;+ (target.level &minus; attacker.level) &times; 0.005<br
                    />
                    &nbsp;&nbsp;&minus; attacker.accuracy<br />
                    , 0, 0.9)
                  </p>
                {/if}
                <!-- Source: server-scripts/Combat.cs — num5 - 0.25f, amountDamage * 0.1f, num5 *= 0.8f -->
                <dl
                  class="font-mono grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5"
                >
                  <dt>Target moving:</dt>
                  <dd>chance &minus; 0.25, damage +10%</dd>
                  <dt>Backstab:</dt>
                  <dd>chance &times; 0.8</dd>
                </dl>
              </div>
            {/if}
          </div>
        {/if}

        <!-- E. Aggro Formula -->
        <!-- Source: server-scripts/TargetDamageSkill.cs:239 — num5 = aggro > 0 ? caster.health.max : 0 -->
        {#if isDamageType && (skill.aggro?.base_value ?? 0) > 0}
          <div class="space-y-1">
            <h3 class="font-semibold">Aggro</h3>
            <p class="font-mono">min(target.HP,</p>
            <ul class="font-mono list-none ml-4 space-y-0.5">
              <li>skillAggro + caster.maxHP</li>
              <li>+ damage</li>
              <li>+ round(stunChance &times; stunTime &times; 10)</li>
              <li>+ round(fearChance &times; fearTime &times; 10)</li>
            </ul>
            <p class="font-mono">)</p>
          </div>
        {/if}

        <!-- B. Heal Formula -->
        <!-- Source: server-scripts/TargetHealSkill.cs:231 — isResurrectSkill takes a separate path
             that calls TargetRpcResurrect with no healing or crit involved -->
        {#if isHealType && !skill.is_resurrect_skill}
          <div class="space-y-1">
            <h3 class="font-semibold">Healing Formula</h3>
            <!-- Source: server-scripts/TargetHealSkill.cs:266-270 — isScroll → PlayerLevel * 8 replaces WIS bonus -->
            <!-- Source: server-scripts/Wisdom.cs — healBonusPercentPerPoint = 0.004, capDirectHealBonus = 5.0 -->
            {#if skill.is_scroll}
              <p class="font-mono">
                Final Heal = Base Heal + PlayerLevel &times; 8
              </p>
            {:else}
              <p class="font-mono">
                Final Heal = Base Heal + RoundToInt(Base Heal &times; min(WIS
                &times; 0.004, 5.0))
              </p>
            {/if}

            <!-- Source: server-scripts/TargetHealSkill.cs:271-274, AreaHealSkill.cs:94-96 — Random.value > 0.9 threshold -->
            <p class="text-muted-foreground">
              Critical Heal: on crit &rarr; 90% &times;2.0 | 10% &times;3.0
            </p>
          </div>
        {/if}

        <!-- C. Buff Scaling -->
        {#if isBuffType && hasWisScaledBonuses}
          <div class="space-y-2">
            <h3 class="font-semibold">Buff Scaling</h3>
            <dl class="grid grid-cols-[12rem_1fr] gap-x-4 gap-y-1 font-mono">
              <!-- Source: server-scripts/TargetBuffSkill.cs:425-428 — isScroll → PlayerLevel * 8, else caster.wisdom.value -->
              <!-- Source: server-scripts/Wisdom.cs — maxHealthBuffBonusPerPoint = 2 -->
              {#if skill.health_max_bonus}
                <dt class="text-muted-foreground">Max Health</dt>
                <dd>
                  skillValue(level) + {buffScalingAttr === "level"
                    ? "PlayerLevel \u00d7 8"
                    : "WIS"} &times; 2
                </dd>
              {/if}
              <!-- Source: server-scripts/Wisdom.cs — defenseBuffBonusPerPoint = 0.15 -->
              {#if skill.defense_bonus}
                <dt class="text-muted-foreground">Defense</dt>
                <dd>
                  skillValue(level) + {buffScalingAttr === "level"
                    ? "PlayerLevel \u00d7 8"
                    : "WIS"} &times; 0.15
                </dd>
              {/if}
              <!-- Source: server-scripts/Wisdom.cs — magicResistBuffBonusPerPoint = 0.15 -->
              {#if skill.magic_resist_bonus}
                <dt class="text-muted-foreground">Magic Resist</dt>
                <dd>
                  skillValue(level) + {buffScalingAttr === "level"
                    ? "PlayerLevel \u00d7 8"
                    : "WIS"} &times; 0.15
                </dd>
              {/if}
              <!-- Source: server-scripts/Wisdom.cs — wardBuffBonusPerPoint = 5 -->
              {#if skill.ward_bonus}
                <dt class="text-muted-foreground">Ward</dt>
                <dd>
                  skillValue(level) + {buffScalingAttr === "level"
                    ? "PlayerLevel \u00d7 8"
                    : "WIS"} &times; 5
                </dd>
              {/if}
              <!-- Source: server-scripts/Wisdom.cs — damageShieldBuffBonusPerPoint = 0.75 -->
              {#if skill.damage_shield}
                <dt class="text-muted-foreground">Damage Shield</dt>
                <dd>
                  skillValue(level) + {buffScalingAttr === "level"
                    ? "PlayerLevel \u00d7 8"
                    : "WIS"} &times; 0.75
                </dd>
              {/if}
              <!-- Source: server-scripts/Buff.cs — poisonResistBonus/fireResistBonus/etc. -->
              {#if skill.poison_resist_bonus || skill.fire_resist_bonus || skill.cold_resist_bonus || skill.disease_resist_bonus}
                <dt class="text-muted-foreground">Elemental Resists</dt>
                <dd>
                  skillValue(level) + {buffScalingAttr === "level"
                    ? "PlayerLevel \u00d7 8"
                    : "WIS"} &times; 0.15
                </dd>
              {/if}
              <!-- Source: server-scripts/Wisdom.cs — capHealPerSecondBonus = 3.0 -->
              {#if skill.healing_per_second_bonus}
                <dt class="text-muted-foreground">HoT</dt>
                <dd>
                  skillValue(level) &times; (1 + min({buffScalingAttr ===
                  "level"
                    ? "PlayerLevel \u00d7 8"
                    : "WIS"} &times; 0.004, 3.0))
                </dd>
              {/if}
            </dl>
          </div>
        {/if}

        <!-- D. Debuff Scaling -->
        {#if isDebuffType && hasDebuffAttrScaling}
          <div class="space-y-2">
            <h3 class="font-semibold">Debuff Scaling</h3>
            <dl class="grid grid-cols-[16rem_1fr] gap-x-4 gap-y-1 font-mono">
              <!-- Source: server-scripts/Buff.cs:84-98 — defenseBonus getter, negative branch: bonusAttribute * 0.4 (all types) -->
              <!-- Source: server-scripts/TargetDebuffSkill.cs:277-279 — isScroll → bonusAttribute = PlayerLevel * 10 -->
              {#if skill.defense_bonus}
                <dt class="text-muted-foreground">Defense reduction</dt>
                {#if skill.is_scroll}
                  <dd>skillValue(level) + {debuffScrollAttr} &times; 0.4</dd>
                {:else if skill.is_melee_debuff}
                  <dd>skillValue(level) + STR &times; 0.4</dd>
                {:else}
                  <dd>skillValue(level) + INT &times; 0.4</dd>
                {/if}
              {/if}
              <!-- Source: server-scripts/Buff.cs:100-114 — magicResistBonus getter, negative branch: bonusAttribute * 0.4 -->
              {#if skill.magic_resist_bonus}
                <dt class="text-muted-foreground">Magic Resist reduction</dt>
                <dd>
                  skillValue(level) + {skill.is_scroll
                    ? debuffScrollAttr
                    : "INT"} &times; 0.4
                </dd>
              {/if}
              <!-- Source: server-scripts/Buff.cs:116-178 — resist bonus getters, negative branch: bonusAttribute * 0.4 -->
              {#if skill.poison_resist_bonus}
                <dt class="text-muted-foreground">Poison Resist reduction</dt>
                <dd>
                  skillValue(level) + {skill.is_scroll
                    ? debuffScrollAttr
                    : "INT"} &times; 0.4
                </dd>
              {/if}
              {#if skill.fire_resist_bonus}
                <dt class="text-muted-foreground">Fire Resist reduction</dt>
                <dd>
                  skillValue(level) + {skill.is_scroll
                    ? debuffScrollAttr
                    : "INT"} &times; 0.4
                </dd>
              {/if}
              {#if skill.cold_resist_bonus}
                <dt class="text-muted-foreground">Cold Resist reduction</dt>
                <dd>
                  skillValue(level) + {skill.is_scroll
                    ? debuffScrollAttr
                    : "INT"} &times; 0.4
                </dd>
              {/if}
              {#if skill.disease_resist_bonus}
                <dt class="text-muted-foreground">Disease Resist reduction</dt>
                <dd>
                  skillValue(level) + {skill.is_scroll
                    ? debuffScrollAttr
                    : "INT"} &times; 0.4
                </dd>
              {/if}
              <!-- Source: server-scripts/Buff.cs:56-66 — damageBonus getter, negative branch: bonusAttribute * 0.5 -->
              {#if skill.damage_bonus}
                <dt class="text-muted-foreground">Damage reduction</dt>
                <dd>
                  skillValue(level) + {skill.is_scroll
                    ? debuffScrollAttr
                    : "INT"} &times; 0.5
                </dd>
              {/if}
              <!-- Source: server-scripts/Buff.cs:72-82 — magicDamageBonus getter, negative branch: bonusAttribute * 0.5 -->
              {#if skill.magic_damage_bonus}
                <dt class="text-muted-foreground">Magic Dmg reduction</dt>
                <dd>
                  skillValue(level) + {skill.is_scroll
                    ? debuffScrollAttr
                    : "INT"} &times; 0.5
                </dd>
              {/if}
              <!-- DoT: bonusAttribute applied in Skills.cs:GetFinalDamageDoT, not in Buff.healingPerSecondBonus -->
              {#if skill.healing_per_second_bonus}
                <dt class="text-muted-foreground">DoT</dt>
                {#if skill.is_scroll && (skill.is_poison_debuff || skill.is_disease_debuff)}
                  <!-- Source: server-scripts/TargetDebuffSkill.cs:277-279 — isScroll overrides stat source -->
                  <dd>skillValue(level) + {debuffScrollAttr} &times; 1.0</dd>
                {:else if skill.is_scroll && skill.is_melee_debuff}
                  <dd>skillValue(level) + {debuffScrollAttr} &times; 0.5</dd>
                {:else if skill.is_scroll}
                  <dd>skillValue(level) + {debuffScrollAttr} &times; 1.25</dd>
                {:else if skill.is_poison_debuff || skill.is_disease_debuff}
                  <!-- Source: server-scripts/Skills.cs:1136-1159 — isPoisonDebuff||isDiseaseDebuff: bonusAttribute * 1.0 -->
                  <dd>skillValue(level) + DEX &times; 1.0</dd>
                {:else if skill.is_melee_debuff}
                  <!-- Source: server-scripts/Skills.cs:1111-1135 — isMeleeDebuff: bonusAttribute * 0.5 -->
                  <dd>skillValue(level) + STR &times; 0.5</dd>
                {:else}
                  <!-- Source: server-scripts/Skills.cs:1236-1260 — else (fire/cold/magic): bonusAttribute * 1.25 -->
                  <dd>skillValue(level) + INT &times; 1.25</dd>
                {/if}
              {/if}
            </dl>
          </div>

          <!-- D2. Resist Chance -->
          <!-- Source: server-scripts/TargetDebuffSkill.cs:104-133, Combat.cs:1222-1256 -->
          <!-- No flag set → num stays 0, debuff always lands -->
          {#if !skill.is_dispel && (skill.is_melee_debuff || skill.is_poison_debuff || skill.is_fire_debuff || skill.is_cold_debuff || skill.is_disease_debuff || skill.is_magic_debuff)}
            <div class="space-y-1">
              <h4 class="font-medium text-muted-foreground">Resist Chance</h4>
              <!-- Level diff clamped to ±0.1 (±20 levels), unlike damage resist which is unclamped -->
              <!-- Source: server-scripts/Combat.cs:1224 — Mathf.Clamp(diff_levels * 0.005, -0.1, 0.1) -->
              <p class="font-mono">
                clamp(<br />
                &nbsp;&nbsp;target.{skill.is_melee_debuff
                  ? "defense"
                  : skill.is_poison_debuff
                    ? "poisonResist"
                    : skill.is_fire_debuff
                      ? "fireResist"
                      : skill.is_cold_debuff
                        ? "coldResist"
                        : skill.is_disease_debuff
                          ? "diseaseResist"
                          : "magicResist"} &times; 0.0005<br />
                &nbsp;&nbsp;+ clamp((target.level &minus; caster.level) &times; 0.005,
                &minus;0.1, 0.1)<br />
                &nbsp;&nbsp;&minus; caster.accuracy<br />
                , 0, 0.9)
              </p>
            </div>
          {/if}
        {/if}

        <!-- E. Cleanse Resistance (debuff page) -->
        <!-- Source: server-scripts/TargetBuffSkill.cs:276-350, Buff.cs:226 -->
        <!-- prob_ignore_cleanse == 1: debuff is skipped entirely (line 284 Mathf.Approximately check) -->
        {#if isDebuffType && !skill.is_cleanse && !skill.is_dispel && skill.prob_ignore_cleanse != null}
          <div class="space-y-1">
            <h3 class="font-semibold">Cleanse Resistance</h3>
            {#if skill.prob_ignore_cleanse >= 1}
              <!-- Cannot be cleansed at all -->
              <p class="text-muted-foreground">Cannot be cleansed.</p>
            {:else if skill.prob_ignore_cleanse <= 0}
              <!-- probIgnoreCleanse <= 0: num2 = 3 always, single cast removes all counters -->
              <p class="text-muted-foreground">
                Always removed in a single cast.
              </p>
            {:else}
              <!-- 1 guaranteed + 2 rolls each blocked with probability prob_ignore_cleanse -->
              <!-- Partial cleansing is possible, so DoT reduction is relevant -->
              <p class="text-muted-foreground">
                Starts with 3 counters. Cleansing removes 1 counter guaranteed,
                plus 2 independent {formatPercent(
                  1 - skill.prob_ignore_cleanse,
                )} chances to remove 1 more each. Debuff is removed when counters
                reach 0.{skill.healing_per_second_bonus
                  ? " DoT damage is reduced while partially cleansed (2 counters \u2192 \xd70.9, 1 counter \u2192 \xd70.8)."
                  : ""}
              </p>
            {/if}
          </div>
        {/if}

        <!-- E2. Cleanse Mechanics (cleanse skill page) -->
        <!-- Source: server-scripts/TargetBuffSkill.cs:276-350 -->
        {#if skill.is_cleanse}
          <div class="space-y-1">
            <h3 class="font-semibold">Cleanse Mechanics</h3>
            <p class="text-muted-foreground">
              Only affects debuffs of matching type (e.g. a disease cleanse only
              removes disease debuffs). Some debuffs cannot be cleansed at all.
              Cleansable debuffs start with 3 counters and are removed when
              counters reach 0. Debuffs with no resist are always removed in a
              single cast. Otherwise cleansing removes 1 counter guaranteed,
              plus 2 independent chances to remove 1 more each (blocked by the
              debuff's cleanse resist chance). If counters remain after a cast,
              you see "Some spells resists your purification attempt." DoT
              damage is reduced while partially cleansed (2 counters &rarr;
              &times;0.9, 1 counter &rarr; &times;0.8).
            </p>
          </div>
        {/if}

        <!-- F. Dispel Mechanics -->
        <!-- Source: server-scripts/TargetDebuffSkill.cs:168-263 -->
        {#if skill.is_dispel}
          <div class="space-y-1">
            <h3 class="font-semibold">Dispel Mechanics</h3>
            <p class="text-muted-foreground">Removes buffs from the target.</p>
            <p class="text-muted-foreground">
              Players: all buffs removed unconditionally, except the Rest buff.
            </p>
            <p class="text-muted-foreground">
              Pets: all buffs removed unconditionally.
            </p>
            <p class="text-muted-foreground">
              Monsters: each buff rolls independently against its cleanse resist
              chance. If any buff resists, you see "[target] resisted your
              dispel!"
            </p>
          </div>
        {/if}

        <!-- G. Special Mechanic Notes -->
        {#if skill.is_assassination_skill}
          <p>Requires target below 25% HP to cast</p>
        {/if}
        {#if skill.followup_default_attack}
          <!-- Source: server-scripts/TargetDamageSkill.cs — procEffectProbability > Random.value -->
          <!-- Source: server-scripts/Combat.cs — energy.current += FloorToInt(num22 * 0.25f) -->
          <!-- Source: server-scripts/Player.cs:2783 — refractoryPeriodSkillTimeEnd, Mathf.Clamp((delay - delay * haste) / 25, 0.25, 2) -->
          <!-- Source: server-scripts/Skills.cs:766-773 — mercenary cooldown haste-reduced; regular pet cooldown fixed -->
          {#if skill.player_classes.length > 0}
            <p>
              Weapon strike: attack interval = cast time + refractory period,
              where refractory period = clamp((weaponDelay &minus; weaponDelay
              &times; haste) / 25, 0.25s, 2s). Haste has no further benefit once
              the 0.25s floor is reached. Can trigger weapon proc, generates
              rage on hit (25% of damage), allows action queuing during cast.
            </p>
          {/if}
          {#if data.usedByPets.some((p) => p.is_mercenary)}
            <p>
              Mercenary weapon strike: attack interval = cast time + cooldown
              &times; (1 &minus; haste). Weapon delay has no effect. Cooldown
              scales linearly with haste up to the cap.
            </p>
          {/if}
          {#if data.usedByPets.some((p) => !p.is_mercenary)}
            <p>
              Pet weapon strike: attack interval = cast time + cooldown. Haste
              has no effect on pet cooldowns.
            </p>
          {/if}
        {/if}
        {#if skill.is_mana_shield}
          <!-- Source: server-scripts/Combat.cs — DealDamageAt, ward check before mana shield check -->
          <p>
            Ward absorbs damage first, then mana shield absorbs remainder from
            mana pool
          </p>
        {/if}
        {#if hasLinearValue(skill.cast_time) && skill.is_spell && !skill.is_scroll}
          <!-- Source: server-scripts/Skills.cs:673-675 — castTimeEnd reduction only when isSpell -->
          <p class="text-muted-foreground">
            Effective Cast Time = castTime &minus; (castTime &times; spellHaste)
          </p>
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
                {CLASS_LABELS[cls] ?? cls}
              </a>
            </div>
          {/each}
        </div>
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
                href="/pets/{pet.id}"
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

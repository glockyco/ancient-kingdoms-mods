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
  import MonsterTypeIcon from "$lib/components/MonsterTypeIcon.svelte";
  import Skull from "@lucide/svelte/icons/skull";
  import Cat from "@lucide/svelte/icons/cat";
  import Star from "@lucide/svelte/icons/star";
  import Ghost from "@lucide/svelte/icons/ghost";
  import TrendingUp from "@lucide/svelte/icons/trending-up";

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
    if (Number.isInteger(n)) return n.toLocaleString();
    return n.toFixed(1);
  }

  function formatPercent(n: number): string {
    const pct = n * 100;
    if (Math.abs(pct) < 1 && pct !== 0) {
      return `${parseFloat(pct.toFixed(1))}%`;
    }
    return `${Math.round(pct)}%`;
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
    target_projectile: "Projectile",
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
    area_object_spawn: "Area Object",
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

  const hasBuffEffects = $derived(
    skill.duration_base > 0 ||
      skill.duration_per_level > 0 ||
      hasStatBonuses ||
      hasRegenBonuses ||
      hasResistBonuses ||
      hasAttributeBonuses ||
      skill.is_invisibility ||
      skill.is_mana_shield ||
      skill.is_cleanse ||
      skill.is_dispel ||
      skill.is_blindness ||
      skill.is_enrage ||
      skill.is_permanent ||
      skill.is_only_for_magic_classes,
  );

  const hasAnyBonuses = $derived(
    skill.duration_base > 0 ||
      skill.duration_per_level > 0 ||
      hasStatBonuses ||
      hasRegenBonuses ||
      hasResistBonuses ||
      hasAttributeBonuses,
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
      label: "Energy Cost",
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
      label: "Max Energy",
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
      label: "Damage Bonus",
      isPercent: false,
      suffix: "",
    },
    {
      key: "damage_percent_bonus",
      label: "Damage %",
      isPercent: true,
      suffix: "",
    },
    {
      key: "magic_damage_bonus",
      label: "Magic Dmg",
      isPercent: false,
      suffix: "",
    },
    {
      key: "magic_damage_percent_bonus",
      label: "Magic Dmg %",
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
      label: "Move Speed",
      isPercent: true,
      suffix: "",
    },
    {
      key: "critical_chance_bonus",
      label: "Crit Chance",
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
      label: "Dmg Shield",
      isPercent: false,
      suffix: "",
    },
    {
      key: "cooldown_reduction_percent",
      label: "CDR",
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
      label: "Energy/sec",
      isPercent: false,
      suffix: "",
    },
    {
      key: "energy_percent_per_second_bonus",
      label: "Energy %/sec",
      isPercent: true,
      suffix: "",
    },
    {
      key: "strength_bonus",
      label: "STR",
      isPercent: false,
      suffix: "",
    },
    {
      key: "intelligence_bonus",
      label: "INT",
      isPercent: false,
      suffix: "",
    },
    {
      key: "dexterity_bonus",
      label: "DEX",
      isPercent: false,
      suffix: "",
    },
    {
      key: "constitution_bonus",
      label: "CON",
      isPercent: false,
      suffix: "",
    },
    {
      key: "wisdom_bonus",
      label: "WIS",
      isPercent: false,
      suffix: "",
    },
    {
      key: "charisma_bonus",
      label: "CHA",
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
      <span>Tier {skill.tier}</span>
      <span>Max Level {skill.max_level}</span>
      {#if skill.player_classes.length > 0}
        <span class="flex items-center gap-1">
          Classes:
          {#each skill.player_classes as cls, i (cls)}
            <a
              href="/classes/{cls}"
              class="text-blue-600 dark:text-blue-400 hover:underline"
              >{CLASS_LABELS[cls] ?? cls}</a
            >{#if i < skill.player_classes.length - 1},{/if}
          {/each}
        </span>
      {/if}
    </div>
  </div>

  <!-- Effect / Game Tooltip -->
  {#if data.effectSummary || skill.tooltip_template}
    <Card.Root class="bg-muted/30">
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
                  <dd class="font-medium">{data.effectSummary}</dd>
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
              <dd class="font-medium">{data.effectSummary}</dd>
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
    <Card.Root class="bg-muted/30">
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
              <dt class="text-muted-foreground">Spent Points Required</dt>
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
    <Card.Root class="bg-muted/30">
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
              <dt class="text-muted-foreground">Energy Cost</dt>
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
    <Card.Root class="bg-muted/30">
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
  {#if skill.heals_health || skill.heals_mana || skill.is_resurrect_skill || skill.is_balance_health}
    <Card.Root class="bg-muted/30">
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
        {#if skill.is_resurrect_skill || skill.is_balance_health}
          <div class="mt-3 space-y-1 text-sm">
            {#if skill.is_resurrect_skill}
              <p class="text-green-600 dark:text-green-400">
                Resurrects target (60% HP, 20% mana, 75% XP)
              </p>
            {/if}
            {#if skill.is_balance_health}
              <p class="text-green-600 dark:text-green-400">
                Equalizes group member HP percentages
              </p>
            {/if}
          </div>
        {/if}
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Crowd Control -->
  {#if hasCrowdControl}
    <Card.Root class="bg-muted/30">
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
    <Card.Root class="bg-muted/30">
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
                  Based on aggro count
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
    <Card.Root class="bg-muted/30">
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Sparkles class="h-5 w-5 text-purple-500" />
          Buff/Debuff Effects
        </Card.Title>
      </Card.Header>
      <Card.Content class="space-y-4">
        {#if hasAnyBonuses}
          <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
            <!-- Duration -->
            {#if skill.duration_base > 0 || skill.duration_per_level > 0}
              <div>
                <dt class="text-muted-foreground">Duration</dt>
                <dd class="font-medium">
                  {formatDuration(
                    skill.duration_base,
                    skill.duration_per_level,
                  )}{#if skill.is_permanent}
                    (permanent){/if}
                </dd>
              </div>
            {/if}
            <!-- Resource Pool Bonuses -->
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
                <dt class="text-muted-foreground">Max Energy</dt>
                <dd class="font-medium">
                  {formatLinear(skill.energy_max_bonus)}
                </dd>
              </div>
            {/if}
            <!-- Combat Stat Bonuses -->
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
            {#if skill.damage_bonus}
              <div>
                <dt class="text-muted-foreground">Damage</dt>
                <dd class="font-medium">{formatLinear(skill.damage_bonus)}</dd>
              </div>
            {/if}
            {#if skill.damage_percent_bonus}
              <div>
                <dt class="text-muted-foreground">Damage %</dt>
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
            {#if skill.damage_shield}
              <div>
                <dt class="text-muted-foreground">Damage Shield</dt>
                <dd class="font-medium">{formatLinear(skill.damage_shield)}</dd>
              </div>
            {/if}
            <!-- Speed/Chance Bonuses -->
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
            {#if skill.speed_bonus}
              <div>
                <dt class="text-muted-foreground">Movement Speed</dt>
                <dd class="font-medium">
                  {formatLinearPercent(skill.speed_bonus)}
                </dd>
              </div>
            {/if}
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
            {#if skill.cooldown_reduction_percent}
              <div>
                <dt class="text-muted-foreground">Cooldown Reduction</dt>
                <dd class="font-medium">
                  {formatLinearPercent(skill.cooldown_reduction_percent)}
                </dd>
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
            <!-- Regen Bonuses -->
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
                <dt class="text-muted-foreground">Energy/sec</dt>
                <dd class="font-medium">
                  {formatLinear(skill.energy_per_second_bonus)}
                </dd>
              </div>
            {/if}
            {#if skill.energy_percent_per_second_bonus}
              <div>
                <dt class="text-muted-foreground">Energy %/sec</dt>
                <dd class="font-medium">
                  {formatLinearPercent(skill.energy_percent_per_second_bonus)}
                </dd>
              </div>
            {/if}
            <!-- Resist Bonuses -->
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
            <!-- Attribute Bonuses -->
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
        {#if skill.is_invisibility || skill.is_mana_shield || skill.is_cleanse || skill.is_dispel || skill.is_blindness || skill.is_enrage || skill.is_permanent || skill.is_only_for_magic_classes}
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
            {#if skill.is_cleanse}
              <p class="text-green-600 dark:text-green-400">Cleanses debuffs</p>
            {/if}
            {#if skill.is_dispel}
              <p class="text-red-600 dark:text-red-400">Dispels buffs</p>
            {/if}
            {#if skill.is_blindness}
              <p class="text-amber-600 dark:text-amber-400">Blinds target</p>
            {/if}
            {#if skill.is_permanent}
              <p class="text-muted-foreground">Permanent effect</p>
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
    <Card.Root class="bg-muted/30">
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

  <!-- Granted By Items -->
  {#if data.grantedByItems.length > 0}
    <Card.Root class="bg-muted/30">
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
    <Card.Root class="bg-muted/30">
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
    <Card.Root class="bg-muted/30">
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
    <Card.Root class="bg-muted/30">
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

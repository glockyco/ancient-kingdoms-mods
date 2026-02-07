<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import { Alert } from "$lib/components/ui/alert";
  import * as Card from "$lib/components/ui/card";
  import type { PageData } from "./$types";
  import type { LinearValue } from "$lib/types/skills";
  import CircleAlert from "@lucide/svelte/icons/circle-alert";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import Clock from "@lucide/svelte/icons/clock";
  import Zap from "@lucide/svelte/icons/zap";
  import Swords from "@lucide/svelte/icons/swords";
  import Heart from "@lucide/svelte/icons/heart";
  import Shield from "@lucide/svelte/icons/shield";
  import Target from "@lucide/svelte/icons/target";
  import ScrollText from "@lucide/svelte/icons/scroll-text";
  import Package from "@lucide/svelte/icons/package";
  import DungeonRestrictionBadge from "$lib/components/DungeonRestrictionBadge.svelte";

  let { data }: { data: PageData } = $props();

  const skill = $derived(data.skill);

  // Format LinearValue as "base (+bonus/level)" or just "base"
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

  // Format number with locale
  function formatNumber(n: number): string {
    if (Number.isInteger(n)) return n.toLocaleString();
    return n.toFixed(1);
  }

  // Format percentage
  function formatPercent(n: number): string {
    return `${(n * 100).toFixed(0)}%`;
  }

  // Format duration
  function formatDuration(base: number, perLevel: number): string {
    if (base === 0 && perLevel === 0) return "-";
    if (perLevel === 0) return `${formatNumber(base)}s`;
    return `${formatNumber(base)}s (+${formatNumber(perLevel)}s/lvl)`;
  }

  // Convert Unity color tags to HTML spans
  function convertTooltip(text: string | null): string {
    if (!text) return "";
    return text
      .replace(/<color=(#[0-9A-Fa-f]{6})>/g, '<span style="color:$1">')
      .replace(/<\/color>/g, "</span>")
      .replace(/\n/g, "<br>");
  }

  // Class display info
  const CLASS_INFO: Record<string, { label: string; color: string }> = {
    warrior: { label: "Warrior", color: "text-red-500" },
    ranger: { label: "Ranger", color: "text-green-500" },
    cleric: { label: "Cleric", color: "text-yellow-500" },
    rogue: { label: "Rogue", color: "text-purple-500" },
    wizard: { label: "Wizard", color: "text-blue-500" },
    druid: { label: "Druid", color: "text-emerald-500" },
  };

  // Skill type display info
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

  // Check if we have any stat bonuses
  const hasStatBonuses = $derived(
    skill.health_max_bonus ||
      skill.health_max_percent_bonus ||
      skill.mana_max_bonus ||
      skill.mana_max_percent_bonus ||
      skill.energy_max_bonus ||
      skill.defense_bonus ||
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

  const hasCrowdControl = $derived(
    skill.stun_chance > 0 ||
      skill.fear_chance > 0 ||
      skill.knockback_chance > 0,
  );

  const hasRequirements = $derived(
    skill.level_required > 0 ||
      skill.required_skill_points > 0 ||
      skill.required_spent_points > 0 ||
      skill.prerequisite_skill_id ||
      skill.required_weapon_category,
  );
</script>

<svelte:head>
  <title>{skill.name} - Skills - Ancient Kingdoms Compendium</title>
  <meta name="description" content={data.description} />
</svelte:head>

<div class="container mx-auto p-8 space-y-6 max-w-5xl">
  <!-- Breadcrumb -->
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Skills", href: "/skills" },
      { label: skill.name },
    ]}
  />

  <Alert variant="info">
    <CircleAlert />
    <span
      >This page is a work in progress. Some information may be incomplete or
      change.</span
    >
  </Alert>

  <!-- Header -->
  <div>
    <div class="flex items-center gap-3 flex-wrap">
      <h1 class="text-3xl font-bold">{skill.name}</h1>
      <span
        class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      >
        {SKILL_TYPE_LABELS[skill.skill_type] ?? skill.skill_type}
      </span>
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
          Pet
        </span>
      {/if}
      {#if skill.is_mercenary_skill}
        <span
          class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
        >
          Mercenary
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
            {@const info = CLASS_INFO[cls]}
            <span class={info?.color ?? ""}>{info?.label ?? cls}</span
            >{#if i < skill.player_classes.length - 1},{/if}
          {/each}
        </span>
      {/if}
    </div>
  </div>

  <!-- Tooltip -->
  {#if skill.tooltip_template}
    <Card.Root class="bg-muted/30">
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <ScrollText class="h-5 w-5 text-muted-foreground" />
          Tooltip
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="font-mono text-sm whitespace-pre-wrap">
          <!-- eslint-disable-next-line svelte/no-at-html-tags -- Safe: Unity color tags from controlled data -->
          {@html convertTooltip(skill.tooltip_template)}
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Requirements -->
  {#if hasRequirements}
    <Card.Root class="bg-muted/30">
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Target class="h-5 w-5 text-muted-foreground" />
          Requirements
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          {#if skill.level_required > 0}
            <div>
              <dt class="text-muted-foreground">Level Required</dt>
              <dd class="font-medium">{skill.level_required}</dd>
            </div>
          {/if}
          {#if skill.required_skill_points > 0}
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
                  <span class="text-muted-foreground"
                    >Lvl {skill.prerequisite_level}</span
                  >
                {/if}
              </dd>
            </div>
          {/if}
          {#if skill.required_weapon_category}
            <div>
              <dt class="text-muted-foreground">Required Weapon</dt>
              <dd class="font-medium">
                {skill.required_weapon_category}
                {#if skill.required_weapon_category2}
                  / {skill.required_weapon_category2}
                {/if}
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
          <Clock class="h-5 w-5 text-muted-foreground" />
          Cost & Timing
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          {#if skill.mana_cost}
            <div>
              <dt class="text-muted-foreground">Mana Cost</dt>
              <dd class="font-medium text-blue-600 dark:text-blue-400">
                {formatLinear(skill.mana_cost)}
              </dd>
            </div>
          {/if}
          {#if skill.energy_cost}
            <div>
              <dt class="text-muted-foreground">Energy Cost</dt>
              <dd class="font-medium text-yellow-600 dark:text-yellow-400">
                {formatLinear(skill.energy_cost)}
              </dd>
            </div>
          {/if}
          {#if skill.cooldown}
            <div>
              <dt class="text-muted-foreground">Cooldown</dt>
              <dd class="font-medium">{formatLinear(skill.cooldown, "s")}</dd>
            </div>
          {/if}
          {#if skill.cast_time}
            <div>
              <dt class="text-muted-foreground">Cast Time</dt>
              <dd class="font-medium">{formatLinear(skill.cast_time, "s")}</dd>
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
  {#if skill.damage || skill.damage_percent || skill.aggro}
    <Card.Root class="bg-muted/30">
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Swords class="h-5 w-5 text-red-500" />
          Damage
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          {#if skill.damage}
            <div>
              <dt class="text-muted-foreground">Damage</dt>
              <dd class="font-medium text-red-600 dark:text-red-400">
                {formatLinear(skill.damage)}
              </dd>
            </div>
          {/if}
          {#if skill.damage_percent}
            <div>
              <dt class="text-muted-foreground">Damage %</dt>
              <dd class="font-medium text-red-600 dark:text-red-400">
                {formatLinear(skill.damage_percent, "%")}
              </dd>
            </div>
          {/if}
          {#if skill.damage_type}
            <div>
              <dt class="text-muted-foreground">Damage Type</dt>
              <dd class="font-medium">{skill.damage_type}</dd>
            </div>
          {/if}
          {#if skill.lifetap_percent > 0}
            <div>
              <dt class="text-muted-foreground">Lifetap</dt>
              <dd class="font-medium text-green-600 dark:text-green-400">
                {formatPercent(skill.lifetap_percent)}
              </dd>
            </div>
          {/if}
          {#if skill.aggro}
            <div>
              <dt class="text-muted-foreground">Aggro</dt>
              <dd class="font-medium">{formatLinear(skill.aggro)}</dd>
            </div>
          {/if}
        </dl>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Healing -->
  {#if skill.heals_health || skill.heals_mana}
    <Card.Root class="bg-muted/30">
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Heart class="h-5 w-5 text-green-500" />
          Healing
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          {#if skill.heals_health}
            <div>
              <dt class="text-muted-foreground">Heals Health</dt>
              <dd class="font-medium text-green-600 dark:text-green-400">
                {formatLinear(skill.heals_health)}
              </dd>
            </div>
          {/if}
          {#if skill.heals_mana}
            <div>
              <dt class="text-muted-foreground">Heals Mana</dt>
              <dd class="font-medium text-blue-600 dark:text-blue-400">
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
        <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          {#if skill.stun_chance > 0}
            <div>
              <dt class="text-muted-foreground">Stun Chance</dt>
              <dd class="font-medium">{formatPercent(skill.stun_chance)}</dd>
            </div>
            {#if skill.stun_time > 0}
              <div>
                <dt class="text-muted-foreground">Stun Duration</dt>
                <dd class="font-medium">{formatNumber(skill.stun_time)}s</dd>
              </div>
            {/if}
          {/if}
          {#if skill.fear_chance > 0}
            <div>
              <dt class="text-muted-foreground">Fear Chance</dt>
              <dd class="font-medium">{formatPercent(skill.fear_chance)}</dd>
            </div>
            {#if skill.fear_time > 0}
              <div>
                <dt class="text-muted-foreground">Fear Duration</dt>
                <dd class="font-medium">{formatNumber(skill.fear_time)}s</dd>
              </div>
            {/if}
          {/if}
          {#if skill.knockback_chance > 0}
            <div>
              <dt class="text-muted-foreground">Knockback Chance</dt>
              <dd class="font-medium">
                {formatPercent(skill.knockback_chance)}
              </dd>
            </div>
          {/if}
        </dl>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Buff Duration -->
  {#if skill.duration_base > 0 || skill.duration_per_level > 0}
    <Card.Root class="bg-muted/30">
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Sparkles class="h-5 w-5 text-purple-500" />
          Buff Duration
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <p class="text-sm font-medium">
          {formatDuration(skill.duration_base, skill.duration_per_level)}
        </p>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Stat Bonuses -->
  {#if hasStatBonuses}
    <Card.Root class="bg-muted/30">
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Shield class="h-5 w-5 text-blue-500" />
          Stat Bonuses
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
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
                {formatLinear(skill.health_max_percent_bonus, "%")}
              </dd>
            </div>
          {/if}
          {#if skill.mana_max_bonus}
            <div>
              <dt class="text-muted-foreground">Max Mana</dt>
              <dd class="font-medium">{formatLinear(skill.mana_max_bonus)}</dd>
            </div>
          {/if}
          {#if skill.mana_max_percent_bonus}
            <div>
              <dt class="text-muted-foreground">Max Mana %</dt>
              <dd class="font-medium">
                {formatLinear(skill.mana_max_percent_bonus, "%")}
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
          {#if skill.defense_bonus}
            <div>
              <dt class="text-muted-foreground">Defense</dt>
              <dd class="font-medium">{formatLinear(skill.defense_bonus)}</dd>
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
                {formatLinear(skill.damage_percent_bonus, "%")}
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
                {formatLinear(skill.magic_damage_percent_bonus, "%")}
              </dd>
            </div>
          {/if}
          {#if skill.haste_bonus}
            <div>
              <dt class="text-muted-foreground">Haste</dt>
              <dd class="font-medium">
                {formatLinear(skill.haste_bonus, "%")}
              </dd>
            </div>
          {/if}
          {#if skill.spell_haste_bonus}
            <div>
              <dt class="text-muted-foreground">Spell Haste</dt>
              <dd class="font-medium">
                {formatLinear(skill.spell_haste_bonus, "%")}
              </dd>
            </div>
          {/if}
          {#if skill.speed_bonus}
            <div>
              <dt class="text-muted-foreground">Movement Speed</dt>
              <dd class="font-medium">
                {formatLinear(skill.speed_bonus, "%")}
              </dd>
            </div>
          {/if}
          {#if skill.critical_chance_bonus}
            <div>
              <dt class="text-muted-foreground">Critical Chance</dt>
              <dd class="font-medium">
                {formatLinear(skill.critical_chance_bonus, "%")}
              </dd>
            </div>
          {/if}
          {#if skill.accuracy_bonus}
            <div>
              <dt class="text-muted-foreground">Accuracy</dt>
              <dd class="font-medium">{formatLinear(skill.accuracy_bonus)}</dd>
            </div>
          {/if}
          {#if skill.block_chance_bonus}
            <div>
              <dt class="text-muted-foreground">Block Chance</dt>
              <dd class="font-medium">
                {formatLinear(skill.block_chance_bonus, "%")}
              </dd>
            </div>
          {/if}
          {#if skill.damage_shield}
            <div>
              <dt class="text-muted-foreground">Damage Shield</dt>
              <dd class="font-medium">{formatLinear(skill.damage_shield)}</dd>
            </div>
          {/if}
          {#if skill.cooldown_reduction_percent}
            <div>
              <dt class="text-muted-foreground">Cooldown Reduction</dt>
              <dd class="font-medium">
                {formatLinear(skill.cooldown_reduction_percent, "%")}
              </dd>
            </div>
          {/if}
          {#if skill.heal_on_hit_percent}
            <div>
              <dt class="text-muted-foreground">Heal on Hit</dt>
              <dd class="font-medium">
                {formatLinear(skill.heal_on_hit_percent, "%")}
              </dd>
            </div>
          {/if}
        </dl>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Regen Bonuses -->
  {#if hasRegenBonuses}
    <Card.Root class="bg-muted/30">
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Heart class="h-5 w-5 text-pink-500" />
          Regeneration Bonuses
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
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
                {formatLinear(skill.health_percent_per_second_bonus, "%")}
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
                {formatLinear(skill.mana_percent_per_second_bonus, "%")}
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
                {formatLinear(skill.energy_percent_per_second_bonus, "%")}
              </dd>
            </div>
          {/if}
        </dl>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Resist Bonuses -->
  {#if hasResistBonuses}
    <Card.Root class="bg-muted/30">
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Shield class="h-5 w-5 text-green-500" />
          Resist Bonuses
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
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
        </dl>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Attribute Bonuses -->
  {#if hasAttributeBonuses}
    <Card.Root class="bg-muted/30">
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Sparkles class="h-5 w-5 text-amber-500" />
          Attribute Bonuses
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          {#if skill.strength_bonus}
            <div>
              <dt class="text-muted-foreground">Strength</dt>
              <dd class="font-medium">{formatLinear(skill.strength_bonus)}</dd>
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
              <dd class="font-medium">{formatLinear(skill.dexterity_bonus)}</dd>
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
              <dd class="font-medium">{formatLinear(skill.charisma_bonus)}</dd>
            </div>
          {/if}
        </dl>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Granted By Items -->
  {#if data.grantedByItems.length > 0}
    <Card.Root class="bg-muted/30">
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Package class="h-5 w-5 text-muted-foreground" />
          Granted By Items
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
</div>

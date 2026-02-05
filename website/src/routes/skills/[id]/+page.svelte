<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import * as Card from "$lib/components/ui/card";
  import ClassPills from "$lib/components/ClassPills.svelte";
  import DungeonRestrictionBadge from "$lib/components/DungeonRestrictionBadge.svelte";
  import {
    SKILL_TYPE_INFO,
    ITEM_SOURCE_TYPE_LABELS,
  } from "$lib/constants/skills";
  import { formatPercent, formatDuration } from "$lib/utils/format";
  import type { LinearValue, SkillParsedFields } from "$lib/types/skills";

  let { data } = $props();

  const skill = $derived(data.skill);
  const pf = $derived(data.parsedFields);

  // Format LinearValue: "150 (+10/lvl)" for none, "25% (+2.5%/lvl)" for percent, "3.5s (+0.5s/lvl)" for duration
  function formatLinear(
    value: LinearValue | null,
    unit: "percent" | "duration" | "none" = "none",
  ): string {
    if (!value) return "";
    if (value.base_value === 0 && value.bonus_per_level === 0) return "";

    let base: string;
    let bonus: string;

    if (unit === "percent") {
      base = `${Number((value.base_value * 100).toFixed(2))}%`;
      bonus =
        value.bonus_per_level !== 0
          ? ` (+${Number((value.bonus_per_level * 100).toFixed(2))}%/lvl)`
          : "";
    } else if (unit === "duration") {
      base = `${Number(value.base_value.toFixed(2))}s`;
      bonus =
        value.bonus_per_level !== 0
          ? ` (+${Number(value.bonus_per_level.toFixed(2))}s/lvl)`
          : "";
    } else {
      base = Number.isInteger(value.base_value)
        ? String(value.base_value)
        : value.base_value.toFixed(1);
      bonus =
        value.bonus_per_level !== 0
          ? ` (+${Number.isInteger(value.bonus_per_level) ? String(value.bonus_per_level) : value.bonus_per_level.toFixed(1)}/lvl)`
          : "";
    }
    return `${base}${bonus}`;
  }

  // Convert Unity color tags to HTML spans
  function convertTooltip(template: string): string {
    return template
      .replace(/<color=([^>]+)>/g, '<span style="color: $1">')
      .replace(/<\/color>/g, "</span>")
      .replace(/\n/g, "<br>");
  }

  // Data-driven bonus field rendering
  type BonusField = {
    key: keyof SkillParsedFields;
    label: string;
    unit: "percent" | "duration" | "none";
  };

  const COMBAT_BONUSES: BonusField[] = [
    { key: "defense_bonus", label: "Defense", unit: "none" },
    { key: "magic_resist_bonus", label: "Magic Resist", unit: "none" },
    { key: "damage_bonus", label: "Damage", unit: "none" },
    { key: "damage_percent_bonus", label: "Damage %", unit: "percent" },
    { key: "magic_damage_bonus", label: "Magic Damage", unit: "none" },
    {
      key: "magic_damage_percent_bonus",
      label: "Magic Damage %",
      unit: "percent",
    },
    { key: "accuracy_bonus", label: "Accuracy", unit: "percent" },
    { key: "critical_chance_bonus", label: "Critical Chance", unit: "percent" },
    { key: "block_chance_bonus", label: "Block Chance", unit: "percent" },
    { key: "haste_bonus", label: "Haste", unit: "percent" },
    { key: "spell_haste_bonus", label: "Spell Haste", unit: "percent" },
    { key: "speed_bonus", label: "Speed", unit: "none" },
    {
      key: "cooldown_reduction_percent",
      label: "Cooldown Reduction",
      unit: "percent",
    },
    { key: "heal_on_hit_percent", label: "Heal on Hit", unit: "percent" },
    { key: "damage_shield", label: "Damage Shield", unit: "none" },
    { key: "ward_bonus", label: "Ward", unit: "none" },
    {
      key: "fear_resist_chance_bonus",
      label: "Fear Resist Chance",
      unit: "percent",
    },
  ];

  const RESOURCE_BONUSES: BonusField[] = [
    { key: "health_max_bonus", label: "Max Health", unit: "none" },
    { key: "health_max_percent_bonus", label: "Max Health %", unit: "percent" },
    { key: "mana_max_bonus", label: "Max Mana", unit: "none" },
    { key: "mana_max_percent_bonus", label: "Max Mana %", unit: "percent" },
    { key: "energy_max_bonus", label: "Max Energy", unit: "none" },
  ];

  const REGEN_BONUSES: BonusField[] = [
    {
      key: "health_percent_per_second_bonus",
      label: "Health % / sec",
      unit: "percent",
    },
    { key: "healing_per_second_bonus", label: "Healing / sec", unit: "none" },
    {
      key: "mana_percent_per_second_bonus",
      label: "Mana % / sec",
      unit: "percent",
    },
    { key: "mana_per_second_bonus", label: "Mana / sec", unit: "none" },
    {
      key: "energy_percent_per_second_bonus",
      label: "Energy % / sec",
      unit: "percent",
    },
    { key: "energy_per_second_bonus", label: "Energy / sec", unit: "none" },
  ];

  const RESIST_BONUSES: BonusField[] = [
    { key: "poison_resist_bonus", label: "Poison Resist", unit: "none" },
    { key: "fire_resist_bonus", label: "Fire Resist", unit: "none" },
    { key: "cold_resist_bonus", label: "Cold Resist", unit: "none" },
    { key: "disease_resist_bonus", label: "Disease Resist", unit: "none" },
  ];

  const ATTRIBUTE_BONUSES: BonusField[] = [
    { key: "strength_bonus", label: "Strength", unit: "none" },
    { key: "intelligence_bonus", label: "Intelligence", unit: "none" },
    { key: "dexterity_bonus", label: "Dexterity", unit: "none" },
    { key: "charisma_bonus", label: "Charisma", unit: "none" },
    { key: "wisdom_bonus", label: "Wisdom", unit: "none" },
    { key: "constitution_bonus", label: "Constitution", unit: "none" },
  ];

  function hasAnyBonus(fields: BonusField[]): boolean {
    return fields.some((f) => pf[f.key] != null);
  }

  // Determine which zones to show
  const hasDamage = $derived(
    pf.damage != null || pf.damage_percent != null || pf.aggro != null,
  );
  const hasHealing = $derived(pf.heals_health != null || pf.heals_mana != null);
  const hasCC = $derived(
    pf.stun_chance != null ||
      pf.fear_chance != null ||
      pf.knockback_chance != null,
  );
  const hasBuff = $derived(
    skill.duration_base > 0 ||
      skill.duration_per_level > 0 ||
      skill.is_poison_debuff ||
      skill.is_fire_debuff ||
      skill.is_cold_debuff ||
      skill.is_disease_debuff ||
      skill.is_melee_debuff ||
      skill.is_magic_debuff,
  );
  const hasBonuses = $derived(
    hasAnyBonus(COMBAT_BONUSES) ||
      hasAnyBonus(RESOURCE_BONUSES) ||
      hasAnyBonus(REGEN_BONUSES) ||
      hasAnyBonus(RESIST_BONUSES) ||
      hasAnyBonus(ATTRIBUTE_BONUSES),
  );
  const hasArea = $derived(
    skill.area_object_size > 0 || skill.area_objects_to_spawn > 0,
  );
  const hasSummon = $derived(
    skill.skill_type === "summon" || skill.skill_type === "summon_monsters",
  );
  const hasEffects = $derived(
    hasDamage ||
      hasHealing ||
      hasCC ||
      hasBuff ||
      hasBonuses ||
      hasArea ||
      hasSummon,
  );

  const hasRequirements = $derived(
    skill.level_required > 0 ||
      skill.required_skill_points > 0 ||
      skill.required_spent_points > 0 ||
      skill.prerequisite_skill_id ||
      skill.prerequisite2_skill_id ||
      skill.required_weapon_category ||
      skill.required_weapon_category2 ||
      pf.mana_cost != null ||
      pf.energy_cost != null ||
      pf.cooldown != null ||
      pf.cast_time != null ||
      pf.cast_range != null,
  );
</script>

<svelte:head>
  <title>{skill.name} - Skills - Ancient Kingdoms Compendium</title>
  <meta name="description" content={data.description} />
</svelte:head>

<div class="container mx-auto p-8 space-y-6">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Skills", href: "/skills" },
      { label: skill.name },
    ]}
  />

  <!-- Zone 1: At a Glance -->
  <div class="space-y-4">
    <h1 class="text-3xl font-bold">{skill.name}</h1>

    <div class="flex flex-wrap items-center gap-2">
      <span class="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium">
        {SKILL_TYPE_INFO[skill.skill_type]?.label ?? skill.skill_type}
      </span>
      <span class="text-sm text-muted-foreground"
        >Max Level {skill.max_level}</span
      >

      {#if skill.is_spell}
        <span
          class="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300"
          >Spell</span
        >
      {/if}
      {#if skill.is_veteran}
        <span
          class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300"
          >Veteran</span
        >
      {/if}
      {#if skill.is_stance}
        <span
          class="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
          >Stance</span
        >
      {/if}
      {#if skill.is_mana_shield}
        <span
          class="rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-medium text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300"
          >Mana Shield</span
        >
      {/if}
      {#if skill.is_invisibility}
        <span
          class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >Invisibility</span
        >
      {/if}
      {#if skill.is_resurrect_skill}
        <span
          class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300"
          >Resurrect</span
        >
      {/if}
      {#if skill.is_cleanse}
        <span
          class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
          >Cleanse</span
        >
      {/if}
      {#if skill.is_dispel}
        <span
          class="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-900 dark:text-rose-300"
          >Dispel</span
        >
      {/if}
      {#if skill.is_enrage}
        <span
          class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900 dark:text-red-300"
          >Enrage</span
        >
      {/if}

      <DungeonRestrictionBadge allowDungeon={Boolean(skill.allow_dungeon)} />
    </div>

    {#if data.playerClasses.length > 0}
      <ClassPills classes={data.playerClasses} abbreviated={false} />
    {/if}

    {#if skill.tooltip_template}
      <Card.Root>
        <Card.Content class="prose prose-sm dark:prose-invert max-w-none pt-6">
          <!-- eslint-disable-next-line svelte/no-at-html-tags -- tooltip templates are from game data, not user input -->
          {@html convertTooltip(skill.tooltip_template)}
        </Card.Content>
      </Card.Root>
    {/if}
  </div>

  <!-- Zone 2: Requirements & Cost -->
  {#if hasRequirements}
    <Card.Root>
      <Card.Header>
        <Card.Title>Requirements & Cost</Card.Title>
      </Card.Header>
      <Card.Content>
        <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          {#if skill.level_required > 0}
            <dt class="text-muted-foreground">Level Required</dt>
            <dd>{skill.level_required}</dd>
          {/if}
          {#if skill.required_skill_points > 0}
            <dt class="text-muted-foreground">Skill Points</dt>
            <dd>{skill.required_skill_points}</dd>
          {/if}
          {#if skill.required_spent_points > 0}
            <dt class="text-muted-foreground">Points Spent Required</dt>
            <dd>{skill.required_spent_points}</dd>
          {/if}
          {#if skill.prerequisite_skill_id}
            <dt class="text-muted-foreground">Prerequisite</dt>
            <dd>
              <a
                href="/skills/{skill.prerequisite_skill_id}"
                class="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {data.prerequisiteName ?? skill.prerequisite_skill_id}
              </a>
              {#if skill.prerequisite_level > 0}
                <span class="text-muted-foreground ml-1"
                  >Level {skill.prerequisite_level}</span
                >
              {/if}
            </dd>
          {/if}
          {#if skill.prerequisite2_skill_id}
            <dt class="text-muted-foreground">Prerequisite 2</dt>
            <dd>
              <a
                href="/skills/{skill.prerequisite2_skill_id}"
                class="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {data.prerequisite2Name ?? skill.prerequisite2_skill_id}
              </a>
              {#if skill.prerequisite2_level > 0}
                <span class="text-muted-foreground ml-1"
                  >Level {skill.prerequisite2_level}</span
                >
              {/if}
            </dd>
          {/if}
          {#if skill.required_weapon_category}
            <dt class="text-muted-foreground">Weapon Required</dt>
            <dd>{skill.required_weapon_category}</dd>
          {/if}
          {#if skill.required_weapon_category2}
            <dt class="text-muted-foreground">Weapon Required (alt)</dt>
            <dd>{skill.required_weapon_category2}</dd>
          {/if}
          {#if pf.mana_cost}
            <dt class="text-muted-foreground">Mana Cost</dt>
            <dd>{formatLinear(pf.mana_cost)}</dd>
          {/if}
          {#if pf.energy_cost}
            <dt class="text-muted-foreground">Energy Cost</dt>
            <dd>{formatLinear(pf.energy_cost)}</dd>
          {/if}
          {#if pf.cooldown}
            <dt class="text-muted-foreground">Cooldown</dt>
            <dd>{formatLinear(pf.cooldown, "duration")}</dd>
          {/if}
          {#if pf.cast_time}
            <dt class="text-muted-foreground">Cast Time</dt>
            <dd>{formatLinear(pf.cast_time, "duration")}</dd>
          {/if}
          {#if pf.cast_range}
            <dt class="text-muted-foreground">Cast Range</dt>
            <dd>{formatLinear(pf.cast_range)}</dd>
          {/if}
        </dl>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Zone 3: Effects -->
  {#if hasEffects}
    <Card.Root>
      <Card.Header>
        <Card.Title>Effects</Card.Title>
      </Card.Header>
      <Card.Content class="space-y-6">
        <!-- Damage sub-section -->
        {#if hasDamage}
          <div>
            <h3 class="text-sm font-semibold mb-2">Damage</h3>
            <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              {#if pf.damage}
                <dt class="text-muted-foreground">Damage</dt>
                <dd>{formatLinear(pf.damage)}</dd>
              {/if}
              {#if pf.damage_percent}
                <dt class="text-muted-foreground">Damage %</dt>
                <dd>{formatLinear(pf.damage_percent, "percent")}</dd>
              {/if}
              {#if skill.damage_type}
                <dt class="text-muted-foreground">Damage Type</dt>
                <dd>{skill.damage_type}</dd>
              {/if}
              {#if pf.lifetap_percent}
                <dt class="text-muted-foreground">Life Tap</dt>
                <dd>{formatLinear(pf.lifetap_percent, "percent")}</dd>
              {/if}
              {#if pf.aggro}
                <dt class="text-muted-foreground">Aggro</dt>
                <dd>{formatLinear(pf.aggro)}</dd>
              {/if}
              {#if skill.break_armor_prob > 0}
                <dt class="text-muted-foreground">Break Armor</dt>
                <dd>{formatPercent(skill.break_armor_prob)}</dd>
              {/if}
              {#if skill.is_assassination_skill}
                <dt class="text-muted-foreground">Assassination</dt>
                <dd>Yes</dd>
              {/if}
              {#if skill.is_manaburn_skill}
                <dt class="text-muted-foreground">Manaburn</dt>
                <dd>Yes</dd>
              {/if}
            </dl>
          </div>
        {/if}

        <!-- Healing sub-section -->
        {#if hasHealing}
          <div>
            <h3 class="text-sm font-semibold mb-2">Healing</h3>
            <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              {#if pf.heals_health}
                <dt class="text-muted-foreground">Heals Health</dt>
                <dd>{formatLinear(pf.heals_health)}</dd>
              {/if}
              {#if pf.heals_mana}
                <dt class="text-muted-foreground">Heals Mana</dt>
                <dd>{formatLinear(pf.heals_mana)}</dd>
              {/if}
              {#if skill.can_heal_self}
                <dt class="text-muted-foreground">Can Heal Self</dt>
                <dd>Yes</dd>
              {/if}
              {#if skill.can_heal_others}
                <dt class="text-muted-foreground">Can Heal Others</dt>
                <dd>Yes</dd>
              {/if}
              {#if skill.is_balance_health}
                <dt class="text-muted-foreground">Balance Health</dt>
                <dd>Yes</dd>
              {/if}
              {#if skill.is_resurrect_skill}
                <dt class="text-muted-foreground">Resurrect</dt>
                <dd>Yes</dd>
              {/if}
            </dl>
          </div>
        {/if}

        <!-- Crowd Control sub-section -->
        {#if hasCC}
          <div>
            <h3 class="text-sm font-semibold mb-2">Crowd Control</h3>
            <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              {#if pf.stun_chance}
                <dt class="text-muted-foreground">Stun Chance</dt>
                <dd>{formatLinear(pf.stun_chance, "percent")}</dd>
              {/if}
              {#if pf.stun_time}
                <dt class="text-muted-foreground">Stun Time</dt>
                <dd>{formatLinear(pf.stun_time, "duration")}</dd>
              {/if}
              {#if pf.fear_chance}
                <dt class="text-muted-foreground">Fear Chance</dt>
                <dd>{formatLinear(pf.fear_chance, "percent")}</dd>
              {/if}
              {#if pf.fear_time}
                <dt class="text-muted-foreground">Fear Time</dt>
                <dd>{formatLinear(pf.fear_time, "duration")}</dd>
              {/if}
              {#if pf.knockback_chance}
                <dt class="text-muted-foreground">Knockback Chance</dt>
                <dd>{formatLinear(pf.knockback_chance, "percent")}</dd>
              {/if}
            </dl>
          </div>
        {/if}

        <!-- Buff Properties sub-section -->
        {#if hasBuff}
          <div>
            <h3 class="text-sm font-semibold mb-2">Buff Properties</h3>
            <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              {#if skill.duration_base > 0}
                <dt class="text-muted-foreground">Duration</dt>
                <dd>
                  {formatDuration(skill.duration_base)}
                  {#if skill.duration_per_level > 0}
                    <span class="text-muted-foreground"
                      >(+{formatDuration(skill.duration_per_level)}/lvl)</span
                    >
                  {/if}
                </dd>
              {/if}
              {#if skill.buff_category}
                <dt class="text-muted-foreground">Category</dt>
                <dd>{skill.buff_category}</dd>
              {/if}
              {#if skill.can_buff_self}
                <dt class="text-muted-foreground">Can Buff Self</dt>
                <dd>Yes</dd>
              {/if}
              {#if skill.can_buff_others}
                <dt class="text-muted-foreground">Can Buff Others</dt>
                <dd>Yes</dd>
              {/if}
              {#if skill.is_permanent}
                <dt class="text-muted-foreground">Permanent</dt>
                <dd>Yes</dd>
              {/if}
              {#if skill.remain_after_death}
                <dt class="text-muted-foreground">Remains After Death</dt>
                <dd>Yes</dd>
              {/if}
              {#if skill.prob_ignore_cleanse > 0}
                <dt class="text-muted-foreground">Ignore Cleanse</dt>
                <dd>{formatPercent(skill.prob_ignore_cleanse)}</dd>
              {/if}
            </dl>
            {#each [[skill.is_poison_debuff ? "Poison" : null, skill.is_fire_debuff ? "Fire" : null, skill.is_cold_debuff ? "Cold" : null, skill.is_disease_debuff ? "Disease" : null, skill.is_melee_debuff ? "Melee" : null, skill.is_magic_debuff ? "Magic" : null].filter(Boolean)] as debuffTypes, i (i)}
              {#if debuffTypes.length > 0}
                <div class="flex flex-wrap gap-1 mt-2">
                  {#each debuffTypes as dt (dt)}
                    <span
                      class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900 dark:text-red-300"
                      >{dt}</span
                    >
                  {/each}
                </div>
              {/if}
            {/each}
            {#each [[skill.is_decrease_resists_skill ? "Decrease Resists" : null, skill.is_undead_illusion ? "Undead Illusion" : null, skill.is_blindness ? "Blindness" : null, skill.is_avatar_war ? "Avatar of War" : null, skill.is_only_for_magic_classes ? "Magic Classes Only" : null].filter(Boolean)] as specialFlags, i (i)}
              {#if specialFlags.length > 0}
                <div class="flex flex-wrap gap-1 mt-2">
                  {#each specialFlags as sf (sf)}
                    <span
                      class="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                      >{sf}</span
                    >
                  {/each}
                </div>
              {/if}
            {/each}
          </div>
        {/if}

        <!-- Bonuses sub-section (data-driven) -->
        {#if hasBonuses}
          <div class="space-y-4">
            <h3 class="text-sm font-semibold">Bonuses</h3>

            {#if hasAnyBonus(COMBAT_BONUSES)}
              <div>
                <h4 class="text-xs font-medium text-muted-foreground mb-1">
                  Combat
                </h4>
                <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
                  {#each COMBAT_BONUSES as { key, label, unit } (key)}
                    {@const display = formatLinear(
                      pf[key] as LinearValue | null,
                      unit,
                    )}
                    {#if display}
                      <dt class="text-muted-foreground">{label}</dt>
                      <dd>{display}</dd>
                    {/if}
                  {/each}
                </dl>
              </div>
            {/if}

            {#if hasAnyBonus(RESOURCE_BONUSES)}
              <div>
                <h4 class="text-xs font-medium text-muted-foreground mb-1">
                  Resources
                </h4>
                <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
                  {#each RESOURCE_BONUSES as { key, label, unit } (key)}
                    {@const display = formatLinear(
                      pf[key] as LinearValue | null,
                      unit,
                    )}
                    {#if display}
                      <dt class="text-muted-foreground">{label}</dt>
                      <dd>{display}</dd>
                    {/if}
                  {/each}
                </dl>
              </div>
            {/if}

            {#if hasAnyBonus(REGEN_BONUSES)}
              <div>
                <h4 class="text-xs font-medium text-muted-foreground mb-1">
                  Regeneration
                </h4>
                <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
                  {#each REGEN_BONUSES as { key, label, unit } (key)}
                    {@const display = formatLinear(
                      pf[key] as LinearValue | null,
                      unit,
                    )}
                    {#if display}
                      <dt class="text-muted-foreground">{label}</dt>
                      <dd>{display}</dd>
                    {/if}
                  {/each}
                </dl>
              </div>
            {/if}

            {#if hasAnyBonus(RESIST_BONUSES)}
              <div>
                <h4 class="text-xs font-medium text-muted-foreground mb-1">
                  Resistances
                </h4>
                <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
                  {#each RESIST_BONUSES as { key, label, unit } (key)}
                    {@const display = formatLinear(
                      pf[key] as LinearValue | null,
                      unit,
                    )}
                    {#if display}
                      <dt class="text-muted-foreground">{label}</dt>
                      <dd>{display}</dd>
                    {/if}
                  {/each}
                </dl>
              </div>
            {/if}

            {#if hasAnyBonus(ATTRIBUTE_BONUSES)}
              <div>
                <h4 class="text-xs font-medium text-muted-foreground mb-1">
                  Attributes
                </h4>
                <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
                  {#each ATTRIBUTE_BONUSES as { key, label, unit } (key)}
                    {@const display = formatLinear(
                      pf[key] as LinearValue | null,
                      unit,
                    )}
                    {#if display}
                      <dt class="text-muted-foreground">{label}</dt>
                      <dd>{display}</dd>
                    {/if}
                  {/each}
                </dl>
              </div>
            {/if}
          </div>
        {/if}

        <!-- Area Mechanics sub-section -->
        {#if hasArea}
          <div>
            <h3 class="text-sm font-semibold mb-2">Area Mechanics</h3>
            <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              {#if skill.area_object_size > 0}
                <dt class="text-muted-foreground">Area Size</dt>
                <dd>{skill.area_object_size}</dd>
              {/if}
              {#if skill.area_object_delay_damage > 0}
                <dt class="text-muted-foreground">Delay Damage</dt>
                <dd>{skill.area_object_delay_damage}s</dd>
              {/if}
              {#if skill.area_objects_to_spawn > 0}
                <dt class="text-muted-foreground">Objects to Spawn</dt>
                <dd>{skill.area_objects_to_spawn}</dd>
              {/if}
              {#if skill.affects_random_target}
                <dt class="text-muted-foreground">Affects Random Target</dt>
                <dd>Yes</dd>
              {/if}
            </dl>
          </div>
        {/if}

        <!-- Summon sub-section -->
        {#if hasSummon}
          <div>
            <h3 class="text-sm font-semibold mb-2">Summon</h3>
            <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              {#if skill.skill_type === "summon" && skill.pet_prefab_name}
                <dt class="text-muted-foreground">Pet</dt>
                <dd>{skill.pet_prefab_name}</dd>
                {#if skill.is_familiar}
                  <dt class="text-muted-foreground">Familiar</dt>
                  <dd>Yes</dd>
                {/if}
              {/if}
              {#if skill.skill_type === "summon_monsters" && skill.summoned_monster_id}
                <dt class="text-muted-foreground">Monster</dt>
                <dd>
                  <a
                    href="/monsters/{skill.summoned_monster_id}"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {data.summonedMonsterName ?? skill.summoned_monster_id}
                  </a>
                </dd>
                {#if skill.summoned_monster_level != null}
                  <dt class="text-muted-foreground">Monster Level</dt>
                  <dd>{skill.summoned_monster_level}</dd>
                {/if}
                {#if skill.summon_count_per_cast != null}
                  <dt class="text-muted-foreground">Count Per Cast</dt>
                  <dd>
                    {skill.summon_count_per_cast === -1
                      ? "Unlimited"
                      : skill.summon_count_per_cast}
                  </dd>
                {/if}
                {#if skill.max_active_summons != null}
                  <dt class="text-muted-foreground">Max Active</dt>
                  <dd>{skill.max_active_summons}</dd>
                {/if}
              {/if}
            </dl>
          </div>
        {/if}
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- Granted By Items -->
  {#if data.grantedByItems.length > 0}
    <Card.Root>
      <Card.Header>
        <Card.Title>Granted By Items</Card.Title>
      </Card.Header>
      <Card.Content>
        <ul class="space-y-1 text-sm">
          {#each data.grantedByItems as item (item.item_id)}
            <li class="flex items-center gap-2">
              <a
                href="/items/{item.item_id}"
                class="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {item.item_name}
              </a>
              <span class="text-muted-foreground text-xs">
                {ITEM_SOURCE_TYPE_LABELS[item.type] ?? item.type}
                {#if item.probability != null && item.probability < 1}
                  ({formatPercent(item.probability)})
                {/if}
              </span>
            </li>
          {/each}
        </ul>
      </Card.Content>
    </Card.Root>
  {/if}
</div>

<script lang="ts">
  import { base } from "$app/paths";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import EntityIcon from "$lib/components/EntityIcon.svelte";
  import PageSections from "$lib/components/PageSections.svelte";
  import * as Card from "$lib/components/ui/card";
  import type { PageData } from "./$types";
  import {
    formatMasteryNeeded,
    formatLinear,
    formatLinearAbs,
    formatLinearPercent,
    formatLinearPercentAbs,
    formatPercent,
    formatDuration,
    hasLinearValue,
    isNegativeLinear,
    convertTooltip,
  } from "$lib/skills/skill-format";
  import { skillFacts } from "$lib/skills/skill-facts";
  import { mechanicsSections } from "$lib/skills/mechanics-sections";
  import MechanicsCard from "$lib/components/skill-mechanics/MechanicsCard.svelte";
  import {
    scalingColumns as getScalingColumns,
    computeScalingValue,
    showLevelScaling as getShowLevelScaling,
  } from "$lib/skills/skill-scaling";
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
  import * as fmt from "$lib/calculation/format";
  import { spellInterval } from "$lib/calculation/combat";
  import MonsterTypeIcon from "$lib/components/MonsterTypeIcon.svelte";
  import Skull from "@lucide/svelte/icons/skull";
  import Cat from "@lucide/svelte/icons/cat";
  import Star from "@lucide/svelte/icons/star";
  import Ghost from "@lucide/svelte/icons/ghost";
  import TrendingUp from "@lucide/svelte/icons/trending-up";
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
  const facts = $derived(
    skillFacts(
      skill,
      data.usedByPets,
      data.mechanicsSpec,
      data.grantedByItems,
      data.usedByMonsters.length > 0,
    ),
  );
  const {
    losesVeteranPoints,
    hasScrollMasteryScaling,
    hasScrollDispelScaling,
    scrollOnly,
    hasBuffEffects,
    hasAnyBonuses,
    hasCrowdControl,
    hasDamage,
    meaningfulWeapon,
    hasRequirements,
    shortensCast,
    timingModels,
    hasteCooldownCasters,
  } = $derived(facts);
  const scalingColumns = $derived(getScalingColumns(skill, scrollOnly));
  const showLevelScaling = $derived(
    getShowLevelScaling(skill, scalingColumns, hasScrollMasteryScaling),
  );
  // Source: server-scripts/AreaBuffSkill.cs:Apply — a pet-cast area buff skips a target that already has a different buff of its category.
  const groupHasMercenaryAreaBuff = $derived(
    (skill.skill_type === "area_buff" &&
      data.usedByPets.some((pet) => pet.is_mercenary)) ||
      data.categorySkills.some((other) => other.mercenaryAreaBuff),
  );
  const mechanicsSectionIds = $derived(
    mechanicsSections({ skill, spec: data.mechanicsSpec, facts }),
  );
  const showCostTiming = $derived(
    Boolean(
      scrollOnly ||
      skill.is_bard_song ||
      skill.mana_cost ||
      skill.energy_cost ||
      skill.cooldown ||
      skill.cast_time ||
      skill.cast_range,
    ),
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
        show: showCostTiming,
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
      {
        id: "mechanics",
        label: "Mechanics",
        show: mechanicsSectionIds.length > 0,
      },
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
      <!-- Source: server-scripts/AreaBuffSkill.cs:Apply, server-scripts/AreaHealSkill.cs:Apply, server-scripts/TargetHealSkill.cs:Apply — mercenary targeting branches require a player caster. -->
      {#if skill.is_mercenary_skill && !data.usedByPets.some((pet) => pet.is_mercenary)}
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
          {data.skillCategories.join(" / ")}
        </span>
      {/if}
      <span>Max Rank {skill.max_level}</span>
      <a
        class="underline underline-offset-4 hover:text-foreground"
        href="{base}/mechanics/character#skills-and-specializations"
      >
        How ranks are learned
      </a>
    </div>
  </div>

  <!-- Page Anchor Navigation -->
  <PageSections {sections} />

  <!-- Appearance -->
  {#if data.visualAsset}
    <Card.Root id="appearance" class="bg-muted/30">
      <Card.Header>
        <Card.Title level={2} class="flex items-center gap-2">
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
        <Card.Title level={2} class="flex items-center gap-2">
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
        <Card.Title level={2} class="flex items-center gap-2">
          <Target class="h-5 w-5 text-orange-500" />
          Requirements
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
          {#if skill.player_classes.length > 0 && skill.tier >= 1 && skill.tier <= 4}
            <!-- Source: server-scripts/PlayerSkills.cs:CanLearnTierSkill — tiers 1 and 3 allow two distinct skills; tiers 2 and 4 allow one. -->
            <div>
              <dt class="text-muted-foreground">Tier Limit</dt>
              <dd class="font-medium">
                <a
                  href="/mechanics/character#skills-and-specializations"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {skill.tier === 1 || skill.tier === 3 ? 2 : 1} Tier {skill.tier}
                  {skill.tier === 1 || skill.tier === 3 ? "skills" : "skill"}
                </a>
              </dd>
            </div>
          {/if}
          {#if skill.level_required > 1}
            <div>
              <dt class="text-muted-foreground">Level Required</dt>
              <dd class="font-medium">{skill.level_required}</dd>
            </div>
          {/if}
          {#if skill.required_skill_points > 1}
            <div>
              <!-- Source: server-scripts/PlayerSkills.cs:CmdUpgrade,CmdUpgradeVeteran — each rank pays the skill's required points from the corresponding pool. -->
              <dt class="text-muted-foreground">Cost per Rank</dt>
              <dd class="font-medium">
                {skill.required_skill_points}
                {skill.is_veteran ? "veteran points" : "skill points"}
              </dd>
            </div>
          {/if}
          {#if skill.required_spent_points > 0}
            <div>
              <dt class="text-muted-foreground">
                {skill.is_veteran
                  ? "Veteran Points Already Spent"
                  : "Class Skill Points Already Spent"}
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
          <!-- Source: server-scripts/PlayerSkills.cs:1819-1829,1883-1923,2534-2537 — upgrade pays the authored cost, progression and reset sum one point per learned rank. -->
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
  {#if showCostTiming}
    <Card.Root id="cost-timing" class="bg-muted/30">
      <Card.Header>
        <Card.Title level={2} class="flex items-center gap-2">
          <Clock class="h-5 w-5 text-blue-500" />
          Cost & Timing
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
          {#if scrollOnly}
            <!-- Source: server-scripts/PlayerInventory.cs:StartScrollCast; server-scripts/ScrollItem.cs:UseAfterCast; server-scripts/UsableItem.cs:Use — fixed 1-second cast, no Mana payment, cooldown comes from the scroll item. -->
            <div>
              <dt class="text-muted-foreground">Mana Cost</dt>
              <dd class="font-medium">None</dd>
            </div>
            <div>
              <dt class="text-muted-foreground">Cast Time</dt>
              <dd class="font-medium">1s</dd>
            </div>
            {#each data.scrollItems as item (item.id)}
              <div>
                <dt class="text-muted-foreground">Scroll Cooldown</dt>
                <dd class="font-medium">
                  {fmt.formatSeconds(item.cooldown)}
                  <a
                    href="/items/{item.id}"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                    >{item.name}</a
                  >
                </dd>
              </div>
            {/each}
          {/if}
          {#if !scrollOnly && skill.mana_cost && !skill.is_bard_song}
            <div>
              <dt class="text-muted-foreground">Mana Cost</dt>
              <dd class="font-medium">{formatLinear(skill.mana_cost)}</dd>
            </div>
          {/if}
          {#if !scrollOnly && skill.energy_cost}
            <div>
              <dt class="text-muted-foreground">Rage Cost</dt>
              <dd class="font-medium">{formatLinear(skill.energy_cost)}</dd>
            </div>
          {/if}
          {#if !scrollOnly && skill.cast_time}
            <div>
              <dt class="text-muted-foreground">Cast Time</dt>
              <dd class="font-medium">{formatLinear(skill.cast_time, "s")}</dd>
            </div>
          {/if}
          {#if !scrollOnly && skill.cooldown}
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
          <!-- Source: server-scripts/Skills.cs:924-933,1141-1169; Player.cs:3439-3476 — spell haste shortens casts, Haste shortens auto-attack waits and some cooldowns. -->
          <div class="mt-3 space-y-1 text-sm text-muted-foreground">
            {#if shortensCast && skill.cast_time}
              <!-- Source: server-scripts/Pet.cs:TryStartAttackIfInRange; server-scripts/BardMercenarySkills.cs:StartSongCast — mercenary casts use its own equipment and buff spell haste. -->
              <p>
                {#if skill.player_classes.length === 0 && facts.usedByMercenary}The
                  mercenary's{/if}
                <a
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                  href="/mechanics/combat#cast-speed">Spell Casting Haste</a
                >
                shortens the cast by its percentage, so 20% Spell Casting Haste turns
                the
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
                  href="/mechanics/combat#attack-speed">Haste</a
                > shortens the wait between your auto attacks.
              </p>
            {/if}
            {#if hasteCooldownCasters}
              <p>
                <a
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                  href="/mechanics/combat#haste">Haste</a
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
        <Card.Title level={2} class="flex items-center gap-2">
          <Swords class="h-5 w-5 text-red-500" />
          Damage
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
          {#if skill.damage}
            <div>
              <dt class="text-muted-foreground">Skill damage</dt>
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
              <!-- Source: server-scripts/PlayerSkills.cs:TryUse — cast is permitted at or below RoundToInt(target maximum Health / 4). -->
              <p class="text-amber-600 dark:text-amber-400">
                Assassination requires the target's Health to be at most 25% of
                its maximum Health, rounded to the nearest whole point.
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
        <Card.Title level={2} class="flex items-center gap-2">
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
              <!-- Source: server-scripts/AreaHealSkill.cs:Apply — isBalanceHealth averages the health percentages of the caster and living, visible players and pets in range without a party restriction. -->
              Sets you and every living, visible player, companion and mercenary within
              range to their average health percentage, whether in your party or not.
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
        <Card.Title level={2} class="flex items-center gap-2">
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
        <Card.Title level={2} class="flex items-center gap-2">
          <Ghost class="h-5 w-5 text-violet-500" />
          Summon Info
        </Card.Title>
      </Card.Header>
      <Card.Content>
        {#if skill.skill_type === "summon_monsters" && skill.summon_count_per_cast === 0}
          <!-- Source: server-scripts/SummonSkillMonsters.cs:Apply — only players or pets, strictly farther than 3 yd and closer than cast range, are pulled and stunned. -->
          <p class="text-sm font-medium">
            Pulls the monster's target to the monster and stuns it for 2
            seconds. The target must be a player or pet more than 3 yd away and
            closer than {formatLinear(skill.cast_range, " yd")}.
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
                  <!-- Source: server-scripts/SummonSkillMonsters.cs:Apply — count players and mercenaries on the summoner's aggro list, limited by remaining active slots. -->
                  1 per player or mercenary the monster considers an enemy, limited
                  by Max Active
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
                {#if skill.pet_id && skill.pet_name}
                  <a
                    href={petHref(skill.pet_id, skill.pet_is_mercenary)}
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {skill.pet_name}
                  </a>
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
          {#if skill.is_familiar}
            <!-- Source: server-scripts/SummonSkill.cs:Apply; server-scripts/PetSkills.cs:RefreshSkillLevels — familiar level and skill ranks follow the summoning skill, capped per skill. -->
            <p class="mt-3 text-muted-foreground">
              This skill's rank sets the familiar's level. Its skills use the
              same rank, up to their own maximums:
              {#each data.familiarSkills as familiarSkill, index (familiarSkill.id)}
                {index > 0 ? ", " : ""}
                <a
                  href="/skills/{familiarSkill.id}"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                  >{familiarSkill.name}</a
                >
                (maximum rank {familiarSkill.max_level}){index ===
                data.familiarSkills.length - 1
                  ? "."
                  : ""}
              {/each}
            </p>
          {:else}
            <!-- Source: server-scripts/SummonSkill.cs:UsesPetAttackCommand,Apply; server-scripts/GameManager.cs:ExtraSkillbarKeyPressed — non-familiar summons command an active companion; Necromancers replace a different companion, and commands require a target within 15 yd of it. -->
            <p class="mt-3 text-muted-foreground">
              {#if skill.player_classes.includes("necromancer")}
                Summoning a different companion replaces your current companion.
                Using this skill while its companion is active commands that
                companion to attack your target instead.
              {:else}
                Using this skill while your companion is active commands it to
                attack your target instead of summoning.
              {/if}
              The target must be within 15 yd of the companion.
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
        <Card.Title level={2} class="flex items-center gap-2">
          <Sparkles class="h-5 w-5 text-purple-500" />
          Buff/Debuff Effects
        </Card.Title>
      </Card.Header>
      <Card.Content class="space-y-4">
        {#if data.categorySkills.length > 0}
          <!-- Source: server-scripts/Skills.cs:AddOrRefreshBuff — a new buff expires existing buffs with the same category. -->
          <p class="text-sm">
            {#if data.categorySkills.length <= 6}
              Shares an overwrite group with
              {#each data.categorySkills as other, index (other.id)}{#if index > 0}{index ===
                  data.categorySkills.length - 1
                    ? " and "
                    : ", "}{/if}<a
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                  href="{base}/skills/{other.id}">{other.name}</a
                >{/each}.
            {:else}
              Shares the {skill.buff_category} overwrite group with {data
                .categorySkills.length} other effects.
            {/if}
            A new effect of the group replaces the others on that character.
            {#if groupHasMercenaryAreaBuff}
              A mercenary's area buff is the exception. It skips characters who
              already have another effect of the group.
            {/if}
            <a
              class="text-blue-600 dark:text-blue-400 hover:underline"
              href="{base}/mechanics/combat#duration-and-stacking"
              >How effects stack</a
            >
          </p>
        {/if}
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
                <dt class="text-muted-foreground">Attack Power</dt>
                <dd class="font-medium">{formatLinear(skill.damage_bonus)}</dd>
              </div>
            {/if}
            {#if skill.damage_percent_bonus}
              <div>
                <dt class="text-muted-foreground">Attack Power %</dt>
                <dd class="font-medium">
                  {formatLinearPercent(skill.damage_percent_bonus)}
                </dd>
              </div>
            {/if}
            {#if skill.magic_damage_bonus}
              <div>
                <dt class="text-muted-foreground">Spell Power</dt>
                <dd class="font-medium">
                  {formatLinear(skill.magic_damage_bonus)}
                </dd>
              </div>
            {/if}
            {#if skill.magic_damage_percent_bonus}
              <div>
                <dt class="text-muted-foreground">Spell Power %</dt>
                <dd class="font-medium">
                  {formatLinearPercent(skill.magic_damage_percent_bonus)}
                </dd>
              </div>
            {/if}
            <!-- 4. Defense (mitigation grouped together) -->
            {#if skill.defense_bonus}
              <div>
                <dt class="text-muted-foreground">Armor Class</dt>
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
                <dt class="text-muted-foreground">Spell Casting Haste</dt>
                <dd class="font-medium">
                  {formatLinearPercent(skill.spell_haste_bonus)}
                </dd>
              </div>
            {/if}
            <!-- 6. Hit/chance modifiers -->
            {#if skill.critical_chance_bonus}
              <div>
                <dt class="text-muted-foreground">Critical Strike</dt>
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
        <Card.Title level={2} class="flex items-center gap-2">
          <TrendingUp class="h-5 w-5 text-emerald-500" />
          Rank Scaling
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="overflow-x-auto">
          <table
            class="w-full text-sm whitespace-nowrap [&_th]:whitespace-normal max-md:[&_th]:min-w-28"
          >
            <thead>
              <tr class="border-b">
                <th
                  class="rank-cell sticky left-0 z-10 min-w-16 py-2 px-2.5 text-left font-medium text-muted-foreground"
                  >Rank</th
                >
                {#if hasScrollMasteryScaling}
                  <th
                    class="py-2 px-2.5 font-medium text-muted-foreground text-right"
                    >Scroll Mastery Needed</th
                  >
                {/if}
                {#each scalingColumns as col (col.label)}
                  <th
                    class="py-2 px-2.5 font-medium text-muted-foreground text-right"
                    >{col.label}</th
                  >
                {/each}
                {#if hasScrollDispelScaling}
                  <th
                    class="py-2 px-2.5 font-medium text-muted-foreground text-right"
                    >Cleanse Resist Reduction</th
                  >
                {/if}
              </tr>
            </thead>
            <tbody>
              {#each Array.from({ length: skill.max_level }, (_, i) => i + 1) as level (level)}
                <tr class="border-b border-border/50 even:bg-muted/40">
                  <td
                    class="rank-cell sticky left-0 z-10 py-1.5 px-2.5 font-medium"
                    >{level}</td
                  >
                  {#if hasScrollMasteryScaling}
                    <td class="py-1.5 px-2.5 text-right text-muted-foreground"
                      >{formatMasteryNeeded(level)}</td
                    >
                  {/if}
                  {#each scalingColumns as col (col.label)}
                    <td class="py-1.5 px-2.5 text-right"
                      >{computeScalingValue(col, level)}</td
                    >
                  {/each}
                  {#if hasScrollDispelScaling}
                    <td class="py-1.5 px-2.5 text-right"
                      >{level} percentage point{level === 1 ? "" : "s"}</td
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
  {#if mechanicsSectionIds.length > 0}
    <MechanicsCard
      id="mechanics"
      sections={mechanicsSectionIds}
      {skill}
      spec={data.mechanicsSpec}
      {facts}
    />
  {/if}

  <!-- Granted By Items -->
  {#if data.grantedByItems.length > 0}
    <Card.Root id="granted-by-items" class="bg-muted/30">
      <Card.Header>
        <Card.Title level={2} class="flex items-center gap-2">
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
        <Card.Title level={2} class="flex items-center gap-2">
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
        <Card.Title level={2} class="flex items-center gap-2">
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
            <p>
              {TRAP_TYPE_LABELS[usage.type]}
              <span class="text-muted-foreground">×{usage.trap_count} in</span>
              <a
                href="/zones/{usage.zone_id}"
                class="text-blue-600 dark:text-blue-400 hover:underline"
                >{usage.zone_name}</a
              >
            </p>
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
        <Card.Title level={2} class="flex items-center gap-2">
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
        <Card.Title level={2} class="flex items-center gap-2">
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

<style>
  /* The sticky rank column covers scrolled cells, so it repaints the page,
     the card's muted tint and the even-row stripe as opaque layers. */
  .rank-cell {
    --card-tint: color-mix(in oklab, var(--muted) 30%, transparent);
    background-color: var(--background);
    background-image: linear-gradient(var(--card-tint), var(--card-tint));
  }

  tr:nth-child(even) > .rank-cell {
    --row-tint: color-mix(in oklab, var(--muted) 40%, transparent);
    background-image:
      linear-gradient(var(--row-tint), var(--row-tint)),
      linear-gradient(var(--card-tint), var(--card-tint));
  }
</style>

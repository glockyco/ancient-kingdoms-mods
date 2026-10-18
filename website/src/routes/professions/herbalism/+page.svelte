<script lang="ts">
  import { formatNumber, formatPercent } from "$lib/utils/format";
  import Seo from "$lib/components/Seo.svelte";
  import { detailTitle } from "$lib/seo/title";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import MechanicsLink from "$lib/components/MechanicsLink.svelte";
  import AchievementLink from "$lib/components/AchievementLink.svelte";
  import CalculatorIcon from "@lucide/svelte/icons/calculator";
  import Leaf from "@lucide/svelte/icons/leaf";
  import {
    PROFESSION_MECHANICS,
    isEffortlessAtTier,
    skillGainChance,
  } from "$lib/data/professions/mechanics";
  import { professionAttempt } from "$lib/acquisition/rules";
  import MethodList from "$lib/components/acquisition/MethodList.svelte";

  let { data } = $props();

  // Skill level state (0-100%)
  let skillLevel = $state(0);

  // Roman numerals for level display
  const romanNumerals = ["I", "II", "III", "IV", "V"];

  // Create a map of tier -> resource count
  const resourceCountMap = $derived(
    new Map(data.resourceCounts.map((rc) => [rc.tier, rc.count])),
  );

  // Create a map of tier -> XP
  const xpByTierMap = $derived(
    new Map(data.xpByTier.map((tx) => [tx.tier, tx.xp])),
  );

  function getSuccessChance(resourceLevel: number): number {
    return (
      professionAttempt("herbalism", resourceLevel, skillLevel / 100, null)
        .raw * 100
    );
  }

  function getSuccessChanceColor(chance: number): string {
    if (chance >= 100) return "text-green-500";
    if (chance >= 75) return "text-lime-500";
    if (chance >= 50) return "text-yellow-500";
    if (chance >= 25) return "text-orange-500";
    return "text-red-500";
  }

  // Source: server-scripts/GatherItem.cs:567-576 — capped skill uses the shared quadratic gain rule.
  function getSkillGainChance(): number {
    return (
      skillGainChance(PROFESSION_MECHANICS.herbalism.skillGain, skillLevel) *
      100
    );
  }

  // Source: server-scripts/GatherItem.cs:OnInteractServer — a harvest below the success floor is refused.
  const successFloorPercent =
    PROFESSION_MECHANICS.herbalism.success.floor * 100;

  // Source: server-scripts/GatherItem.cs:567-576 — no gain at the cap, otherwise 1-3 divided by success and 1000.
  function getSkillGainAmount(successChance: number): [number, number] {
    if (successChance < successFloorPercent || skillLevel >= 100) return [0, 0];
    const successFraction = successChance / 100;
    const { range, divisor } = PROFESSION_MECHANICS.herbalism.skillGain;
    const min = (range[0] / (successFraction * divisor)) * 100;
    const max = (range[1] / (successFraction * divisor)) * 100;
    return [min, max];
  }

  // Source: server-scripts/GatherItem.cs:OnInteractServer
  // A successful gather grants no mastery once skill is strictly above 25% for tier I,
  // 50% for tier II, or 75% for tier III.
  function isEffortless(resourceLevel: number): boolean {
    return (
      skillLevel >= 100 ||
      isEffortlessAtTier(
        PROFESSION_MECHANICS.herbalism.effortless,
        resourceLevel,
        skillLevel,
      )
    );
  }
</script>

<Seo
  title={detailTitle(data.profession.name, { family: "Profession" })}
  description={`${data.profession.description} Success chances, skill gains and XP for every plant tier at your Herbalism skill.`}
  path="/professions/herbalism"
/>

<div class="container mx-auto max-w-6xl space-y-10 p-8">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Professions", href: "/professions" },
      { label: data.profession.name },
    ]}
  />

  <!-- Header -->
  <div class="flex flex-wrap items-start gap-4 sm:flex-nowrap">
    <div
      class="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0"
    >
      <Leaf class="h-8 w-8 text-green-500 dark:text-green-400" />
    </div>
    <div>
      <div class="flex items-center gap-2">
        <h1 class="text-3xl font-bold">{data.profession.name}</h1>
        <span
          class="px-2 py-0.5 text-xs rounded-full bg-muted text-green-500 dark:text-green-400 font-medium"
        >
          Gathering
        </span>
      </div>
      <p class="text-muted-foreground mt-1">{data.profession.description}</p>

      <div class="flex items-center gap-4 mt-3 text-muted-foreground">
        <span>Max Level: {data.profession.max_level}%</span>
        {#if data.profession.achievement_id}
          <AchievementLink
            achievementId={data.profession.achievement_id}
            achievementName={data.profession.achievement_name}
          />
        {/if}
      </div>
    </div>
  </div>

  <section id="how-it-works" class="rounded-lg border p-5 space-y-3">
    <h2 class="text-xl font-semibold">How Herbalism works</h2>
    <!-- Source: server-scripts/GatherItem.cs:208-250,327-350 — a growing plant is not ready and a low-skill attempt is refused. -->
    <p class="text-muted-foreground">
      Harvest fully grown plants with at least a 10% success chance and
      inventory space.
    </p>
    <!-- Source: server-scripts/GatherItem.cs:379-400 — an allowed harvest starts regrowth before the success roll. -->
    <p class="text-muted-foreground">
      Even a failed harvest makes the plant regrow before you can try again.
      Tier I plants stop raising Herbalism above 25%, Tier II above 50% and Tier
      III above 75%.
    </p>
  </section>

  <!-- Calculator -->
  <section class="space-y-4">
    <h2 class="text-xl font-semibold flex items-center gap-2">
      <CalculatorIcon class="h-5 w-5 text-cyan-500" />
      Calculator
    </h2>
    <div
      class="rounded-lg border p-3 flex flex-wrap items-center gap-x-6 gap-y-2"
    >
      <div class="flex flex-wrap items-center gap-3">
        <label for="skill-slider" class="shrink-0">Herbalism Skill:</label>
        <input
          id="skill-slider"
          type="range"
          min="0"
          max="100"
          step="1"
          bind:value={skillLevel}
          class="w-32 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
        />
        <span class="font-mono w-12">{skillLevel}%</span>
      </div>
      <div class="flex items-center gap-2 text-muted-foreground">
        <span>Skill gain chance:</span>
        <span class="font-mono text-foreground"
          >{formatPercent(getSkillGainChance() / 100, {
            decimals: 0,
            trailingZeros: true,
          })}</span
        >
        <span class="text-xs">(per success)</span>
      </div>
    </div>
    <div class="rounded-lg border overflow-x-auto">
      <div
        class="grid w-full min-w-[36rem] whitespace-nowrap"
        style="grid-template-columns: 4rem minmax(9rem, 1fr) minmax(11rem, 1fr) minmax(6rem, 1fr) minmax(6rem, 1fr);"
      >
        <div class="bg-muted/50 p-3 font-medium">Tier</div>
        <div class="bg-muted/50 p-3 font-medium text-right">Success</div>
        <div class="bg-muted/50 p-3 font-medium text-right">Skill Gain</div>
        <div class="bg-muted/50 p-3 font-medium text-right">XP</div>
        <div class="bg-muted/50 p-3 font-medium text-right">Plants</div>
        {#each [0, 1, 2, 3, 4] as tier (tier)}
          {@const successChance = getSuccessChance(tier)}
          {@const effortless = isEffortless(tier)}
          {@const [minGain, maxGain] = getSkillGainAmount(successChance)}
          {@const resourceCount = resourceCountMap.get(tier) ?? 0}
          {@const xp = xpByTierMap.get(tier)}
          <div
            class="col-span-full grid grid-cols-subgrid {tier % 2 === 0
              ? 'bg-muted/20'
              : ''}"
          >
            <div class="p-3 font-medium border-t">{romanNumerals[tier]}</div>
            <div class="p-3 border-t text-right">
              {#if successChance < successFloorPercent}
                <span class="text-muted-foreground">cannot gather</span>
              {:else}
                <span class="font-mono {getSuccessChanceColor(successChance)}">
                  {formatPercent(successChance / 100, {
                    decimals: 0,
                    trailingZeros: true,
                  })}
                </span>
              {/if}
            </div>
            <div class="p-3 border-t text-right">
              {#if effortless || successChance < successFloorPercent}
                <span class="text-muted-foreground">—</span>
              {:else}
                <span class="font-mono"
                  >{formatPercent(minGain / 100, {
                    decimals: 2,
                    trailingZeros: true,
                  })} – {formatPercent(maxGain / 100, {
                    decimals: 2,
                    trailingZeros: true,
                  })}</span
                >
              {/if}
            </div>
            <div class="p-3 text-right border-t">
              {#if xp}
                <MechanicsLink section="experience"
                  >{formatNumber(xp)}</MechanicsLink
                >
              {:else}
                <span class="text-muted-foreground">—</span>
              {/if}
            </div>
            <div class="p-3 text-right border-t">{resourceCount}</div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Plants Table -->
  <section class="space-y-4">
    <h2 class="text-xl font-semibold flex items-center gap-2">
      <Leaf class="h-5 w-5 text-green-500" />
      Plants ({data.resources.length})
    </h2>
    <div class="rounded-lg border overflow-x-auto">
      <div
        class="grid w-full min-w-[36rem] whitespace-nowrap"
        style="grid-template-columns: 4rem minmax(12rem, 2fr) minmax(9rem, 1fr) minmax(11rem, 1fr);"
      >
        <div class="bg-muted/50 p-3 font-medium">Tier</div>
        <div class="bg-muted/50 p-3 font-medium">Name</div>
        <div class="bg-muted/50 p-3 font-medium text-right">Success</div>
        <div class="bg-muted/50 p-3 font-medium text-right">Skill Gain</div>
        {#each data.resources as resource, index (resource.id)}
          {@const successChance = getSuccessChance(resource.level)}
          {@const effortless = isEffortless(resource.level)}
          {@const [minGain, maxGain] = getSkillGainAmount(successChance)}
          <div
            class="col-span-full grid grid-cols-subgrid {index % 2 === 0
              ? 'bg-muted/20'
              : ''}"
          >
            <div class="p-3 font-medium border-t">
              {romanNumerals[resource.level] ?? resource.level}
            </div>
            <div class="p-3 border-t">
              <a
                href="/gather-items/{resource.id}"
                class="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {resource.name}
              </a>
            </div>
            <div class="p-3 border-t text-right">
              {#if successChance < successFloorPercent}
                <span class="text-muted-foreground">cannot gather</span>
              {:else}
                <span class="font-mono {getSuccessChanceColor(successChance)}">
                  {formatPercent(successChance / 100, {
                    decimals: 0,
                    trailingZeros: true,
                  })}
                </span>
              {/if}
            </div>
            <div class="p-3 border-t text-right">
              {#if effortless || successChance < successFloorPercent}
                <span class="text-muted-foreground">—</span>
              {:else}
                <span class="font-mono">
                  {formatPercent(minGain / 100, {
                    decimals: 2,
                    trailingZeros: true,
                  })} – {formatPercent(maxGain / 100, {
                    decimals: 2,
                    trailingZeros: true,
                  })}
                </span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>
  <details class="space-y-4">
    <summary class="cursor-pointer text-xl font-semibold"
      >Gathering methods and requirements</summary
    >
    <MethodList
      methods={data.acquisitionMethods}
      items={data.acquisitionItems}
      names={data.acquisitionNames}
    />
  </details>
</div>

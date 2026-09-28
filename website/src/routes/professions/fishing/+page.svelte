<script lang="ts">
  import Seo from "$lib/components/Seo.svelte";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import MapLink from "$lib/components/MapLink.svelte";
  import Fish from "@lucide/svelte/icons/fish";
  import AchievementLink from "$lib/components/AchievementLink.svelte";
  import CalculatorIcon from "@lucide/svelte/icons/calculator";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import ChefHat from "@lucide/svelte/icons/chef-hat";
  import FlaskConical from "@lucide/svelte/icons/flask-conical";
  import { untrack } from "svelte";
  import { SvelteSet } from "svelte/reactivity";
  import { SOURCE_TYPE_CONFIG } from "$lib/constants/source-types";
  import {
    fishFallbackPoolForSpotTier,
    fishOutcomeRowsForSpot,
    fishingCastDelaySecondsRange,
    fishingClickWindowSeconds,
    fishingExperienceForTier,
    fishingMasteryGainChance,
    fishingMasteryGainRange,
    fishingSpotSuccessChance,
    type FishingOutcomeRow,
    type FishPoolItem,
  } from "$lib/utils/fishing";
  import { getQualityTextColorClass, toRomanNumeral } from "$lib/utils/format";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
  const MAX_VISIBLE_SOURCES_PER_TYPE = 3;

  let skillLevel = $state(0);
  let selectedCostumeIds = new SvelteSet<string>();
  let showCalculatorDetails = $state(false);
  let selectedSpotId = $state(untrack(() => data.spots[0]?.id ?? ""));
  let selectedRodId = $state(untrack(() => data.rods[0]?.item_id ?? ""));

  const castDelay = fishingCastDelaySecondsRange();
  const spotTiers = $derived(
    Array.from(new Set(data.spots.map((spot) => spot.level))).sort(
      (a, b) => a - b,
    ),
  );
  const lowestSpotTier = $derived(spotTiers[0] ?? 0);
  const highestSpotTier = $derived(spotTiers.at(-1) ?? lowestSpotTier);
  const fishermanCostumePieces = $derived(selectedCostumeIds.size);
  const trashFish = $derived(data.trashFish);
  const fishPoolsByQuality = $derived.by(() => {
    const pools: Record<number, FishPoolItem[]> = {};
    for (const [quality, fish] of Object.entries(data.fishPoolsByQuality)) {
      pools[Number(quality)] = fish.map((entry) => ({
        itemId: entry.item_id,
        itemName: entry.item_name,
        quality: entry.quality,
        tooltipHtml: entry.tooltip_html,
      }));
    }
    return pools;
  });

  const selectedSpotIndex = $derived.by(() => {
    const index = data.spots.findIndex((spot) => spot.id === selectedSpotId);
    return index === -1 ? 0 : index;
  });
  const selectedSpot = $derived(data.spots[selectedSpotIndex]);

  const selectedRodIndex = $derived.by(() => {
    const index = data.rods.findIndex((rod) => rod.item_id === selectedRodId);
    return index === -1 ? 0 : index;
  });
  const selectedRod = $derived(data.rods[selectedRodIndex]);
  const selectedRodQuality = $derived(selectedRod?.quality ?? 0);
  const selectedSpotSuccessChance = $derived(
    selectedSpot
      ? fishingSpotSuccessChance({
          rodQuality: selectedRodQuality,
          fishingPercent: skillLevel,
          spotTier: selectedSpot.level,
        })
      : 0,
  );

  const masteryGainChance = $derived(
    selectedSpot
      ? fishingMasteryGainChance({
          fishingPercent: skillLevel,
          spotTier: selectedSpot.level,
        })
      : 0,
  );

  function isFishOutcome(
    row: FishingOutcomeRow,
  ): row is Extract<
    FishingOutcomeRow,
    { kind: "primary_fish" | "fallback_fish" }
  > {
    return row.kind === "primary_fish" || row.kind === "fallback_fish";
  }

  const masteryGainRange = $derived(
    fishingMasteryGainRange(selectedSpotSuccessChance),
  );

  const outcomeRows = $derived.by(() => {
    if (!selectedSpot) return [];

    const spotDrops = selectedSpot.drops.map((drop) => ({
      itemId: drop.item_id,
      itemName: drop.item_name,
      quality: drop.quality,
      tooltipHtml: drop.tooltip_html,
      probability: drop.configured_drop_rate,
    }));

    return [
      ...fishOutcomeRowsForSpot({
        spotDrops,
        fishPoolsByQuality,
        fishingPercent: skillLevel,
        fishermanCostumePieces,
        spotTier: selectedSpot.level,
      }).map((row) => {
        if (!isFishOutcome(row)) {
          return {
            label: row.label,
            itemId: null,
            tooltipHtml: null,
            quality: null,
            note: null,
            chance: selectedSpotSuccessChance * row.chancePerBite,
          };
        }
        return {
          label: row.itemName,
          itemId: row.itemId,
          tooltipHtml: row.tooltipHtml,
          quality: row.quality,
          note:
            row.kind === "primary_fish"
              ? "Fish from this spot"
              : "Lower-tier fish",
          chance: selectedSpotSuccessChance * row.chancePerBite,
        };
      }),
      {
        label: "No bite",
        itemId: null,
        tooltipHtml: null,
        quality: null,
        note: null,
        chance: 1 - selectedSpotSuccessChance,
      },
    ];
  });

  const detailFishRows = $derived(
    outcomeRows
      .filter((row) => row.itemId)
      .sort((a, b) => {
        const aPrimary = a.note === "Fish from this spot" ? 0 : 1;
        const bPrimary = b.note === "Fish from this spot" ? 0 : 1;
        if (aPrimary !== bPrimary) return aPrimary - bPrimary;
        return (b.quality ?? 0) - (a.quality ?? 0);
      }),
  );

  const outcomeSummaryRows = $derived.by(() => {
    let primaryFish = 0;
    let fallbackFish = 0;
    let trash = 0;
    let escape = 0;

    for (const row of outcomeRows) {
      if (row.note === "Fish from this spot") primaryFish += row.chance;
      else if (row.note === "Lower-tier fish") fallbackFish += row.chance;
      else if (row.label === "Trash catch") trash += row.chance;
      else if (row.label === "Fish escapes") escape += row.chance;
    }

    return [
      { label: "No bite", chance: 1 - selectedSpotSuccessChance },
      { label: "Fish from this spot", chance: primaryFish },
      { label: "Fish from lower tiers", chance: fallbackFish },
      { label: "Trash catch", chance: trash },
      { label: "Fish escapes", chance: escape },
    ];
  });

  function getFallbackFishForSpot(level: number): FishPoolItem[] {
    return fishFallbackPoolForSpotTier(level, fishPoolsByQuality);
  }

  function getFallbackTierLabelsForSpot(level: number): string {
    if (level <= 0) return "—";
    if (level === 1) return "Tier I fish";
    return `Tier I–${toRomanNumeral(level - 1)} fish`;
  }

  function getFallbackSummaryForSpot(level: number): string {
    const fishCount = getFallbackFishForSpot(level).length;
    if (fishCount === 0) return "—";
    return `${getFallbackTierLabelsForSpot(level)} (${fishCount})`;
  }

  function getFishPoolByTier(tier: number): FishPoolItem[] {
    return fishPoolsByQuality[tier - 1] ?? [];
  }

  function getSourcesByType(
    sources: PageData["rods"][number]["sources"],
  ): [
    PageData["rods"][number]["sources"][number]["type"],
    PageData["rods"][number]["sources"],
  ][] {
    const grouped: [
      PageData["rods"][number]["sources"][number]["type"],
      PageData["rods"][number]["sources"],
    ][] = [];

    for (const source of sources) {
      const group = grouped.find(([type]) => type === source.type);
      if (group) {
        group[1].push(source);
      } else {
        grouped.push([source.type, [source]]);
      }
    }

    return grouped;
  }

  function visibleSources<T>(sources: T[]): T[] {
    return sources.slice(0, MAX_VISIBLE_SOURCES_PER_TYPE);
  }

  function selectSpot(index: number): void {
    const clampedIndex = Math.min(data.spots.length - 1, Math.max(0, index));
    selectedSpotId = data.spots[clampedIndex]?.id ?? "";
  }

  function selectPreviousSpot(): void {
    selectSpot(selectedSpotIndex - 1);
  }

  function selectNextSpot(): void {
    selectSpot(selectedSpotIndex + 1);
  }

  function selectRod(index: number): void {
    const clampedIndex = Math.min(data.rods.length - 1, Math.max(0, index));
    selectedRodId = data.rods[clampedIndex]?.item_id ?? "";
  }

  function selectPreviousRod(): void {
    selectRod(selectedRodIndex - 1);
  }

  function selectNextRod(): void {
    selectRod(selectedRodIndex + 1);
  }

  function toggleCostume(itemId: string, checked: boolean) {
    if (checked) selectedCostumeIds.add(itemId);
    else selectedCostumeIds.delete(itemId);
  }

  function formatPercent(value: number, digits = 1): string {
    return `${(value * 100).toFixed(digits)}%`;
  }

  function formatTier(tier: number): string {
    return `Tier ${toRomanNumeral(tier)}`;
  }

  function formatZoneList(zones: Array<{ id: string; name: string }>): string {
    return zones.map((zone) => zone.name).join(", ");
  }
</script>

<Seo
  title={`${data.profession.name} - Ancient Kingdoms`}
  description={`${data.profession.description} Fishing spot tiers, bite timing, fish catch odds, Fisherman set bonuses, foods, and potions.`}
  path="/professions/fishing"
/>

<div class="container mx-auto max-w-6xl space-y-10 p-8">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Professions", href: "/professions" },
      { label: data.profession.name },
    ]}
  />

  <section class="rounded-lg border p-6 md:p-8">
    <div class="flex flex-wrap items-start gap-4">
      <div class="rounded-lg bg-cyan-500/10 p-3">
        <Fish class="h-7 w-7 text-cyan-500 dark:text-cyan-400" />
      </div>
      <div class="min-w-0 flex-1">
        <h1 class="text-3xl font-bold tracking-tight md:text-4xl">
          {data.profession.name}
        </h1>
        <p class="mt-2 max-w-3xl text-muted-foreground">
          Catch fish at fishing spots to gain experience and improve Fishing.
        </p>
      </div>
    </div>

    <div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <div class="rounded-lg border p-4">
        <div class="text-2xl font-semibold">{data.stats.rod_count}</div>
        <div class="text-sm text-muted-foreground">Fishing rods</div>
      </div>
      <div class="rounded-lg border p-4">
        <div class="text-2xl font-semibold">{data.stats.spot_count}</div>
        <div class="text-sm text-muted-foreground">Fishing spots</div>
      </div>
      <div class="rounded-lg border p-4">
        <div class="text-2xl font-semibold">{data.stats.fish_count}</div>
        <div class="text-sm text-muted-foreground">Fish</div>
      </div>
      <div class="rounded-lg border p-4">
        <div class="text-2xl font-semibold">{data.stats.food_count}</div>
        <div class="text-sm text-muted-foreground">Fish foods</div>
      </div>
      <div class="rounded-lg border p-4">
        <div class="text-2xl font-semibold">{data.stats.potion_count}</div>
        <div class="text-sm text-muted-foreground">Fish potions</div>
      </div>
    </div>
  </section>

  <section id="calculator" class="rounded-lg border p-5">
    <div class="flex items-center gap-2">
      <CalculatorIcon class="h-5 w-5 text-cyan-500" />
      <h2 class="text-xl font-semibold">Fishing Calculator</h2>
    </div>

    {#if selectedSpot}
      <div class="mt-4 grid gap-4">
        <label class="flex items-center gap-3">
          <span class="shrink-0 text-sm font-medium">Fishing Skill</span>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            bind:value={skillLevel}
            class="min-w-0 flex-1"
          />
          <span class="w-12 shrink-0 text-right text-sm text-muted-foreground">
            {skillLevel}%
          </span>
        </label>

        <div
          class="grid grid-cols-2 gap-2 sm:grid-cols-[4.5rem_minmax(0,1fr)_4.5rem]"
        >
          <div class="relative col-span-2 min-w-0 sm:order-2 sm:col-span-1">
            <select
              id="fishing-spot-selection"
              bind:value={selectedSpotId}
              aria-label="Fishing spot"
              class="h-11 w-full appearance-none rounded-md border bg-background px-3 pr-10 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {#each data.spots as spot, index (spot.id)}
                <option value={spot.id}>
                  Spot {index + 1}: {spot.name} ({formatTier(spot.level)}) —
                  {formatZoneList(spot.zones)}
                </option>
              {/each}
            </select>
            <svg
              class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
          <button
            type="button"
            class="inline-flex h-11 items-center justify-center rounded-md border bg-background px-3 text-sm font-medium outline-none transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 sm:order-1"
            disabled={selectedSpotIndex === 0}
            onclick={selectPreviousSpot}
            aria-label="Previous fishing spot"
          >
            Prev
          </button>
          <button
            type="button"
            class="inline-flex h-11 items-center justify-center rounded-md border bg-background px-3 text-sm font-medium outline-none transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 sm:order-3"
            disabled={selectedSpotIndex === data.spots.length - 1}
            onclick={selectNextSpot}
            aria-label="Next fishing spot"
          >
            Next
          </button>
        </div>
        {#if data.rods.length > 0}
          <div
            class="grid grid-cols-2 gap-2 sm:grid-cols-[4.5rem_minmax(0,1fr)_4.5rem]"
          >
            <div class="relative col-span-2 min-w-0 sm:order-2 sm:col-span-1">
              <select
                bind:value={selectedRodId}
                aria-label="Fishing rod"
                class="h-11 w-full appearance-none rounded-md border bg-background px-3 pr-10 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {#each data.rods as rod (rod.item_id)}
                  <option value={rod.item_id}>
                    {rod.item_name}
                  </option>
                {/each}
              </select>
              <svg
                class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
            <button
              type="button"
              class="inline-flex h-11 items-center justify-center rounded-md border bg-background px-3 text-sm font-medium outline-none transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 sm:order-1"
              disabled={selectedRodIndex === 0}
              onclick={selectPreviousRod}
              aria-label="Previous fishing rod"
            >
              Prev
            </button>
            <button
              type="button"
              class="inline-flex h-11 items-center justify-center rounded-md border bg-background px-3 text-sm font-medium outline-none transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 sm:order-3"
              disabled={selectedRodIndex === data.rods.length - 1}
              onclick={selectNextRod}
              aria-label="Next fishing rod"
            >
              Next
            </button>
          </div>
        {:else}
          <p class="text-sm text-muted-foreground">
            No fishing rods are listed.
          </p>
        {/if}
        <div>
          <div
            class="grid gap-2 rounded-md border bg-background p-2 sm:grid-cols-3"
          >
            {#each data.costumePieces as piece (piece.item_id)}
              <label
                class="flex min-h-10 items-center gap-2 rounded-md border border-transparent px-2 py-1.5 transition-colors hover:border-cyan-500/30 hover:bg-cyan-500/10"
              >
                <input
                  type="checkbox"
                  checked={selectedCostumeIds.has(piece.item_id)}
                  onchange={(event) =>
                    toggleCostume(
                      piece.item_id,
                      (event.currentTarget as HTMLInputElement).checked,
                    )}
                  class="h-4 w-4 rounded border-border accent-primary"
                />
                <ItemLink
                  itemId={piece.item_id}
                  itemName={piece.item_name}
                  tooltipHtml={piece.tooltip_html}
                  imageAvailable={data.itemIconPaths[piece.item_id]}
                  colorClass={getQualityTextColorClass(piece.quality)}
                />
              </label>
            {/each}
          </div>
        </div>
      </div>

      <div class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div class="rounded-lg border p-4">
          <div class="text-sm text-muted-foreground">Bite chance per cast</div>
          <div class="text-2xl font-semibold">
            {formatPercent(selectedSpotSuccessChance)}
          </div>
        </div>
        <div class="rounded-lg border p-4">
          <div class="text-sm text-muted-foreground">
            XP per successful cast
          </div>
          <div class="text-2xl font-semibold">
            {fishingExperienceForTier(selectedSpot.level).toLocaleString()}
          </div>
        </div>
        <div class="rounded-lg border p-4">
          <div class="text-sm text-muted-foreground">
            Fishing gain chance per cast
          </div>
          <div class="text-2xl font-semibold">
            {formatPercent(selectedSpotSuccessChance * masteryGainChance)}
          </div>
        </div>
        <div class="rounded-lg border p-4">
          <div class="text-sm text-muted-foreground">
            Fishing gain per increase
          </div>
          <div class="text-2xl font-semibold">
            {masteryGainRange.min.toFixed(2)}% – {masteryGainRange.max.toFixed(
              2,
            )}%
          </div>
        </div>
        <div class="rounded-lg border p-4">
          <div class="text-sm text-muted-foreground">Click window</div>
          <div class="text-2xl font-semibold">
            {fishingClickWindowSeconds(selectedSpot.level).toFixed(2)}s
          </div>
        </div>
        <div class="rounded-lg border p-4">
          <div class="text-sm text-muted-foreground">Cast delay</div>
          <div class="text-2xl font-semibold">
            {castDelay.min}–{castDelay.max}s
          </div>
        </div>
      </div>

      <div class="mt-5 overflow-hidden rounded-lg border">
        <div class="overflow-x-auto">
          <table class="w-full whitespace-nowrap">
            <thead class="bg-muted/50">
              <tr>
                <th class="p-3 text-left font-medium">Outcome</th>
                <th class="p-3 text-right font-medium">Chance per cast</th>
              </tr>
            </thead>
            <tbody>
              {#each outcomeSummaryRows as row (row.label)}
                <tr class="border-t hover:bg-muted/25">
                  <td class="p-3">{row.label}</td>
                  <td class="p-3 text-right font-mono">
                    {formatPercent(row.chance)}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

      <button
        type="button"
        class="mt-3 text-sm text-blue-600 hover:underline dark:text-blue-400"
        onclick={() => (showCalculatorDetails = !showCalculatorDetails)}
      >
        {showCalculatorDetails
          ? "Hide detailed fish chances"
          : "Show detailed fish chances"}
      </button>

      {#if showCalculatorDetails}
        <div class="mt-3 overflow-hidden rounded-lg border">
          <div class="overflow-x-auto">
            <table class="w-full whitespace-nowrap">
              <thead class="bg-muted/50">
                <tr>
                  <th class="p-3 text-left font-medium">Fish</th>
                  <th class="p-3 text-left font-medium">Source</th>
                  <th class="p-3 text-right font-medium">Chance per cast</th>
                </tr>
              </thead>
              <tbody>
                {#each detailFishRows as row (row.itemId)}
                  <tr class="border-t hover:bg-muted/25">
                    <td class="p-3">
                      <ItemLink
                        itemId={row.itemId ?? ""}
                        itemName={row.label}
                        tooltipHtml={row.tooltipHtml}
                        imageAvailable={row.itemId
                          ? data.itemIconPaths[row.itemId]
                          : null}
                        colorClass={getQualityTextColorClass(row.quality ?? 0)}
                      />
                    </td>
                    <td class="p-3 text-sm text-muted-foreground">
                      {row.note}
                    </td>
                    <td class="p-3 text-right font-mono">
                      {formatPercent(row.chance)}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/if}
    {:else}
      <p class="mt-4 text-sm text-muted-foreground">
        No fishing spots are listed.
      </p>
    {/if}
  </section>

  <section id="fishing-rods" class="rounded-lg border p-5">
    <div class="flex items-center gap-2">
      <h2 class="text-xl font-semibold">Fishing Rods ({data.rods.length})</h2>
    </div>
    <div class="mt-4 overflow-hidden rounded-lg border">
      <div class="overflow-x-auto">
        <table class="w-full whitespace-nowrap">
          <thead class="bg-muted/50">
            <tr>
              <th class="p-3 text-left font-medium">Rod</th>
              <th class="p-3 text-right font-medium">Source Level</th>
              <th class="p-3 text-left font-medium">Known sources</th>
            </tr>
          </thead>
          <tbody>
            {#each data.rods as rod (rod.item_id)}
              <tr class="border-t align-top hover:bg-muted/25">
                <td class="p-3">
                  <ItemLink
                    itemId={rod.item_id}
                    itemName={rod.item_name}
                    tooltipHtml={rod.tooltip_html}
                    imageAvailable={data.itemIconPaths[rod.item_id]}
                    colorClass={getQualityTextColorClass(rod.quality)}
                  />
                </td>
                <td class="p-3 text-right font-mono">
                  {#if rod.min_source_level !== null}
                    {rod.min_source_level}
                  {:else}
                    <span class="text-muted-foreground">—</span>
                  {/if}
                </td>
                <td class="p-3">
                  {#if rod.sources.length > 0}
                    <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {#each getSourcesByType(rod.sources) as [type, sources] (type)}
                        {@const sourceConfig = SOURCE_TYPE_CONFIG[type]}
                        <div class="flex flex-wrap items-center gap-1.5">
                          <sourceConfig.icon
                            class="h-4 w-4 shrink-0 {sourceConfig.color}"
                            aria-hidden="true"
                          />
                          <span class="text-sm text-muted-foreground">
                            {sourceConfig.label}:
                          </span>
                          {#each visibleSources(sources) as source, i (source.id)}
                            <a
                              href="{sourceConfig.linkPrefix}{source.id}"
                              class="text-blue-600 hover:underline dark:text-blue-400"
                            >
                              {source.name}
                            </a>
                            {#if i < visibleSources(sources).length - 1}<span
                                class="text-muted-foreground">,</span
                              >{/if}
                          {/each}
                          {#if sources.length > MAX_VISIBLE_SOURCES_PER_TYPE}
                            <a
                              href="/items/{rod.item_id}"
                              class="text-sm text-muted-foreground hover:underline"
                            >
                              +{sources.length - MAX_VISIBLE_SOURCES_PER_TYPE}
                              more
                            </a>
                          {/if}
                        </div>
                      {/each}
                    </div>
                  {:else}
                    <span class="text-muted-foreground">—</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </section>
  <section id="fishing-spots" class="rounded-lg border p-5">
    <div class="flex items-center gap-2">
      <MapPin class="h-5 w-5 text-emerald-500" />
      <h2 class="text-xl font-semibold">Fishing Spots ({data.spots.length})</h2>
    </div>
    <div class="mt-4 overflow-hidden rounded-lg border">
      <div class="overflow-x-auto">
        <table class="w-full whitespace-nowrap">
          <thead class="bg-muted/50">
            <tr>
              <th class="p-3 text-left font-medium">#</th>
              <th class="p-3 text-left font-medium">Spot</th>
              <th class="p-3 text-left font-medium">Tier</th>
              <th class="p-3 text-left font-medium">Fish</th>
              <th class="p-3 text-left font-medium">Zones</th>
              <th class="p-3 text-right font-medium">Map</th>
            </tr>
          </thead>
          <tbody>
            {#each data.spots as spot, index (spot.id)}
              <tr class="border-t align-top hover:bg-muted/25">
                <td class="p-3 font-mono text-muted-foreground">
                  {index + 1}
                </td>
                <td class="p-3">
                  <a
                    href="/gather-items/{spot.resource_id}"
                    class="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {spot.name}
                  </a>
                </td>
                <td class="p-3">{toRomanNumeral(spot.level)}</td>
                <td class="p-3">
                  <div class="flex flex-wrap gap-x-3 gap-y-1">
                    {#each spot.drops as drop (drop.item_id)}
                      <ItemLink
                        itemId={drop.item_id}
                        itemName={drop.item_name}
                        tooltipHtml={drop.tooltip_html}
                        imageAvailable={data.itemIconPaths[drop.item_id]}
                        colorClass={getQualityTextColorClass(drop.quality)}
                      />
                    {/each}
                  </div>
                  <div class="mt-1 text-sm text-muted-foreground">
                    Lower-tier fish: {getFallbackSummaryForSpot(spot.level)}
                  </div>
                </td>
                <td class="p-3">
                  <div class="flex flex-wrap gap-x-3 gap-y-1">
                    {#each spot.zones as zone (zone.id)}
                      <a
                        href="/zones/{zone.id}"
                        class="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {zone.name}
                      </a>
                    {/each}
                  </div>
                </td>
                <td class="p-3 text-right">
                  <MapLink
                    entityId={spot.resource_id}
                    entityType="resource"
                    compact
                  />
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <section id="fishing-fallback-pools" class="rounded-lg border p-5">
    <div class="flex items-center gap-2">
      <Fish class="h-5 w-5 text-cyan-500" />
      <h2 class="text-xl font-semibold">Fish from Lower Tiers</h2>
    </div>
    <div class="mt-4 grid gap-4 md:grid-cols-3">
      {#each Array.from({ length: Math.max(0, highestSpotTier) }, (_, index) => index + 1) as tier (tier)}
        {@const pool = getFishPoolByTier(tier)}
        <div class="rounded-lg border p-4">
          <div class="mb-2 font-medium">
            Tier {toRomanNumeral(tier - 1)} fish ({pool.length})
          </div>
          <div class="flex flex-wrap gap-x-3 gap-y-1">
            {#each pool as fish (fish.itemId)}
              <ItemLink
                itemId={fish.itemId}
                itemName={fish.itemName}
                tooltipHtml={fish.tooltipHtml}
                imageAvailable={data.itemIconPaths[fish.itemId]}
                colorClass={getQualityTextColorClass(fish.quality)}
              />
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </section>

  <section id="fishing-trash" class="rounded-lg border p-5">
    <div class="flex items-center gap-2">
      <Fish class="h-5 w-5 text-cyan-500" />
      <h2 class="text-xl font-semibold">
        Fishing Trash ({trashFish.length})
      </h2>
    </div>
    <div class="mt-4 overflow-hidden rounded-lg border">
      <div class="overflow-x-auto">
        <table class="w-full whitespace-nowrap">
          <thead class="bg-muted/50">
            <tr>
              <th class="p-3 text-left font-medium">Item</th>
            </tr>
          </thead>
          <tbody>
            {#each trashFish as item (item.item_id)}
              <tr class="border-t hover:bg-muted/25">
                <td class="p-3">
                  <ItemLink
                    itemId={item.item_id}
                    itemName={item.item_name}
                    tooltipHtml={item.tooltip_html}
                    imageAvailable={data.itemIconPaths[item.item_id]}
                    colorClass={getQualityTextColorClass(item.quality)}
                  />
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <section id="how-it-works" class="rounded-lg border p-5 space-y-3">
    <h2 class="text-xl font-semibold">How Fishing works</h2>
    <!-- Source: server-scripts/Player.cs:9579-9585; server-scripts/PlayerInventory.cs:121-135 — an invalid rod selection falls back to the highest-quality rod in inventory. -->
    <p class="text-muted-foreground">
      Carry a
      <a
        href="#fishing-rods"
        class="text-blue-600 hover:underline dark:text-blue-400">Fishing Rod</a
      >. If no usable rod is selected, the game selects your highest-quality
      rod.
    </p>
    <!-- Source: server-scripts/GatherItem.cs:1098-1116 — the second interaction must occur within 2, 1.5, 1, or 0.75 seconds for Tier I, II, III, or IV. -->
    <p class="text-muted-foreground">
      When the fish bites, interact again within 2 seconds at Tier I, 1.5 at
      Tier II, 1 at Tier III, or 0.75 at Tier IV.
    </p>
    <!-- Source: server-scripts/GatherItem.cs:698-797 — after the spot success roll, a failed primary fish roll may yield a lower-tier fish, trash, or no catch. -->
    <p class="text-muted-foreground">
      A successful bite can yield a listed fish. If that catch fails,
      higher-tier spots may give a
      <a
        href="#fishing-fallback-pools"
        class="text-blue-600 hover:underline dark:text-blue-400"
        >lower-tier fish</a
      >,
      <a
        href="#fishing-trash"
        class="text-blue-600 hover:underline dark:text-blue-400">trash</a
      >, or nothing.
    </p>
    {#if data.profession.achievement_id}
      <AchievementLink
        achievementId={data.profession.achievement_id}
        achievementName={data.profession.achievement_name}
      />
    {/if}
  </section>

  <section id="fish-foods" class="rounded-lg border p-5">
    <div class="flex items-center gap-2">
      <ChefHat class="h-5 w-5 text-orange-500" />
      <h2 class="text-xl font-semibold">Fish Foods ({data.foods.length})</h2>
    </div>
    <div class="mt-4 overflow-hidden rounded-lg border">
      <div class="overflow-x-auto">
        <table class="w-full whitespace-nowrap">
          <thead class="bg-muted/50">
            <tr>
              <th class="p-3 text-left font-medium">Food</th>
              <th class="p-3 text-left font-medium">Effect</th>
              <th class="p-3 text-left font-medium">Fish Ingredients</th>
            </tr>
          </thead>
          <tbody>
            {#each data.foods as recipe (recipe.recipe_id)}
              <tr class="border-t hover:bg-muted/25">
                <td class="p-3">
                  <ItemLink
                    itemId={recipe.result_item_id}
                    itemName={recipe.result_item_name}
                    tooltipHtml={recipe.result_tooltip_html}
                    imageAvailable={data.itemIconPaths[recipe.result_item_id]}
                    colorClass={getQualityTextColorClass(recipe.result_quality)}
                  />
                </td>
                <td class="p-3">
                  {#if recipe.effect_skill_id && recipe.effect_skill_name}
                    <a
                      href="/skills/{recipe.effect_skill_id}"
                      class="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {recipe.effect_skill_name}
                    </a>
                  {:else}
                    <span class="text-muted-foreground">—</span>
                  {/if}
                </td>
                <td class="p-3">
                  <div class="flex flex-wrap gap-x-3 gap-y-1">
                    {#each recipe.ingredients as ingredient (ingredient.item_id)}
                      <span class="inline-flex items-center gap-1">
                        <ItemLink
                          itemId={ingredient.item_id}
                          itemName={ingredient.item_name}
                          tooltipHtml={ingredient.tooltip_html}
                          imageAvailable={data.itemIconPaths[
                            ingredient.item_id
                          ]}
                          colorClass={getQualityTextColorClass(
                            ingredient.quality,
                          )}
                        />
                        {#if ingredient.amount > 1}
                          <span class="text-xs text-muted-foreground">
                            ×{ingredient.amount}
                          </span>
                        {/if}
                      </span>
                    {/each}
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </section>

  {#if data.potions.length > 0}
    <section id="fish-potions" class="rounded-lg border p-5">
      <div class="flex items-center gap-2">
        <FlaskConical class="h-5 w-5 text-purple-500" />
        <h2 class="text-xl font-semibold">
          Fish Potions ({data.potions.length})
        </h2>
      </div>
      <div class="mt-4 overflow-hidden rounded-lg border">
        <div class="overflow-x-auto">
          <table class="w-full whitespace-nowrap">
            <thead class="bg-muted/50">
              <tr>
                <th class="p-3 text-left font-medium">Potion</th>
                <th class="p-3 text-left font-medium">Effect</th>
                <th class="p-3 text-left font-medium">Fish Ingredients</th>
              </tr>
            </thead>
            <tbody>
              {#each data.potions as recipe (recipe.recipe_id)}
                <tr class="border-t hover:bg-muted/25">
                  <td class="p-3">
                    <ItemLink
                      itemId={recipe.result_item_id}
                      itemName={recipe.result_item_name}
                      tooltipHtml={recipe.result_tooltip_html}
                      imageAvailable={data.itemIconPaths[recipe.result_item_id]}
                      colorClass={getQualityTextColorClass(
                        recipe.result_quality,
                      )}
                    />
                  </td>
                  <td class="p-3">
                    {#if recipe.effect_skill_id && recipe.effect_skill_name}
                      <a
                        href="/skills/{recipe.effect_skill_id}"
                        class="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {recipe.effect_skill_name}
                      </a>
                    {:else}
                      <span class="text-muted-foreground">—</span>
                    {/if}
                  </td>
                  <td class="p-3">
                    <div class="flex flex-wrap gap-x-3 gap-y-1">
                      {#each recipe.ingredients as ingredient (ingredient.item_id)}
                        <span class="inline-flex items-center gap-1">
                          <ItemLink
                            itemId={ingredient.item_id}
                            itemName={ingredient.item_name}
                            tooltipHtml={ingredient.tooltip_html}
                            imageAvailable={data.itemIconPaths[
                              ingredient.item_id
                            ]}
                            colorClass={getQualityTextColorClass(
                              ingredient.quality,
                            )}
                          />
                          {#if ingredient.amount > 1}
                            <span class="text-xs text-muted-foreground">
                              ×{ingredient.amount}
                            </span>
                          {/if}
                        </span>
                      {/each}
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  {/if}
</div>

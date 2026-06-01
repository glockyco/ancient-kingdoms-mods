<script lang="ts">
  import Seo from "$lib/components/Seo.svelte";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import MapLink from "$lib/components/MapLink.svelte";
  import Fish from "@lucide/svelte/icons/fish";
  import Trophy from "@lucide/svelte/icons/trophy";
  import CalculatorIcon from "@lucide/svelte/icons/calculator";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import ChefHat from "@lucide/svelte/icons/chef-hat";
  import FlaskConical from "@lucide/svelte/icons/flask-conical";
  import { SvelteSet } from "svelte/reactivity";
  import { SOURCE_TYPE_CONFIG } from "$lib/constants/source-types";
  import {
    fishDropChancePerCast,
    fishEscapeChancePerHook,
    fishTrashChancePerHook,
    fishLowerTierFishChancePerHook,
    fishingCastDelaySecondsRange,
    fishingClickWindowSeconds,
    fishingExperienceForTier,
    fishingMasteryGainChance,
    fishingMasteryGainRange,
    fishingSpotSuccessChance,
  } from "$lib/utils/fishing";
  import { getQualityTextColorClass, toRomanNumeral } from "$lib/utils/format";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
  const MAX_VISIBLE_SOURCES_PER_TYPE = 3;

  let skillLevel = $state(0);
  let selectedCostumeIds = new SvelteSet<string>();
  let selectedSpotId = $state(data.spots[0]?.id ?? "");
  let selectedRodId = $state(data.rods[0]?.item_id ?? "");

  const castDelay = fishingCastDelaySecondsRange();
  const spotTiers = Array.from(
    new Set(data.spots.map((spot) => spot.level)),
  ).sort((a, b) => a - b);
  const lowestSpotTier = spotTiers[0] ?? 0;
  const highestSpotTier = spotTiers.at(-1) ?? lowestSpotTier;
  const fishermanCostumePieces = $derived(selectedCostumeIds.size);
  const trashFish = $derived(data.trashFish);

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

  const masteryGainRange = $derived(
    fishingMasteryGainRange(selectedSpotSuccessChance),
  );

  const outcomeRows = $derived.by(() => {
    if (!selectedSpot) return [];

    const spotDrops = selectedSpot.drops.map((drop) => ({
      probability: drop.configured_drop_rate,
    }));
    const fishRows = selectedSpot.drops.map((drop) => ({
      label: drop.item_name,
      itemId: drop.item_id,
      tooltipHtml: drop.tooltip_html,
      quality: drop.quality,
      chance: fishDropChancePerCast({
        configuredDropRate: drop.configured_drop_rate,
        fishCountAtSpot: selectedSpot.drops.length,
        fishingPercent: skillLevel,
        fishermanCostumePieces,
        rodQuality: selectedRodQuality,
        spotTier: selectedSpot.level,
      }),
    }));

    const lowerTierFishChance =
      selectedSpotSuccessChance *
      fishLowerTierFishChancePerHook({
        spotDrops,
        fishingPercent: skillLevel,
        fishermanCostumePieces,
        spotTier: selectedSpot.level,
      });

    return [
      ...fishRows,
      ...(lowerTierFishChance > 0
        ? [
            {
              label: "Lower-tier fish (random)",
              itemId: null,
              tooltipHtml: null,
              quality: null,
              chance: lowerTierFishChance,
            },
          ]
        : []),
      {
        label: "Trash catch",
        itemId: null,
        tooltipHtml: null,
        quality: null,
        chance:
          selectedSpotSuccessChance *
          fishTrashChancePerHook({
            spotDrops,
            fishingPercent: skillLevel,
            fishermanCostumePieces,
            spotTier: selectedSpot.level,
          }),
      },
      {
        label: "Fish escapes",
        itemId: null,
        tooltipHtml: null,
        quality: null,
        chance:
          selectedSpotSuccessChance *
          fishEscapeChancePerHook({
            spotDrops,
            fishingPercent: skillLevel,
            fishermanCostumePieces,
            spotTier: selectedSpot.level,
          }),
      },
      {
        label: "No bite",
        itemId: null,
        tooltipHtml: null,
        quality: null,
        chance: 1 - selectedSpotSuccessChance,
      },
    ];
  });

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

<div class="container mx-auto space-y-8 p-8">
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
          Catch fish at fishing spots.
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

  <section class="rounded-lg border p-5">
    <h2 class="text-xl font-semibold">How It Works</h2>
    <!-- Source: server-scripts/Utils.cs:511-520 — Fishing spot success chance per tier. -->
    <!-- Source: server-scripts/GatherItem.cs:652-655 — < 0.2 spot success hard-blocks fishing. -->
    <!-- Source: server-scripts/GatherItem.cs:657-748 — successful spot rolls pick one configured fish; a failed primary roll gives tier-specific trash / lower-tier fish / escape. -->
    <!-- Source: server-scripts/GatherItem.cs:661-679 — selected fish chance = drop rate + Fishing/2 + 2pp per Fisherman costume piece. -->
    <!-- Source: server-scripts/GatherItem.cs:750-781 — Fishing mastery gain and XP table. -->
    <!-- Source: server-scripts/GatherItem.cs:931-937 — click-window length per tier. -->
    <!-- Source: server-scripts/Player.cs:7546-7565 — auto-equips best rod and starts the cast with Random.Range(3, 8) second window delay. -->

    <div class="mt-4 divide-y">
      <div class="grid gap-3 py-4 first:pt-0 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">1</div>
        <div>
          <div>
            Carry a <a
              href="#fishing-rods"
              class="text-blue-600 hover:underline dark:text-blue-400"
              >Fishing Rod</a
            >.
          </div>
          <p class="mt-1 text-sm leading-6 text-muted-foreground">
            If you carry multiple rods, the game uses the highest-quality
            Fishing Rod in your inventory.
          </p>
        </div>
      </div>

      <div class="grid gap-3 py-4 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">2</div>
        <div>
          <div>
            Click a <a
              href="#fishing-spots"
              class="text-blue-600 hover:underline dark:text-blue-400"
              >Fishing Spot</a
            >.
          </div>
          <p class="mt-1 text-sm leading-6 text-muted-foreground">
            The map currently has {data.stats.spot_count} Fishing Spot locations
            across {spotTiers.length} tiers, from Tier {toRomanNumeral(
              lowestSpotTier,
            )} to Tier {toRomanNumeral(highestSpotTier)}.
          </p>
        </div>
      </div>

      <div class="grid gap-3 py-4 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">3</div>
        <div>
          <div>Click inside the timing window.</div>
          <p class="mt-1 text-sm leading-6 text-muted-foreground">
            After the {castDelay.min}–{castDelay.max} second cast delay, the click
            window lasts 2.0 / 1.5 / 1.0 / 0.75 seconds by tier.
          </p>
        </div>
      </div>

      <div class="grid gap-3 py-4 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">4</div>
        <div>
          <div>Roll for a bite.</div>
          <p class="mt-1 text-sm leading-6 text-muted-foreground">
            Bite chance is based on Fishing skill and spot tier.
          </p>
        </div>
      </div>

      <div class="grid gap-3 py-4 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">5</div>
        <div>
          <div>Roll for your catch.</div>
          <p class="mt-1 text-sm leading-6 text-muted-foreground">
            <span class="block">
              After a bite, you reel in a fish from this spot — or, at
              higher-tier spots, sometimes a random lower-tier fish.
            </span>
            <span class="block">
              A failed catch gives either a <a
                href="#fishing-trash"
                class="text-blue-600 hover:underline dark:text-blue-400"
                >trash catch</a
              > or an escaped fish. The exact odds scale with the spot tier and your
              Fishing skill.
            </span>
          </p>
        </div>
      </div>

      <div class="grid gap-3 py-4 last:pb-0 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">6</div>
        <div>
          <div>Gain XP and possibly mastery.</div>
          <p class="mt-1 text-sm leading-6 text-muted-foreground">
            Successful bites grant XP by tier and can raise Fishing mastery up
            to the tier cap.
          </p>
          <p
            class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm leading-6 text-muted-foreground"
          >
            <span>Max Level: {data.profession.max_level}%</span>
            {#if data.profession.steam_achievement_id}
              <span class="flex items-center gap-1">
                Achievement:
                <Trophy class="h-4 w-4" />
                {data.profession.steam_achievement_name}
              </span>
            {/if}
          </p>
        </div>
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
            No fishing rods are loaded yet.
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
          <div class="text-sm text-muted-foreground">Mastery proc per cast</div>
          <div class="text-2xl font-semibold">
            {formatPercent(selectedSpotSuccessChance * masteryGainChance)}
          </div>
        </div>
        <div class="rounded-lg border p-4">
          <div class="text-sm text-muted-foreground">Mastery gain per proc</div>
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
              {#each outcomeRows as row (row.label)}
                <tr class="border-t hover:bg-muted/25">
                  <td class="p-3">
                    {#if row.itemId}
                      <ItemLink
                        itemId={row.itemId}
                        itemName={row.label}
                        tooltipHtml={row.tooltipHtml}
                        colorClass={getQualityTextColorClass(row.quality ?? 0)}
                      />
                    {:else}
                      {row.label}
                    {/if}
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
    {:else}
      <p class="mt-4 text-sm text-muted-foreground">
        No fishing spots are loaded yet.
      </p>
    {/if}
  </section>

  <section id="fishing-rods" class="rounded-lg border p-5">
    <div class="flex items-center gap-2">
      <Fish class="h-5 w-5 text-cyan-500" />
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
                          <span class="text-xs text-muted-foreground">
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
                              class="text-xs text-muted-foreground hover:underline"
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
      <MapPin class="h-5 w-5 text-cyan-500" />
      <h2 class="text-xl font-semibold">Fishing Spots ({data.spots.length})</h2>
    </div>
    <p class="mt-1 text-sm text-muted-foreground">
      Higher-tier spots can also yield random lower-tier fish not listed here.
    </p>
    <div class="mt-4 overflow-hidden rounded-lg border">
      <div class="overflow-x-auto">
        <table class="w-full whitespace-nowrap">
          <thead class="bg-muted/50">
            <tr>
              <th class="p-3 text-left font-medium">#</th>
              <th class="p-3 text-left font-medium">Spot</th>
              <th class="p-3 text-left font-medium">Tier</th>
              <th class="p-3 text-left font-medium">Primary fish</th>
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
                        colorClass={getQualityTextColorClass(drop.quality)}
                      />
                    {/each}
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
              <th class="p-3 text-left font-medium">Fish Ingredient</th>
            </tr>
          </thead>
          <tbody>
            {#each data.foods as recipe (recipe.recipe_id + recipe.ingredient_item_id)}
              <tr class="border-t hover:bg-muted/25">
                <td class="p-3">
                  <ItemLink
                    itemId={recipe.result_item_id}
                    itemName={recipe.result_item_name}
                    tooltipHtml={recipe.result_tooltip_html}
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
                  <ItemLink
                    itemId={recipe.ingredient_item_id}
                    itemName={recipe.ingredient_item_name}
                    tooltipHtml={recipe.ingredient_tooltip_html}
                    colorClass={getQualityTextColorClass(
                      recipe.ingredient_quality,
                    )}
                  />
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
                <th class="p-3 text-left font-medium">Fish Ingredient</th>
              </tr>
            </thead>
            <tbody>
              {#each data.potions as recipe (recipe.recipe_id + recipe.ingredient_item_id)}
                <tr class="border-t hover:bg-muted/25">
                  <td class="p-3">
                    <ItemLink
                      itemId={recipe.result_item_id}
                      itemName={recipe.result_item_name}
                      tooltipHtml={recipe.result_tooltip_html}
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
                    <ItemLink
                      itemId={recipe.ingredient_item_id}
                      itemName={recipe.ingredient_item_name}
                      tooltipHtml={recipe.ingredient_tooltip_html}
                      colorClass={getQualityTextColorClass(
                        recipe.ingredient_quality,
                      )}
                    />
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

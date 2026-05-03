<script lang="ts">
  import Seo from "$lib/components/Seo.svelte";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import MapLink from "$lib/components/MapLink.svelte";
  import {
    calculateAdjustedChestRewards,
    sortChestRewardsForDisplay,
  } from "$lib/utils/treasureHunter.js";
  import CalculatorIcon from "@lucide/svelte/icons/calculator";
  import MapIcon from "@lucide/svelte/icons/map";
  import Trophy from "@lucide/svelte/icons/trophy";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let skillLevel = $state(0);

  const skillFraction = $derived(skillLevel / 100);
  const relicRollBonus = $derived(skillFraction * 0.1);
  const successfulDigsToCap = $derived(Math.ceil((100 - skillLevel) / 0.5));
  const adjustedChestRewards = $derived.by(() => {
    const adjusted = calculateAdjustedChestRewards(
      data.buriedChestRewards,
      skillFraction,
    );

    if (skillLevel === 0) {
      return adjusted.map((reward) => ({
        ...reward,
        adjusted_open_chance: reward.baseline_open_chance,
        change_from_baseline: 0,
      }));
    }

    return adjusted;
  });
  const displayedChestRewards = $derived(
    adjustedChestRewards
      .filter((reward) => reward.scales_with_treasure_hunter)
      .sort(sortChestRewardsForDisplay),
  );

  function formatPercent(value: number, digits = 1): string {
    return `${(value * 100).toFixed(digits)}%`;
  }

  function formatPercentagePoints(value: number, digits = 1): string {
    return `${(value * 100).toFixed(digits)} pp`;
  }

  function formatSignedPercentagePoints(value: number, digits = 1): string {
    const sign = value > 0 ? "+" : "";
    return `${sign}${(value * 100).toFixed(digits)} pp`;
  }

  function formatItemType(itemType: string | null): string {
    if (!itemType) return "Item";

    return itemType
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
</script>

<Seo
  title={`${data.profession.name} - Ancient Kingdoms`}
  description={`${data.profession.description} View treasure map sources, dig-site destinations, Buried Treasure Chest rewards, and Treasure Hunter relic odds.`}
  path="/professions/treasure_hunter"
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
      <div class="rounded-lg bg-amber-500/10 p-3">
        <MapIcon class="h-7 w-7 text-amber-500 dark:text-amber-400" />
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <h1 class="text-3xl font-bold tracking-tight md:text-4xl">
            {data.profession.name}
          </h1>
        </div>
        <p class="mt-2 max-w-3xl text-muted-foreground">
          Find treasure maps, follow their clues, dig up buried rewards, and
          improve relic odds from treasure chests.
        </p>
      </div>
    </div>

    <div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-lg border p-4">
        <div class="text-2xl font-semibold">{data.stats.map_count}</div>
        <div class="text-sm text-muted-foreground">Treasure maps</div>
      </div>
      <div class="rounded-lg border p-4">
        <div class="text-2xl font-semibold">
          {data.stats.relic_reward_count}
        </div>
        <div class="text-sm text-muted-foreground">Relic rewards</div>
      </div>
      <div class="rounded-lg border p-4">
        <div class="text-2xl font-semibold">{data.stats.zone_count}</div>
        <div class="text-sm text-muted-foreground">Destination zones</div>
      </div>
      <div class="rounded-lg border p-4">
        <div class="text-2xl font-semibold">
          +{data.stats.skill_gain_percent.toFixed(1)}%
        </div>
        <div class="text-sm text-muted-foreground">Skill per treasure</div>
      </div>
    </div>
  </section>

  <section class="rounded-lg border p-5">
    <h2 class="text-xl font-semibold">How It Works</h2>

    <div class="mt-4 divide-y">
      <div class="grid gap-3 py-4 first:pt-0 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">1</div>
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <span>
              Find <ItemLink
                itemId={data.keyItems.random_map.id}
                itemName={data.keyItems.random_map.name}
                tooltipHtml={data.keyItems.random_map.tooltip_html}
              /> drops.
            </span>
            <MapLink entityId="random_map" entityType="item" compact />
          </div>
          <p class="mt-1 text-sm leading-6 text-muted-foreground">
            Each drop gives one of
            <a
              href="#treasure-maps"
              class="text-blue-600 hover:underline dark:text-blue-400"
              >{data.treasureMaps.length} treasure maps</a
            >, and each treasure map leads to a Buried Treasure Chest.
          </p>
        </div>
      </div>

      <div class="grid gap-3 py-4 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">2</div>
        <div>
          <div>Open the map clue.</div>
          <!-- Source: server-scripts/TreasureMapItem.cs:12-15 and Player.cs:7172-7189 — using a treasure map opens the clue image. -->
          <p class="mt-1 text-sm leading-6 text-muted-foreground">
            Use the treasure map to see its dig-site clue.
          </p>
        </div>
      </div>

      <div class="grid gap-3 py-4 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">3</div>
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <span>Find the matching dig site.</span>
            <MapLink
              entityId="buried_treasure_chest"
              entityType="item"
              compact
            />
          </div>
          <!-- Source: server-scripts/TreasureLocation.cs:15,31-35 — treasure locations require the matching map in inventory. -->
          <p class="mt-1 text-sm leading-6 text-muted-foreground">
            Each treasure map points to one dig site. Use the clue or the map
            links below to find it.
          </p>
        </div>
      </div>

      <div class="grid gap-3 py-4 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">4</div>
        <div>
          <div>
            Dig with a <ItemLink
              itemId={data.keyItems.shovel.id}
              itemName={data.keyItems.shovel.name}
              tooltipHtml={data.keyItems.shovel.tooltip_html}
            />.
          </div>
          <!-- Source: server-scripts/TreasureLocation.cs:61-100,105-160 — digging requires the matching map and shovel, consumes one map on success, and grants the configured reward. -->
          <p class="mt-1 text-sm leading-6 text-muted-foreground">
            Bring a Shovel and at least one free inventory slot. A successful
            dig awards the treasure and gives +0.5% Treasure Hunter.
          </p>
        </div>
      </div>

      <div class="grid gap-3 py-4 last:pb-0 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">5</div>
        <div>
          <div>
            Open the <ItemLink
              itemId={data.keyItems.buried_treasure_chest.id}
              itemName={data.keyItems.buried_treasure_chest.name}
              tooltipHtml={data.keyItems.buried_treasure_chest.tooltip_html}
            />.
          </div>
          <!-- Source: server-scripts/ChestItem.cs:24-31 — Buried Treasure Chest grants unique rewards and applies Treasure Hunter bonus to relic rolls only. -->
          <p class="mt-1 text-sm leading-6 text-muted-foreground">
            Each chest gives 3 unique rewards.
            <a
              href="#calculator"
              class="text-blue-600 hover:underline dark:text-blue-400"
              >Treasure Hunter</a
            > improves the chance that those rewards include relics.
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

  <section id="calculator" class="space-y-4">
    <h2 class="flex items-center gap-2 text-xl font-semibold">
      <CalculatorIcon class="h-5 w-5 text-cyan-500" />
      Calculator
    </h2>

    <div class="rounded-lg border bg-muted/15 p-4">
      <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
        <label for="treasure-hunter-skill-slider" class="shrink-0">
          Treasure Hunter Skill
        </label>
        <input
          id="treasure-hunter-skill-slider"
          type="range"
          min="0"
          max="100"
          step="0.5"
          bind:value={skillLevel}
          class="h-2 w-48 cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
        />
        <span class="w-16 font-mono">{skillLevel.toFixed(1)}%</span>
      </div>

      <div class="mt-4 grid gap-3 sm:grid-cols-3">
        <div class="rounded-lg border bg-background p-3">
          <div class="text-sm text-muted-foreground">Relic chance bonus</div>
          <div class="text-xl font-semibold">
            +{formatPercentagePoints(relicRollBonus)}
          </div>
        </div>
        <div class="rounded-lg border bg-background p-3">
          <div class="text-sm text-muted-foreground">Treasures to cap</div>
          <div class="text-xl font-semibold">{successfulDigsToCap}</div>
        </div>
        <div class="rounded-lg border bg-background p-3">
          <div class="text-sm text-muted-foreground">Skill gain</div>
          <div class="text-xl font-semibold">+0.5% per treasure</div>
        </div>
      </div>

      <p class="mt-4 text-sm leading-6 text-muted-foreground">
        Treasure Hunter adds up to +10 percentage points to each relic's reward
        chance in a Buried Treasure Chest. The table focuses on relics and
        estimates each relic's chance per chest at your selected skill.
      </p>
    </div>

    <div class="overflow-hidden rounded-lg border">
      <div class="overflow-x-auto">
        <table class="w-full whitespace-nowrap">
          <thead class="bg-muted/50">
            <tr>
              <th class="p-3 text-left font-medium">Reward</th>
              <th class="p-3 text-left font-medium">Type</th>
              <th class="p-3 text-right font-medium">Baseline</th>
              <th class="p-3 text-right font-medium">At selected skill</th>
              <th class="p-3 text-right font-medium">Change</th>
            </tr>
          </thead>
          <tbody>
            {#each displayedChestRewards as reward (reward.item_id)}
              <tr class="border-t hover:bg-muted/25">
                <td class="p-3">
                  <ItemLink
                    itemId={reward.item_id}
                    itemName={reward.item_name}
                    tooltipHtml={reward.tooltip_html}
                  />
                </td>
                <td class="p-3">
                  <span
                    class={reward.scales_with_treasure_hunter
                      ? "rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300"
                      : "text-muted-foreground"}
                  >
                    {formatItemType(reward.item_type)}
                  </span>
                </td>
                <td class="p-3 text-right font-mono">
                  {formatPercent(reward.baseline_open_chance)}
                </td>
                <td class="p-3 text-right font-mono">
                  {formatPercent(reward.adjusted_open_chance)}
                </td>
                <td class="p-3 text-right font-mono">
                  {#if Math.abs(reward.change_from_baseline) < 0.0005}
                    <span class="text-muted-foreground">—</span>
                  {:else}
                    <span
                      class={reward.change_from_baseline > 0
                        ? "text-emerald-600 dark:text-emerald-300"
                        : "text-orange-600 dark:text-orange-300"}
                    >
                      {formatSignedPercentagePoints(
                        reward.change_from_baseline,
                      )}
                    </span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </section>
  <section id="treasure-maps" class="space-y-4">
    <h2 class="flex items-center gap-2 text-xl font-semibold">
      <MapIcon class="h-5 w-5 text-amber-500" />
      Treasure Maps ({data.treasureMaps.length})
    </h2>

    <div class="overflow-hidden rounded-lg border">
      <div class="overflow-x-auto">
        <table class="w-full whitespace-nowrap">
          <thead class="bg-muted/50">
            <tr>
              <th class="p-3 text-left font-medium">Map</th>
              <th class="p-3 text-left font-medium">Destination</th>
              <th class="p-3 text-left font-medium">Reward</th>
              <th class="p-3 text-left font-medium">Location</th>
            </tr>
          </thead>
          <tbody>
            {#each data.treasureMaps as map (map.id)}
              <tr class="border-t hover:bg-muted/25">
                <td class="p-3">
                  <ItemLink
                    itemId={map.id}
                    itemName={map.name}
                    tooltipHtml={map.tooltip_html}
                  />
                </td>
                <td class="p-3">
                  <a
                    href="/zones/{map.destination_zone_id}"
                    class="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {map.destination_zone_name}
                  </a>
                  {#if map.destination_sub_zone_name}
                    <span class="text-muted-foreground">
                      / {map.destination_sub_zone_name}</span
                    >
                  {/if}
                </td>
                <td class="p-3">
                  <ItemLink
                    itemId={map.reward_item_id}
                    itemName={map.reward_item_name}
                    tooltipHtml={map.reward_item_tooltip}
                  />
                </td>
                <td class="p-3">
                  <MapLink
                    entityId={map.treasure_location_id}
                    entityType="treasure"
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
</div>

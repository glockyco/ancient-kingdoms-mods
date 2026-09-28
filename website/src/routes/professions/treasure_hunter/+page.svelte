<script lang="ts">
  import Seo from "$lib/components/Seo.svelte";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import MapLink from "$lib/components/MapLink.svelte";
  import {
    calculateAdjustedChestRewards,
    sortChestRewardsForDisplay,
  } from "$lib/utils/treasureHunter";
  import CalculatorIcon from "@lucide/svelte/icons/calculator";
  import MapIcon from "@lucide/svelte/icons/map";
  import AchievementLink from "$lib/components/AchievementLink.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let skillLevel = $state(0);

  const skillFraction = $derived(skillLevel / 100);
  // Source: server-scripts/ChestItem.cs:30 — relic per-roll bonus is `treasureHunterLevel * 0.1f`, so a fully capped skill adds +10 pp to every relic roll.
  const relicRollBonus = $derived(skillFraction * 0.1);
  // Source: server-scripts/TreasureLocation.cs:87-90 — each successful dig below the 100% cap grants +0.5% Treasure Hunter, so capping takes (100 - current) / 0.5 successful digs.
  const successfulDigsToCap = $derived(Math.ceil((100 - skillLevel) / 0.5));
  const adjustedChestRewards = $derived.by(() => {
    const adjusted = calculateAdjustedChestRewards(
      data.buriedChestRewards,
      skillFraction,
      { targetRewards: data.buriedChestRewardLimit },
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
</script>

<Seo
  title={`${data.profession.name} - Ancient Kingdoms`}
  description={`${data.profession.description} View treasure map sources, dig-site destinations, Buried Treasure Chest rewards, and Treasure Hunter relic odds.`}
  path="/professions/treasure_hunter"
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
          increase your chance of finding relics in treasure chests.
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

  <section id="calculator" class="space-y-4">
    <h2 class="flex items-center gap-2 text-xl font-semibold">
      <CalculatorIcon class="h-5 w-5 text-cyan-500" />
      Relic Reward Calculator
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
          <!-- Source: server-scripts/TreasureLocation.cs:87-90 — successful digs grant +0.5% Treasure Hunter until the 100% cap. -->
          <div class="text-xl font-semibold">+0.5% per treasure until 100%</div>
        </div>
      </div>
    </div>

    <div class="overflow-hidden rounded-lg border">
      <div class="overflow-x-auto">
        <table class="w-full whitespace-nowrap">
          <thead class="bg-muted/50">
            <tr>
              <th class="p-3 text-left font-medium">Reward</th>
              <th class="p-3 text-left font-medium">Effect</th>
              <th class="p-3 text-right font-medium">Baseline</th>
              <th class="p-3 text-right font-medium">At selected skill</th>
              <th class="p-3 text-right font-medium">
                Change<sup class="ml-0.5 font-normal text-muted-foreground"
                  >*</sup
                >
              </th>
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
                    imageAvailable={data.itemIconPaths[reward.item_id]}
                  />
                </td>
                <td class="p-3">
                  {#if reward.relic_buff_id}
                    <a
                      href="/skills/{reward.relic_buff_id}"
                      class="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {reward.relic_buff_name ||
                        reward.relic_buff_id.replace(/_/g, " ")}
                    </a>
                  {:else}
                    <span class="text-muted-foreground">—</span>
                  {/if}
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
      <!-- Source: server-scripts/ChestItem.cs:24,61 — chest reward selection loop runs up to 10 passes until the slot count is filled. -->
      <p class="border-t bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
        <span aria-hidden="true">*</span> The chest checks its rewards up to 10 times
        until it fills the available reward slots. Each check gives relics another
        chance, so the bonus shown above can have a larger effect per chest.
      </p>
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
                    imageAvailable={data.itemIconPaths[map.id]}
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
                    imageAvailable={data.itemIconPaths[map.reward_item_id]}
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

  <section class="rounded-lg border p-5 space-y-3">
    <h2 class="text-xl font-semibold">Finding buried treasure</h2>
    <!-- Source: server-scripts/uMMORPG.Scripts.ScriptableItems/TreasureMapItem.cs:12-15; server-scripts/Player.cs:9435-9452; server-scripts/TreasureLocation.cs:13-18,31-37 — using a map shows its location image, and the matching map must be carried at the dig site. -->
    <p class="text-muted-foreground">
      Use a treasure map to see its dig-site clue. Bring that map to the
      matching location in the
      <a
        href="#treasure-maps"
        class="text-blue-600 hover:underline dark:text-blue-400"
        >Treasure Maps</a
      >
      table.
    </p>
    <!-- Source: server-scripts/TreasureLocation.cs:61-63,78-90,117-129,158-161 — digging requires a shovel, the matching map, and inventory space; success consumes the map, grants a chest and +0.5% skill. -->
    <p class="text-muted-foreground">
      Carry a
      <ItemLink
        itemId={data.keyItems.shovel.id}
        itemName={data.keyItems.shovel.name}
        tooltipHtml={data.keyItems.shovel.tooltip_html}
        imageAvailable={data.itemIconPaths[data.keyItems.shovel.id]}
      />
      and make room for a chest. A successful dig consumes the map and gives a chest.
    </p>
    <!-- Source: server-scripts/ChestItem.cs:24-31 — a Buried Treasure Chest grants unique rewards and applies the Treasure Hunter bonus only to relic rolls. -->
    <p class="text-muted-foreground">
      Opening a chest grants up to {data.buriedChestRewardLimit} unique rewards. Treasure
      Hunter increases only the relic rolls.
    </p>
    {#if data.profession.achievement_id}
      <AchievementLink
        achievementId={data.profession.achievement_id}
        achievementName={data.profession.achievement_name}
      />
    {/if}
  </section>
</div>

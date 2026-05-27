<script lang="ts">
  import Seo from "$lib/components/Seo.svelte";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import MapLink from "$lib/components/MapLink.svelte";
  import Fish from "@lucide/svelte/icons/fish";
  import Trophy from "@lucide/svelte/icons/trophy";
  import CalculatorIcon from "@lucide/svelte/icons/calculator";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import Utensils from "@lucide/svelte/icons/utensils";
  import { SvelteSet } from "svelte/reactivity";
  import {
    fishDropChancePerCast,
    fishEscapeChancePerHook,
    fishTrashChancePerHook,
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

  let skillLevel = $state(0);
  let selectedCostumeIds = new SvelteSet<string>();
  let selectedSpotId = $state(data.spots[0]?.id ?? "");

  const castDelay = fishingCastDelaySecondsRange();
  const fishermanCostumePieces = $derived(selectedCostumeIds.size);

  const selectedSpot = $derived(
    data.spots.find((spot) => spot.id === selectedSpotId) ?? data.spots[0],
  );

  const selectedSpotSuccessChance = $derived(
    selectedSpot
      ? fishingSpotSuccessChance({
          rodQuality: 0,
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
        rodQuality: 0,
        spotTier: selectedSpot.level,
      }),
    }));

    return [
      ...fishRows,
      {
        label: "Any trash fish",
        itemId: null,
        tooltipHtml: null,
        quality: null,
        chance:
          selectedSpotSuccessChance *
          fishTrashChancePerHook({
            spotDrops,
            fishingPercent: skillLevel,
            fishermanCostumePieces,
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
          }),
      },
      {
        label: "Spot ignores bait",
        itemId: null,
        tooltipHtml: null,
        quality: null,
        chance: 1 - selectedSpotSuccessChance,
      },
    ];
  });

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
</script>

<Seo
  title={`${data.profession.name} - Ancient Kingdoms`}
  description={`${data.profession.description} Fishing spot tiers, bite timing, selected fish odds, Fisherman set bonuses, foods, and potions.`}
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

    <div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
    <!-- Source: server-scripts/GatherItem.cs:649-655 — < 0.2 spot success hard-blocks fishing. -->
    <!-- Source: server-scripts/GatherItem.cs:657-788 — successful spot rolls pick one fish, failed rolls give 20% trash / 80% escape. -->
    <!-- Source: server-scripts/GatherItem.cs:660-676 — selected fish chance = drop rate + Fishing/2 + 2pp per Fisherman costume piece. -->
    <!-- Source: server-scripts/GatherItem.cs:790-822 — Fishing mastery gain and XP table. -->
    <!-- Source: server-scripts/GatherItem.cs:967-996 — click-window length per tier. -->
    <!-- Source: server-scripts/Player.cs:7546-7565 — auto-equips best rod and starts the cast with Random.Range(3, 8) second window delay. -->

    <div class="mt-4 divide-y">
      <div class="grid gap-3 py-4 first:pt-0 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">1</div>
        <div>
          <div>Carry a Fishing Rod.</div>
          <p class="mt-1 text-sm leading-6 text-muted-foreground">
            The cast uses your available Fishing Rod. Current exported data has
            {#if data.rod}
              <ItemLink
                itemId={data.rod.item_id}
                itemName={data.rod.item_name}
                tooltipHtml={data.rod.tooltip_html}
                colorClass={getQualityTextColorClass(data.rod.quality)}
              />
              as the only Fishing Rod.
            {:else}
              Rusty Fishing Rod as the only Fishing Rod.
            {/if}
          </p>
        </div>
      </div>

      <div class="grid gap-3 py-4 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">2</div>
        <div>
          <div>Click a Fishing Spot.</div>
          <p class="mt-1 text-sm leading-6 text-muted-foreground">
            Fishing spots are map resources and have tiered difficulty.
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
            Bite chance is based on Fishing skill, spot tier, and the current
            Common rod.
          </p>
        </div>
      </div>

      <div class="grid gap-3 py-4 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">5</div>
        <div>
          <div>Gain XP and possibly mastery.</div>
          <p class="mt-1 text-sm leading-6 text-muted-foreground">
            Successful bites grant XP by tier and can raise Fishing mastery up
            to the tier cap.
          </p>
        </div>
      </div>

      <div class="grid gap-3 py-4 last:pb-0 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">6</div>
        <div>
          <div>Roll the selected fish.</div>
          <p class="mt-1 text-sm leading-6 text-muted-foreground">
            The selected fish roll is drop rate + Fishing/2 + 2 pp per equipped
            Fisherman set piece. Failed fish rolls can become trash fish or
            escaped fish.
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
      <div class="mt-4 grid gap-4 lg:grid-cols-3">
        <label class="space-y-2">
          <span class="text-sm font-medium">Skill</span>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            bind:value={skillLevel}
            class="w-full"
          />
          <span class="text-sm text-muted-foreground">{skillLevel}%</span>
        </label>
        <label class="space-y-2">
          <span class="text-sm font-medium">Spot</span>
          <select
            bind:value={selectedSpotId}
            class="w-full rounded-md border bg-background p-2"
          >
            {#each data.spots as spot (spot.id)}
              <option value={spot.id}
                >{spot.name} ({formatTier(spot.level)})</option
              >
            {/each}
          </select>
        </label>
        <div class="space-y-2">
          <div class="text-sm font-medium">Fisherman set pieces</div>
          <div class="space-y-2 rounded-md border bg-background p-3">
            {#each data.costumePieces as piece (piece.item_id)}
              <label class="flex items-center gap-2">
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
          <span class="text-sm text-muted-foreground">
            +2 pp per selected fish roll for each equipped Fisherman set piece.
          </span>
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
      <p class="mt-3 text-sm text-muted-foreground">
        Casts where you miss the click window are not shown. They always yield
        nothing. Rows sum to 100%. If the bite chance is too low, the spot
        displays "Your Fishing skill is too low to fish here" and casting is
        blocked entirely.
      </p>
    {:else}
      <p class="mt-4 text-sm text-muted-foreground">
        No fishing spots are loaded yet.
      </p>
    {/if}
  </section>

  <section id="fishing-spots" class="rounded-lg border p-5">
    <div class="flex items-center gap-2">
      <MapPin class="h-5 w-5 text-cyan-500" />
      <h2 class="text-xl font-semibold">Fishing Spots ({data.spots.length})</h2>
    </div>
    <div class="mt-4 overflow-hidden rounded-lg border">
      <div class="overflow-x-auto">
        <table class="w-full whitespace-nowrap">
          <thead class="bg-muted/50">
            <tr>
              <th class="p-3 text-left font-medium">Spot</th>
              <th class="p-3 text-left font-medium">Tier</th>
              <th class="p-3 text-left font-medium">Fish</th>
              <th class="p-3 text-left font-medium">Zones</th>
              <th class="p-3 text-right font-medium">Map</th>
            </tr>
          </thead>
          <tbody>
            {#each data.spots as spot (spot.id)}
              <tr class="border-t align-top hover:bg-muted/25">
                <td class="p-3">
                  <a
                    href="/gather-items/{spot.id}"
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
                <td class="p-3">{spot.zone_count}</td>
                <td class="p-3 text-right">
                  <MapLink entityId={spot.id} entityType="resource" compact />
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <section id="fish-journal" class="rounded-lg border p-5">
    <div class="flex items-center gap-2">
      <Fish class="h-5 w-5 text-cyan-500" />
      <h2 class="text-xl font-semibold">
        Fish Journal ({data.stats.fish_count} + {data.stats.trash_fish_count} trash)
      </h2>
    </div>
    <div class="mt-4 overflow-hidden rounded-lg border">
      <div class="overflow-x-auto">
        <table class="w-full whitespace-nowrap">
          <thead class="bg-muted/50">
            <tr>
              <th class="p-3 text-left font-medium">Fish</th>
              <th class="p-3 text-left font-medium">Source</th>
              <th class="p-3 text-right font-medium">Cooking</th>
              <th class="p-3 text-right font-medium">Alchemy</th>
            </tr>
          </thead>
          <tbody>
            {#each data.fish as item (item.item_id)}
              <tr class="border-t hover:bg-muted/25">
                <td class="p-3">
                  <ItemLink
                    itemId={item.item_id}
                    itemName={item.item_name}
                    tooltipHtml={item.tooltip_html}
                    colorClass={getQualityTextColorClass(item.quality)}
                  />
                </td>
                <td class="p-3">{item.is_trash ? "Trash" : "Fish"}</td>
                <td class="p-3 text-right font-mono">
                  {item.cooking_recipe_count || "—"}
                </td>
                <td class="p-3 text-right font-mono">
                  {item.alchemy_recipe_count || "—"}
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
      <Utensils class="h-5 w-5 text-orange-500" />
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
              <th class="p-3 text-right font-medium">Amount</th>
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
                  />
                </td>
                <td class="p-3 text-right font-mono">
                  {recipe.ingredient_amount}
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
        <Utensils class="h-5 w-5 text-purple-500" />
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
                <th class="p-3 text-right font-medium">Amount</th>
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
                    />
                  </td>
                  <td class="p-3 text-right font-mono">
                    {recipe.ingredient_amount}
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

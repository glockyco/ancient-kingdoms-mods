<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import MapLink from "$lib/components/MapLink.svelte";
  import ObtainabilityTree from "$lib/components/ObtainabilityTree.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import {
    formatDuration,
    formatNumber,
    formatPercent as formatFraction,
    formatRange,
  } from "$lib/utils/format";
  import Key from "@lucide/svelte/icons/key";
  import ListTree from "@lucide/svelte/icons/list-tree";
  import Gem from "@lucide/svelte/icons/gem";
  import Dices from "@lucide/svelte/icons/dices";
  import FlaskConical from "@lucide/svelte/icons/flask-conical";
  import { chestRewardChance } from "$lib/utils/chest-reward";
  import type { PageData } from "./$types";
  import { supplyChances } from "$lib/utils/chest-supplies";

  let { data }: { data: PageData } = $props();
  const rewardChance = $derived(chestRewardChance(data.chest));

  // Source: server-scripts/WorldChestSupplies.cs:Roll,Pick — potions use the
  // highest level the character can use, and a third of the potion chance first
  // tries the utility pool. Scrolls choose among every scroll the level allows.
  const supplyRows = $derived.by(() => {
    const items = data.supplies?.items ?? [];
    const levels = [
      ...new Set(items.map((item) => Math.max(1, item.level_required))),
    ].sort((a, b) => a - b);
    return levels.map((level) => ({
      level,
      pools: (["potion", "utility_potion", "scroll"] as const).map((pool) =>
        items.filter(
          (item) =>
            item.pool === pool && Math.max(1, item.level_required) === level,
        ),
      ),
    }));
  });
  const utilityFrom = $derived(
    Math.min(
      ...(data.supplies?.items ?? [])
        .filter((item) => item.pool === "utility_potion")
        .map((item) => Math.max(1, item.level_required)),
    ),
  );
  const firstScrolls = $derived(
    (data.supplies?.items ?? []).filter(
      (item) => item.pool === "scroll" && item.level_required <= 1,
    ),
  );
  const moreScrollsFrom = $derived(
    Math.min(
      ...(data.supplies?.items ?? [])
        .filter((item) => item.pool === "scroll" && item.level_required > 1)
        .map((item) => item.level_required),
    ),
  );

  let level = $state(50);
  let classId = $state("warrior");
  const itemById = $derived(
    new Map((data.supplies?.items ?? []).map((item) => [item.item_id, item])),
  );
  const chances = $derived(
    data.supplies
      ? supplyChances(
          data.supplies.items,
          data.supplies.potion_chance,
          data.supplies.scroll_chance,
          Math.min(50, Math.max(1, Math.round(level) || 1)),
          classId,
        )
      : [],
  );
  const nothingChance = $derived(
    1 - chances.reduce((total, entry) => total + entry.chance, 0),
  );
  // Every item of one pool shares one chance, so the pools are listed once each.
  const chanceGroups = $derived(
    (["potion", "utility_potion", "scroll"] as const).flatMap((pool) => {
      const entries = chances.filter((entry) => entry.pool === pool);
      return entries.length === 0
        ? []
        : [
            {
              pool,
              chance: entries[0].chance,
              items: entries.map((entry) => entry.item_id),
            },
          ];
    }),
  );
  const POOL_LABELS = {
    potion: "Potion",
    utility_potion: "Utility Potion",
    scroll: "Scroll",
  } as const;
  function formatPercent(
    value: number,
    options: Parameters<typeof formatFraction>[1] = {
      decimals: 1,
      trailingZeros: true,
    },
  ): string {
    return formatFraction(value, options);
  }
</script>

<Seo
  title={`Chest - ${data.chest.zone_name} - Ancient Kingdoms`}
  description={data.description}
  path={`/chests/${data.chest.id}`}
/>

<div class="container mx-auto p-8 space-y-6 max-w-5xl">
  <!-- Breadcrumb -->
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Chests", href: "/chests" },
      { label: data.chest.zone_name },
    ]}
  />

  <!-- Header -->
  <div>
    <div class="flex items-center gap-3 flex-wrap">
      <h1 class="text-3xl font-bold">Chest</h1>
      <MapLink entityId={data.chest.id} entityType="chest" />
      <span
        class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      >
        Chest
      </span>
    </div>

    <div class="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
      <span>
        Zone: <a
          href="/zones/{data.chest.zone_id}"
          class="text-blue-600 dark:text-blue-400 hover:underline"
        >
          {data.chest.zone_name}
        </a>
      </span>
      {#if data.chest.respawn_time > 0}
        <span>Respawn: {formatDuration(data.chest.respawn_time)}</span>
      {/if}
    </div>
  </div>

  <!-- Requirements -->
  {#if data.chest.key_required_id}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Key class="h-5 w-5 text-yellow-500" />
        Key
      </h2>
      <div class="bg-muted/30 rounded-md border p-4">
        <a
          href="/items/{data.chest.key_required_id}"
          class="text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          {data.chest.key_required_name}
        </a>
        <!-- The chest's outer reward roll precedes key or lockpick consumption. -->
        <p class="mt-3">
          Without the key, a character who has learned
          <a
            href="/skills/lockpicking"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Lockpicking</a
          >
          can use
          <a
            href="/items/lockpicks"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Lockpicks</a
          >
          instead. After the chest's reward roll succeeds, each attempt uses one and
          succeeds 20% of the time. A failed attempt still starts the chest's respawn
          timer.
        </p>
      </div>
    </section>

    <!-- How to Obtain Key -->
    {#if data.keyObtainabilityTree}
      <section>
        <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
          <ListTree class="h-5 w-5 text-muted-foreground" />
          How to Obtain Key
        </h2>
        <div class="bg-muted/30 rounded-md border p-4">
          <div class="bg-background rounded-md p-4 border overflow-x-auto">
            <div class="w-fit pr-2">
              <ObtainabilityTree
                node={data.keyObtainabilityTree}
                hideRootLink={true}
              />
            </div>
          </div>
        </div>
      </section>
    {/if}
  {/if}

  <!-- Rewards -->
  {#if data.chest.gold_min > 0 || data.chest.gold_max > 0 || data.chest.item_reward_id}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Gem class="h-5 w-5 text-amber-500" />
        Rewards
      </h2>
      <div class="bg-muted/30 rounded-md border p-4 space-y-4">
        <!-- Source: server-scripts/GatherItem.cs:OnInteractServer — a failed reward roll shows an empty chest, and the respawn timer starts before the roll. -->
        {#if rewardChance < 1}
          <p>
            Each opening has a {formatPercent(rewardChance)} chance to give anything.
            Otherwise the chest is empty until it respawns.
          </p>
        {/if}
        {#if data.chest.gold_min > 0 || data.chest.gold_max > 0}
          <div>
            <div class="text-sm text-muted-foreground mb-1">Gold</div>
            <div class="font-medium text-yellow-600 dark:text-yellow-400">
              {#if data.chest.gold_min === data.chest.gold_max}
                {formatNumber(data.chest.gold_min)} gold
              {:else}
                {formatRange(data.chest.gold_min, data.chest.gold_max)} gold
              {/if}
            </div>
          </div>
        {/if}

        {#if data.chest.item_reward_id}
          <div>
            <div class="text-sm text-muted-foreground mb-1">Item Reward</div>
            <div class="font-medium">
              <a
                href="/items/{data.chest.item_reward_id}"
                class="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {data.chest.item_reward_name}
              </a>
              {#if data.chest.item_reward_amount > 1}
                <span class="text-muted-foreground">
                  ×{formatRange(1, data.chest.item_reward_amount)}
                </span>
              {:else}
                <span class="text-muted-foreground"> ×1 </span>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </section>
  {/if}

  <!-- Random Drops -->
  {#if data.drops.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Dices class="h-5 w-5 text-purple-500" />
        Random Drops
      </h2>
      <div class="bg-muted/30 rounded-md border overflow-hidden">
        <table class="w-full">
          <thead>
            <tr class="border-b bg-muted/50">
              <th class="text-left font-medium p-3">Item</th>
              <th class="text-right font-medium p-3 w-28">Drop Chance</th>
            </tr>
          </thead>
          <tbody>
            {#each data.drops as drop (drop.item_id)}
              <tr class="border-b last:border-b-0 hover:bg-muted/30">
                <td class="p-3">
                  <ItemLink
                    itemId={drop.item_id}
                    itemName={drop.item_name}
                    quality={drop.quality}
                  />
                </td>
                <td class="p-3 text-right font-mono">
                  {#if drop.actual_drop_chance != null}
                    {formatPercent(drop.actual_drop_chance)}
                  {:else if drop.drop_rate != null}
                    {formatPercent(drop.drop_rate)}
                  {:else}
                    -
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}

  {#if data.supplies}
    {@const supplies = data.supplies}
    <section id="supplies">
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <FlaskConical class="h-5 w-5 text-green-500" />
        Potions and Scrolls
      </h2>
      <div class="bg-muted/30 rounded-md border p-4 space-y-4">
        <!-- Source: server-scripts/GatherItem.cs:580-583; WorldChestSupplies.cs:Roll,Pick — an opening that gives loot rolls one potion or scroll for the character's level and class. -->
        <p>
          When an opening gives loot, the chest can add a potion or a scroll.
        </p>
        <ul class="list-disc space-y-1 pl-5">
          <li>
            {formatPercent(supplies.potion_chance)} chance of a potion: the highest-level
            one for your level and class.
          </li>
          {#if Number.isFinite(utilityFrom)}
            <li>
              From level {utilityFrom}, a third of these potions are a utility
              potion instead.
            </li>
          {/if}
          <li>
            {formatPercent(supplies.scroll_chance)} chance of a scroll.
            {#if firstScrolls.length === 1 && Number.isFinite(moreScrollsFrom)}
              Below level {moreScrollsFrom}, it is always a
              <ItemLink
                itemId={firstScrolls[0].item_id}
                itemName={firstScrolls[0].item_name}
                quality={firstScrolls[0].quality}
              />.
            {/if}
          </li>
        </ul>
        {#snippet item(id: string)}
          {@const entry = itemById.get(id)!}
          <ItemLink
            itemId={entry.item_id}
            itemName={entry.item_name}
            quality={entry.quality}
            tooltipHtml={entry.tooltip_html}
            imageAvailable={supplies.icon_paths[entry.item_id]}
            variant="reference"
          />
        {/snippet}
        {#snippet picker()}
          <div class="rounded-md border bg-background p-4 space-y-3 text-sm">
            <div class="flex flex-wrap items-end gap-4">
              <label class="flex flex-col gap-1">
                <span class="text-xs text-muted-foreground">Your Level</span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  bind:value={level}
                  class="w-20 rounded border bg-background px-2 py-1 tabular-nums"
                />
              </label>
              <label class="flex flex-col gap-1">
                <span class="text-xs text-muted-foreground">Your Class</span>
                <select
                  bind:value={classId}
                  class="rounded border bg-background px-2 py-1"
                >
                  {#each supplies.classes as cls (cls.id)}
                    <option value={cls.id}>{cls.name}</option>
                  {/each}
                </select>
              </label>
            </div>
            <div class="divide-y">
              {#each chanceGroups as group (group.pool)}
                <div class="py-3 first:pt-1">
                  <div class="mb-2 flex items-baseline justify-between gap-3">
                    <span class="font-medium">{POOL_LABELS[group.pool]}</span>
                    <span class="font-mono tabular-nums text-muted-foreground"
                      >{formatPercent(group.chance, {
                        decimals: 2,
                        trailingZeros: false,
                      })}{group.items.length > 1 ? " each" : ""}</span
                    >
                  </div>
                  <div class="flex flex-wrap gap-x-5 gap-y-2">
                    {#each group.items as id (id)}
                      {@render item(id)}
                    {/each}
                  </div>
                </div>
              {/each}
              <div
                class="flex items-baseline justify-between gap-3 pt-3 text-muted-foreground"
              >
                <span>Nothing extra</span>
                <span class="font-mono tabular-nums"
                  >{formatPercent(nothingChance, {
                    decimals: 2,
                    trailingZeros: false,
                  })}</span
                >
              </div>
            </div>
          </div>
        {/snippet}
        {#snippet tiers()}
          <div class="space-y-3">
            {#each supplyRows as row (row.level)}
              <div class="rounded-md border bg-background p-3">
                <div class="mb-2 text-sm font-medium">
                  Req. Level {row.level}
                </div>
                <div class="flex flex-wrap gap-x-5 gap-y-1.5">
                  {#each row.pools.flat() as entry (entry.item_id)}
                    <span class="inline-flex items-center gap-1 text-sm">
                      {@render item(entry.item_id)}
                    </span>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        {/snippet}
        {@render picker()}
        <details>
          <summary class="cursor-pointer text-sm font-medium"
            >All Potions and Scrolls by Level</summary
          >
          <div class="mt-3">{@render tiers()}</div>
        </details>
      </div>
    </section>
  {/if}
</div>

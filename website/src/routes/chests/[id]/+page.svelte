<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import MapLink from "$lib/components/MapLink.svelte";
  import ObtainabilityTree from "$lib/components/ObtainabilityTree.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import { formatDuration, formatPercent } from "$lib/utils/format";
  import Key from "@lucide/svelte/icons/key";
  import ListTree from "@lucide/svelte/icons/list-tree";
  import Gem from "@lucide/svelte/icons/gem";
  import Dices from "@lucide/svelte/icons/dices";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  // Format gold amounts with narrow space thousands separator
  function formatGold(amount: number): string {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F");
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
        {#if data.chest.gold_min > 0 || data.chest.gold_max > 0}
          <div>
            <div class="text-sm text-muted-foreground mb-1">Gold</div>
            <div class="font-medium text-yellow-600 dark:text-yellow-400">
              {#if data.chest.gold_min === data.chest.gold_max}
                {formatGold(data.chest.gold_min)} gold
              {:else}
                {formatGold(data.chest.gold_min)} - {formatGold(
                  data.chest.gold_max,
                )} gold
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
                  ×1–{data.chest.item_reward_amount}
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
              <th class="text-right font-medium p-3 w-28">Drop Rate</th>
            </tr>
          </thead>
          <tbody>
            {#each data.drops as drop (drop.item_id)}
              <tr class="border-b last:border-b-0 hover:bg-muted/30">
                <td class="p-3">
                  <ItemLink itemId={drop.item_id} itemName={drop.item_name} />
                </td>
                <td class="p-3 text-right font-mono">
                  {#if drop.actual_drop_chance != null}
                    {formatPercent(drop.actual_drop_chance)}
                  {:else}
                    {formatPercent(drop.drop_rate)}
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}
</div>

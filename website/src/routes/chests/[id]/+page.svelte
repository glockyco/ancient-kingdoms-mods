<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import MapLink from "$lib/components/MapLink.svelte";
  import LazyObtainabilityTree from "$lib/components/LazyObtainabilityTree.svelte";
  import DeferredDetails from "$lib/components/DeferredDetails.svelte";
  import MethodList from "$lib/components/acquisition/MethodList.svelte";
  import ScrollRegion from "$lib/components/acquisition/ScrollRegion.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import { formatDuration, formatPercent } from "$lib/utils/format";
  import Key from "@lucide/svelte/icons/key";
  import ListTree from "@lucide/svelte/icons/list-tree";
  import Dices from "@lucide/svelte/icons/dices";
  import type { PageData } from "./$types";
  import { detailTitle } from "$lib/seo/title";

  let { data }: { data: PageData } = $props();
  const chestName = $derived(`Chest in ${data.chest.zone_name}`);
</script>

<Seo
  title={detailTitle("Chest", {
    zone: data.chest.zone_name,
    source:
      data.chest.keys
        .map((key) => key.itemName ?? "Unpublished key")
        .join(", ") || undefined,
  })}
  description={data.description}
  path={`/chests/${data.chest.id}`}
/>

<div class="container mx-auto p-8 space-y-6 max-w-5xl">
  <!-- Breadcrumb -->
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Chests", href: "/chests" },
      { label: chestName },
    ]}
  />

  <!-- Header -->
  <div>
    <div class="flex items-center gap-3 flex-wrap">
      <h1 class="text-3xl font-bold">{chestName}</h1>
      <MapLink entityId={data.chest.id} entityType="chest" />
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

  <section class="space-y-4">
    <h2 class="text-xl font-semibold">Opening and rewards</h2>
    {#if data.chest.openingChance !== null && data.chest.openingChance < 1}
      <p>An unsuccessful opening leaves the chest empty until it respawns.</p>
    {/if}
    <MethodList
      methods={data.acquisitionMethods}
      items={data.acquisitionItems}
      names={data.acquisitionNames}
    />
  </section>

  <!-- Requirements -->
  {#if data.chest.keys.length}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Key class="h-5 w-5 text-yellow-500" />
        Lockpicking alternative
      </h2>
      <div class="bg-muted/30 rounded-md border p-4">
        <!-- Source: server-scripts/GatherItem.cs:OnInteractServer -->
        <p>
          Without a matching key, learned
          <a
            href="/skills/lockpicking"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >Lockpicking</a
          >
          gives each lockpick attempt a 20% success chance. A failed lockpick attempt
          leaves the chest empty until it respawns.
        </p>
      </div>
    </section>

    <!-- How to Obtain Key -->
    {#if data.chest.keys.some((key) => key.itemId)}
      <section>
        <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
          <ListTree class="h-5 w-5 text-muted-foreground" />
          How to Obtain Key
        </h2>
        <DeferredDetails
          summary="Show sources"
          className="bg-muted/30 rounded-md border p-4"
        >
          <ScrollRegion
            label="Chest key sources"
            className="mt-4 max-h-[32rem] overflow-auto overscroll-contain pr-2"
          >
            <div class="space-y-4 min-w-0">
              {#each data.chest.keys as key, index (index)}
                {#if key.itemId}
                  <LazyObtainabilityTree itemId={key.itemId} />
                {/if}
              {/each}
            </div>
          </ScrollRegion>
        </DeferredDetails>
      </section>
    {/if}
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
              <th class="text-right font-medium p-3 w-28"
                >Chance per successful opening</th
              >
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
                    {formatPercent(drop.actual_drop_chance, {
                      decimals: 1,
                      trailingZeros: true,
                    })}
                  {:else}
                    Unknown
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

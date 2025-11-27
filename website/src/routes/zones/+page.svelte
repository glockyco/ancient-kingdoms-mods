<script lang="ts">
  import Crown from "@lucide/svelte/icons/crown";
  import Shield from "@lucide/svelte/icons/shield";
  import Flame from "@lucide/svelte/icons/flame";
  import Users from "@lucide/svelte/icons/users";
  import Gem from "@lucide/svelte/icons/gem";
  import Castle from "@lucide/svelte/icons/castle";
  import Trees from "@lucide/svelte/icons/trees";
  import ChevronUp from "@lucide/svelte/icons/chevron-up";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import ChevronsUpDown from "@lucide/svelte/icons/chevrons-up-down";

  let { data } = $props();

  // Sorting
  type SortKey =
    | "name"
    | "is_dungeon"
    | "level_min"
    | "level_max"
    | "boss_count"
    | "elite_count"
    | "altar_count"
    | "npc_count"
    | "gather_count";
  let sortKey = $state<SortKey>("level_min");
  let sortAsc = $state(true);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      sortAsc = !sortAsc;
    } else {
      sortKey = key;
      sortAsc = true;
    }
  }

  const sortedZones = $derived.by(() => {
    return [...data.zones].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (sortKey === "is_dungeon") {
        cmp = (a.is_dungeon ? 1 : 0) - (b.is_dungeon ? 1 : 0);
      } else {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        // Nulls always sort last, regardless of direction
        if (aVal === null && bVal === null) cmp = 0;
        else if (aVal === null) return 1;
        else if (bVal === null) return -1;
        else cmp = aVal - bVal;
      }
      // Apply direction, then use name as tiebreaker
      const result = sortAsc ? cmp : -cmp;
      return result !== 0 ? result : a.name.localeCompare(b.name);
    });
  });
</script>

<svelte:head>
  <title>Zones - Ancient Kingdoms Compendium</title>
</svelte:head>

<div class="container mx-auto p-8">
  <h1 class="mb-6 text-3xl font-bold">Zones</h1>

  <div class="rounded-md border overflow-x-auto">
    <table class="w-full min-w-[900px]">
      <thead>
        <tr class="border-b bg-muted/50">
          <th class="px-3 py-2 text-center font-medium w-[60px]">
            <button
              type="button"
              class="flex items-center justify-center gap-1 hover:text-foreground w-full"
              onclick={() => toggleSort("is_dungeon")}
            >
              Type
              {#if sortKey === "is_dungeon"}
                {#if sortAsc}
                  <ChevronUp class="h-4 w-4" />
                {:else}
                  <ChevronDown class="h-4 w-4" />
                {/if}
              {:else}
                <ChevronsUpDown class="h-4 w-4 opacity-50" />
              {/if}
            </button>
          </th>
          <th class="px-3 py-2 text-left font-medium min-w-[220px]">
            <button
              type="button"
              class="flex items-center gap-1 hover:text-foreground"
              onclick={() => toggleSort("name")}
            >
              Name
              {#if sortKey === "name"}
                {#if sortAsc}
                  <ChevronUp class="h-4 w-4" />
                {:else}
                  <ChevronDown class="h-4 w-4" />
                {/if}
              {:else}
                <ChevronsUpDown class="h-4 w-4 opacity-50" />
              {/if}
            </button>
          </th>
          <th class="px-3 py-2 text-center font-medium">
            <button
              type="button"
              class="flex items-center justify-center gap-1 hover:text-foreground w-full"
              onclick={() => toggleSort("level_min")}
            >
              Min
              {#if sortKey === "level_min"}
                {#if sortAsc}
                  <ChevronUp class="h-4 w-4" />
                {:else}
                  <ChevronDown class="h-4 w-4" />
                {/if}
              {:else}
                <ChevronsUpDown class="h-4 w-4 opacity-50" />
              {/if}
            </button>
          </th>
          <th class="px-3 py-2 text-center font-medium">
            <button
              type="button"
              class="flex items-center justify-center gap-1 hover:text-foreground w-full"
              onclick={() => toggleSort("level_max")}
            >
              Max
              {#if sortKey === "level_max"}
                {#if sortAsc}
                  <ChevronUp class="h-4 w-4" />
                {:else}
                  <ChevronDown class="h-4 w-4" />
                {/if}
              {:else}
                <ChevronsUpDown class="h-4 w-4 opacity-50" />
              {/if}
            </button>
          </th>
          <th
            class="px-3 py-2 text-center font-medium text-cyan-600 dark:text-cyan-400"
          >
            <button
              type="button"
              class="flex items-center justify-center gap-1 hover:text-foreground w-full"
              onclick={() => toggleSort("boss_count")}
            >
              <Crown class="h-4 w-4" />
              Bosses
              {#if sortKey === "boss_count"}
                {#if sortAsc}
                  <ChevronUp class="h-4 w-4" />
                {:else}
                  <ChevronDown class="h-4 w-4" />
                {/if}
              {:else}
                <ChevronsUpDown class="h-4 w-4 opacity-50" />
              {/if}
            </button>
          </th>
          <th
            class="px-3 py-2 text-center font-medium text-purple-600 dark:text-purple-400"
          >
            <button
              type="button"
              class="flex items-center justify-center gap-1 hover:text-foreground w-full"
              onclick={() => toggleSort("elite_count")}
            >
              <Shield class="h-4 w-4" />
              Elites
              {#if sortKey === "elite_count"}
                {#if sortAsc}
                  <ChevronUp class="h-4 w-4" />
                {:else}
                  <ChevronDown class="h-4 w-4" />
                {/if}
              {:else}
                <ChevronsUpDown class="h-4 w-4 opacity-50" />
              {/if}
            </button>
          </th>
          <th
            class="px-3 py-2 text-center font-medium text-orange-600 dark:text-orange-400"
          >
            <button
              type="button"
              class="flex items-center justify-center gap-1 hover:text-foreground w-full"
              onclick={() => toggleSort("altar_count")}
            >
              <Flame class="h-4 w-4" />
              Altars
              {#if sortKey === "altar_count"}
                {#if sortAsc}
                  <ChevronUp class="h-4 w-4" />
                {:else}
                  <ChevronDown class="h-4 w-4" />
                {/if}
              {:else}
                <ChevronsUpDown class="h-4 w-4 opacity-50" />
              {/if}
            </button>
          </th>
          <th
            class="px-3 py-2 text-center font-medium text-blue-600 dark:text-blue-400"
          >
            <button
              type="button"
              class="flex items-center justify-center gap-1 hover:text-foreground w-full"
              onclick={() => toggleSort("npc_count")}
            >
              <Users class="h-4 w-4" />
              NPCs
              {#if sortKey === "npc_count"}
                {#if sortAsc}
                  <ChevronUp class="h-4 w-4" />
                {:else}
                  <ChevronDown class="h-4 w-4" />
                {/if}
              {:else}
                <ChevronsUpDown class="h-4 w-4 opacity-50" />
              {/if}
            </button>
          </th>
          <th
            class="px-3 py-2 text-center font-medium text-amber-600 dark:text-amber-400"
          >
            <button
              type="button"
              class="flex items-center justify-center gap-1 hover:text-foreground w-full"
              onclick={() => toggleSort("gather_count")}
            >
              <Gem class="h-4 w-4" />
              Resources
              {#if sortKey === "gather_count"}
                {#if sortAsc}
                  <ChevronUp class="h-4 w-4" />
                {:else}
                  <ChevronDown class="h-4 w-4" />
                {/if}
              {:else}
                <ChevronsUpDown class="h-4 w-4 opacity-50" />
              {/if}
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        {#each sortedZones as zone, i (zone.id)}
          <tr
            class="border-b transition-colors hover:bg-muted/50 {i % 2 === 1
              ? 'bg-muted/30'
              : ''}"
          >
            <td class="px-3 py-2 text-center">
              {#if zone.is_dungeon}
                <Castle class="h-4 w-4 text-purple-500 inline-block" />
              {:else}
                <Trees class="h-4 w-4 text-green-500 inline-block" />
              {/if}
            </td>
            <td class="px-3 py-2">
              <a
                href="/zones/{zone.id}"
                class="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {zone.name}
              </a>
            </td>
            <td class="px-3 py-2 text-center">
              {#if zone.level_min !== null}
                {zone.level_min}
              {:else}
                <span class="text-muted-foreground">-</span>
              {/if}
            </td>
            <td class="px-3 py-2 text-center">
              {#if zone.level_max !== null}
                {zone.level_max}
              {:else}
                <span class="text-muted-foreground">-</span>
              {/if}
            </td>
            <td class="px-3 py-2 text-center">
              {#if zone.boss_count > 0}
                {zone.boss_count}
              {:else}
                <span class="text-muted-foreground">-</span>
              {/if}
            </td>
            <td class="px-3 py-2 text-center">
              {#if zone.elite_count > 0}
                {zone.elite_count}
              {:else}
                <span class="text-muted-foreground">-</span>
              {/if}
            </td>
            <td class="px-3 py-2 text-center">
              {#if zone.altar_count > 0}
                {zone.altar_count}
              {:else}
                <span class="text-muted-foreground">-</span>
              {/if}
            </td>
            <td class="px-3 py-2 text-center">
              {#if zone.npc_count > 0}
                {zone.npc_count}
              {:else}
                <span class="text-muted-foreground">-</span>
              {/if}
            </td>
            <td class="px-3 py-2 text-center">
              {#if zone.gather_count > 0}
                {zone.gather_count}
              {:else}
                <span class="text-muted-foreground">-</span>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

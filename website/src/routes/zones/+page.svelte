<script lang="ts">
  import {
    DataTable,
    type ColumnDef,
    type Cell,
    type Row,
    type Header,
  } from "$lib/components/ui/data-table";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import type { ZoneListView } from "$lib/types/zones";
  import { ICON_BADGE } from "$lib/styles/badge";
  import Crown from "@lucide/svelte/icons/crown";
  import Shield from "@lucide/svelte/icons/shield";
  import Flame from "@lucide/svelte/icons/flame";
  import Users from "@lucide/svelte/icons/users";
  import Gem from "@lucide/svelte/icons/gem";
  import Castle from "@lucide/svelte/icons/castle";
  import Trees from "@lucide/svelte/icons/trees";

  let { data } = $props();

  const columns: ColumnDef<ZoneListView>[] = [
    {
      accessorKey: "is_dungeon",
      header: "Type",
      enableHiding: false,
      size: 70,
    },
    {
      accessorKey: "name",
      header: "Name",
      enableHiding: false,
      minSize: 220,
    },
    {
      id: "level_range",
      header: "Level Range",
      accessorFn: (row) => row.level_min,
      enableSorting: false,
      size: 150,
    },
    {
      accessorKey: "level_median",
      header: "Median",
      size: 150,
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.level_median;
        const b = rowB.original.level_median;
        if (a === null && b === null) return 0;
        if (a === null) return 1;
        if (b === null) return -1;
        return a - b;
      },
    },
    {
      accessorKey: "boss_count",
      header: "Bosses",
      size: 130,
    },
    {
      accessorKey: "elite_count",
      header: "Elites",
      size: 110,
    },
    {
      accessorKey: "altar_count",
      header: "Altars",
      size: 110,
    },
    {
      accessorKey: "npc_count",
      header: "NPCs",
      size: 110,
    },
    {
      accessorKey: "gather_count",
      header: "Resources",
      size: 150,
    },
  ];

  const columnLabels: Record<string, string> = {
    is_dungeon: "Type",
    name: "Name",
    level_range: "Level Range",
    level_median: "Median Level",
    boss_count: "Bosses",
    elite_count: "Elites",
    altar_count: "Altars",
    npc_count: "NPCs",
    gather_count: "Resources",
  };
</script>

{#snippet renderHeader({ header }: { header: Header<ZoneListView, unknown> })}
  {#if header.id === "boss_count"}
    <span
      class="ml-auto flex items-center gap-1 text-cyan-600 dark:text-cyan-400"
    >
      <Crown class="h-4 w-4" />
      Bosses
    </span>
  {:else if header.id === "elite_count"}
    <span
      class="ml-auto flex items-center gap-1 text-purple-600 dark:text-purple-400"
    >
      <Shield class="h-4 w-4" />
      Elites
    </span>
  {:else if header.id === "altar_count"}
    <span
      class="ml-auto flex items-center gap-1 text-orange-600 dark:text-orange-400"
    >
      <Flame class="h-4 w-4" />
      Altars
    </span>
  {:else if header.id === "npc_count"}
    <span
      class="ml-auto flex items-center gap-1 text-blue-600 dark:text-blue-400"
    >
      <Users class="h-4 w-4" />
      NPCs
    </span>
  {:else if header.id === "gather_count"}
    <span
      class="ml-auto flex items-center gap-1 text-amber-600 dark:text-amber-400"
    >
      <Gem class="h-4 w-4" />
      Resources
    </span>
  {:else if header.id === "level_range" || header.id === "level_median"}
    <span class="ml-auto">{columnLabels[header.id] ?? header.id}</span>
  {:else}
    {columnLabels[header.id] ?? header.id}
  {/if}
{/snippet}

{#snippet renderCell({
  cell,
  row,
}: {
  cell: Cell<ZoneListView, unknown>;
  row: Row<ZoneListView>;
})}
  {#if cell.column.id === "is_dungeon"}
    <div class="flex justify-center">
      {#if row.original.is_dungeon}
        <Castle class="{ICON_BADGE.iconSize} text-purple-500" />
      {:else}
        <Trees class="{ICON_BADGE.iconSize} text-green-500" />
      {/if}
    </div>
  {:else if cell.column.id === "name"}
    <a
      href="/zones/{row.original.id}"
      class="text-blue-600 dark:text-blue-400 hover:underline"
    >
      {row.original.name}
    </a>
  {:else if cell.column.id === "level_range"}
    <span class="ml-auto">
      {#if row.original.level_min !== null && row.original.level_max !== null}
        {#if row.original.level_min === row.original.level_max}
          {row.original.level_min}
        {:else}
          {row.original.level_min} – {row.original.level_max}
        {/if}
      {:else}
        <span class="text-muted-foreground">—</span>
      {/if}
    </span>
  {:else if cell.column.id === "level_median"}
    <span class="ml-auto">
      {#if row.original.level_median !== null}
        {row.original.level_median}
      {:else}
        <span class="text-muted-foreground">—</span>
      {/if}
    </span>
  {:else if cell.column.id === "boss_count" || cell.column.id === "elite_count" || cell.column.id === "altar_count" || cell.column.id === "npc_count" || cell.column.id === "gather_count"}
    {@const value = cell.getValue() as number}
    <span class="ml-auto">
      {#if value > 0}
        {value}
      {:else}
        <span class="text-muted-foreground">-</span>
      {/if}
    </span>
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

<Seo
  title="Zones - Ancient Kingdoms"
  description={`${data.zones.length.toLocaleString()} zones across Eratiath — overworld regions and dungeons with level ranges, monster rosters, NPCs, gathering nodes, chests, and altars.`}
  path="/zones"
/>

<div class="container mx-auto p-8 space-y-6">
  <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Zones" }]} />

  <h1 class="text-3xl font-bold">Zones</h1>

  <DataTable
    data={data.zones}
    {columns}
    {columnLabels}
    {renderCell}
    {renderHeader}
    pageSize={50}
    initialSorting={[
      { id: "level_median", desc: false },
      { id: "name", desc: false },
    ]}
    urlKey="zones"
    showPagination={true}
    showSearch={true}
    showColumnToggle={true}
    zebraStripe={true}
    searchPlaceholder="Search zones..."
    class="bg-muted/30"
  />
</div>

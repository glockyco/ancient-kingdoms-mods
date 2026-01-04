<script lang="ts">
  import {
    DataTable,
    DataTableFacetedFilter,
    type ColumnDef,
    type Cell,
    type Row,
    type Header,
    type TanstackTable,
  } from "$lib/components/ui/data-table";
  import { IconBadge } from "$lib/components/ui/icon-badge";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import Trees from "@lucide/svelte/icons/trees";
  import Check from "@lucide/svelte/icons/check";
  import type { AltarListView } from "$lib/types/altars";

  let { data } = $props();

  const PAGE_SIZE = 20;

  // Get unique types for filter options
  const uniqueTypes = $derived(
    Array.from(new Set(data.altars.map((a) => a.type))).sort(),
  );

  // Get unique zones for filter options
  const uniqueZones = $derived(
    Array.from(new Map(data.altars.map((a) => [a.zoneId, a])).values()).sort(
      (a, b) => a.zoneName.localeCompare(b.zoneName),
    ),
  );

  type AltarRow = AltarListView;

  const columns: ColumnDef<AltarRow>[] = [
    {
      accessorKey: "name",
      header: "Name",
      enableHiding: false,
      minSize: 200,
    },
    {
      // Hidden by default, but needed for type filter
      accessorKey: "type",
      header: "Type",
      size: 120,
    },
    {
      id: "boss",
      header: "Boss",
      size: 200,
      accessorFn: (row) => row.bossName,
    },
    {
      accessorKey: "totalEnemies",
      header: "Enemies",
      size: 120,
    },
    {
      accessorKey: "totalWaves",
      header: "Waves",
      size: 110,
    },
    {
      accessorKey: "minLevelRequired",
      header: "Level",
      size: 100,
    },
    {
      id: "scaling",
      header: "Level Scaling",
      size: 150,
      accessorFn: (row) => row.usesVeteranScaling,
    },
    {
      id: "zone",
      header: "Zone",
      size: 180,
      accessorFn: (row) => row.zoneName,
    },
  ];

  const columnLabels: Record<string, string> = {
    name: "Name",
    type: "Type",
    zone: "Zone",
    minLevelRequired: "Level",
    boss: "Boss",
    totalEnemies: "Enemies",
    totalWaves: "Waves",
    scaling: "Level Scaling",
  };
</script>

{#snippet renderHeader({ header }: { header: Header<AltarRow, unknown> })}
  {columnLabels[header.id] ?? header.id}
{/snippet}

{#snippet renderCell({
  cell,
  row,
}: {
  cell: Cell<AltarRow, unknown>;
  row: Row<AltarRow>;
})}
  {#if cell.column.id === "name"}
    <a
      href="/altars/{row.original.id}"
      class="text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
    >
      {row.original.name}
    </a>
  {:else if cell.column.id === "type"}
    <span class="capitalize">{row.original.type}</span>
  {:else if cell.column.id === "zone"}
    <IconBadge
      href="/zones/{row.original.zoneId}"
      icon={Trees}
      iconClass="text-green-500"
    >
      {row.original.zoneName}
    </IconBadge>
  {:else if cell.column.id === "minLevelRequired"}
    {#if row.original.minLevelRequired > 0}
      {row.original.minLevelRequired}+
    {:else}
      <span class="text-muted-foreground">-</span>
    {/if}
  {:else if cell.column.id === "boss"}
    {#if row.original.bossId && row.original.bossName}
      <a
        href="/monsters/{row.original.bossId}"
        class="text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
      >
        {row.original.bossName}
      </a>
    {:else}
      <span class="text-muted-foreground">-</span>
    {/if}
  {:else if cell.column.id === "scaling"}
    {#if row.original.usesVeteranScaling}
      <Check class="h-4 w-4 text-green-500" />
    {:else}
      <span class="text-muted-foreground">-</span>
    {/if}
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderToolbar({ table }: { table: TanstackTable<AltarRow> })}
  {@const typeCol = table.getColumn("type")}
  {@const zoneCol = table.getColumn("zone")}
  {#if typeCol}
    <DataTableFacetedFilter
      column={typeCol}
      title="Type"
      options={uniqueTypes.map((t) => ({
        label: t.charAt(0).toUpperCase() + t.slice(1),
        value: t,
      }))}
    />
  {/if}
  {#if zoneCol}
    <DataTableFacetedFilter
      column={zoneCol}
      title="Zone"
      options={uniqueZones.map((z) => ({
        label: z.zoneName,
        value: z.zoneName,
      }))}
    />
  {/if}
{/snippet}

<svelte:head>
  <title>Altars - Ancient Kingdoms Compendium</title>
  <meta
    name="description"
    content="All Altars in Ancient Kingdoms - Forgotten Altars and Avatar Altars with wave-based events and tiered rewards."
  />
</svelte:head>

<div class="container mx-auto p-8 space-y-6">
  <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Altars" }]} />

  <h1 class="text-3xl font-bold">Altars</h1>

  <DataTable
    data={data.altars}
    {columns}
    {columnLabels}
    {renderCell}
    {renderHeader}
    {renderToolbar}
    pageSize={PAGE_SIZE}
    initialSorting={[
      { id: "type", desc: false },
      { id: "zone", desc: false },
    ]}
    initialColumnVisibility={{ type: false }}
    urlKey="altars"
    showPagination={true}
    showSearch={true}
    showColumnToggle={true}
    zebraStripe={true}
    paginateStaticHtml={true}
    searchPlaceholder="Search altars..."
    class="bg-muted/30"
  />
</div>

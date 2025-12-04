<script lang="ts">
  import { SvelteMap } from "svelte/reactivity";
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
  import type { ChestListView } from "$lib/queries/gather-items.server";
  import Box from "@lucide/svelte/icons/box";
  import Trees from "@lucide/svelte/icons/trees";
  import Castle from "@lucide/svelte/icons/castle";
  import { formatDuration } from "$lib/utils/format";

  let { data } = $props();

  const PAGE_SIZE = 20;

  // Format gold amounts with narrow space thousands separator
  function formatGold(amount: number): string {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F");
  }

  // Get unique zones for filter
  const uniqueZones = $derived(
    Array.from(new Map(data.chests.map((c) => [c.zone_id, c])).values()).sort(
      (a, b) => a.zone_name.localeCompare(b.zone_name),
    ),
  );

  // Get unique keys for filter
  const uniqueKeys = $derived(
    Array.from(
      new Map(
        data.chests
          .filter((c) => c.tool_or_key_id && c.tool_or_key_name)
          .map((c) => [c.tool_or_key_id, c.tool_or_key_name] as const),
      ).entries(),
    ).sort((a, b) => a[1]!.localeCompare(b[1]!)),
  );

  const columns: ColumnDef<ChestListView>[] = [
    {
      id: "name",
      header: "Name",
      enableHiding: false,
      size: 80,
    },
    {
      id: "key",
      header: "Key",
      size: 230,
      accessorFn: (row) => row.tool_or_key_name || "",
      filterFn: (row, columnId, filterValue: string[]) => {
        const keyId = row.original.tool_or_key_id;
        if (!filterValue || filterValue.length === 0) return true;
        return keyId != null && filterValue.includes(keyId);
      },
    },
    {
      id: "gold",
      header: "Gold",
      size: 130,
      accessorFn: (row) => {
        if (row.gold_min > 0 || row.gold_max > 0) {
          return row.gold_min === row.gold_max
            ? row.gold_min
            : (row.gold_min + row.gold_max) / 2;
        }
        return 0;
      },
    },
    {
      id: "item",
      header: "Item",
      minSize: 180,
      accessorFn: (row) => row.item_reward_name || "",
    },
    {
      accessorKey: "respawn_time",
      header: "Respawn",
      size: 100,
    },
    {
      id: "zone",
      header: "Zone",
      minSize: 150,
      accessorFn: (row) => row.zone_name,
      filterFn: (row, columnId, filterValue: string[]) => {
        const zoneId = row.original.zone_id;
        if (!filterValue || filterValue.length === 0) return true;
        return filterValue.includes(zoneId);
      },
    },
    {
      id: "coordinates",
      header: "Coordinates",
      size: 120,
    },
  ];

  const columnLabels: Record<string, string> = {
    zone: "Zone",
    coordinates: "Coordinates",
    name: "Name",
    respawn_time: "Respawn",
    key: "Key",
    gold: "Gold",
    item: "Item",
  };
</script>

{#snippet renderToolbar({ table }: { table: TanstackTable<ChestListView> })}
  {@const zoneCol = table.getColumn("zone")}
  {@const keyCol = table.getColumn("key")}
  {@const zoneCountsFiltered = (() => {
    const counts = new SvelteMap<string, number>();
    const facetedRows = zoneCol?.getFacetedRowModel()?.rows ?? [];
    for (const row of facetedRows) {
      const zoneId = row.original.zone_id;
      counts.set(zoneId, (counts.get(zoneId) ?? 0) + 1);
    }
    return counts;
  })()}
  {@const keyCountsFiltered = (() => {
    const counts = new SvelteMap<string, number>();
    const facetedRows = keyCol?.getFacetedRowModel()?.rows ?? [];
    for (const row of facetedRows) {
      const keyId = row.original.tool_or_key_id;
      if (keyId) {
        counts.set(keyId, (counts.get(keyId) ?? 0) + 1);
      }
    }
    return counts;
  })()}
  {#if zoneCol}
    <DataTableFacetedFilter
      column={zoneCol}
      title="Zone"
      options={uniqueZones.map((c) => ({
        label: c.zone_name,
        value: c.zone_id,
      }))}
      counts={zoneCountsFiltered}
    />
  {/if}
  {#if keyCol}
    <DataTableFacetedFilter
      column={keyCol}
      title="Key"
      options={uniqueKeys.map(([id, name]) => ({
        label: name!,
        value: id!,
      }))}
      counts={keyCountsFiltered}
    />
  {/if}
{/snippet}

{#snippet renderHeader({ header }: { header: Header<ChestListView, unknown> })}
  {columnLabels[header.id] ?? header.id}
{/snippet}

{#snippet renderCell({
  cell,
  row,
}: {
  cell: Cell<ChestListView, unknown>;
  row: Row<ChestListView>;
})}
  {#if cell.column.id === "zone"}
    <IconBadge
      href="/zones/{row.original.zone_id}"
      icon={row.original.is_dungeon ? Castle : Trees}
      iconClass={row.original.is_dungeon ? "text-purple-500" : "text-green-500"}
    >
      {row.original.zone_name}
    </IconBadge>
  {:else if cell.column.id === "coordinates"}
    {#if row.original.position_x != null && row.original.position_y != null}
      <span class="font-mono text-sm">
        {Math.round(row.original.position_x)}, {Math.round(
          row.original.position_y,
        )}
      </span>
    {:else}
      <span class="text-muted-foreground">-</span>
    {/if}
  {:else if cell.column.id === "name"}
    <a
      href="/chests/{row.original.id}"
      class="text-blue-600 dark:text-blue-400 hover:underline"
    >
      Chest
    </a>
  {:else if cell.column.id === "respawn_time"}
    {formatDuration(row.original.respawn_time)}
  {:else if cell.column.id === "key"}
    {#if row.original.tool_or_key_id && row.original.tool_or_key_name}
      <a
        href="/items/{row.original.tool_or_key_id}"
        class="text-blue-600 dark:text-blue-400 hover:underline"
      >
        {row.original.tool_or_key_name}
      </a>
    {:else}
      <span class="text-muted-foreground">-</span>
    {/if}
  {:else if cell.column.id === "gold"}
    {#if row.original.gold_min > 0 || row.original.gold_max > 0}
      <span class="text-yellow-600 dark:text-yellow-400">
        {#if row.original.gold_min === row.original.gold_max}
          {formatGold(row.original.gold_min)}
        {:else}
          {formatGold(row.original.gold_min)}–{formatGold(
            row.original.gold_max,
          )}
        {/if}
      </span>
    {:else}
      <span class="text-muted-foreground">-</span>
    {/if}
  {:else if cell.column.id === "item"}
    {#if row.original.item_reward_id && row.original.item_reward_name}
      <a
        href="/items/{row.original.item_reward_id}"
        class="text-blue-600 dark:text-blue-400 hover:underline"
      >
        {row.original.item_reward_name}
      </a>
      {#if row.original.item_reward_amount > 1}
        <span class="text-muted-foreground"
          >×{row.original.item_reward_amount}</span
        >
      {/if}
    {:else}
      <span class="text-muted-foreground">-</span>
    {/if}
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

<svelte:head>
  <title>Chests - Ancient Kingdoms Compendium</title>
  <meta
    name="description"
    content="Browse all treasure chests in Ancient Kingdoms. Find chest locations, required keys, gold rewards, and item drops."
  />
</svelte:head>

<div class="container mx-auto p-8 space-y-8">
  <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Chests" }]} />

  <h1 class="text-3xl font-bold flex items-center gap-3">
    <Box class="h-8 w-8 text-blue-500" />
    Chests ({data.chests.length})
  </h1>

  <DataTable
    data={data.chests}
    {columns}
    {columnLabels}
    {renderCell}
    {renderHeader}
    {renderToolbar}
    pageSize={PAGE_SIZE}
    initialSorting={[{ id: "zone", desc: false }]}
    urlKey="chests"
    showPagination={true}
    showSearch={true}
    zebraStripe={true}
    paginateStaticHtml={true}
    searchPlaceholder="Search chests..."
    class="bg-muted/30"
  />
</div>

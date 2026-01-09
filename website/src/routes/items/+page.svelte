<script lang="ts">
  import { onMount } from "svelte";
  import {
    DataTable,
    DataTableFacetedFilter,
    DataTableRangeFilter,
    DataTableStatPanel,
    DataTableStatToggle,
    type ColumnDef,
    type Cell,
    type Row,
    type Header,
    type TanstackTable,
  } from "$lib/components/ui/data-table";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import ClassPills from "$lib/components/ClassPills.svelte";
  import { formatItemType } from "$lib/utils/format";
  import type { ItemListViewClient } from "$lib/types/items";

  let { data } = $props();

  const PAGE_SIZE = 20;
  // Use "statsPanel" (no "items." prefix) to avoid collision with DataTable's URL namespace
  const STATS_PANEL_URL_KEY = "statsPanel";
  const STATS_PANEL_STORAGE_KEY = "items-stats-panel-open";

  // Panel open state
  let statPanelOpen = $state(false);
  let hasMounted = $state(false);

  onMount(() => {
    // Clean up any stale URL params from old implementation
    const url = new URL(window.location.href);
    let needsUrlUpdate = false;
    if (url.searchParams.has("items.statsPanel")) {
      url.searchParams.delete("items.statsPanel");
      needsUrlUpdate = true;
    }

    // Restore from URL first
    const urlValue = url.searchParams.get(STATS_PANEL_URL_KEY);
    if (urlValue !== null) {
      statPanelOpen = urlValue === "1";
    } else {
      // Fall back to localStorage
      try {
        statPanelOpen = localStorage.getItem(STATS_PANEL_STORAGE_KEY) === "1";
      } catch {
        // localStorage unavailable
      }
    }

    if (needsUrlUpdate) {
      window.history.replaceState(history.state, "", url.toString());
    }

    hasMounted = true;
  });

  // Sync panel state to URL and localStorage (only after mount)
  $effect(() => {
    if (!hasMounted) return;

    const url = new URL(window.location.href);
    if (statPanelOpen) {
      url.searchParams.set(STATS_PANEL_URL_KEY, "1");
    } else {
      url.searchParams.delete(STATS_PANEL_URL_KEY);
    }
    window.history.replaceState(history.state, "", url.toString());

    try {
      if (statPanelOpen) {
        localStorage.setItem(STATS_PANEL_STORAGE_KEY, "1");
      } else {
        localStorage.removeItem(STATS_PANEL_STORAGE_KEY);
      }
    } catch {
      // localStorage unavailable
    }
  });

  // Precomputed at build time - no JSON parsing needed on client
  const { itemStatKeys, itemClassKeys } = data;

  // Quality display names and colors
  const qualities = [
    { name: "Common", value: 0 },
    { name: "Uncommon", value: 1 },
    { name: "Rare", value: 2 },
    { name: "Epic", value: 3 },
    { name: "Legendary", value: 4 },
  ];

  // Generate notes for an item based on its type
  function getNotes(item: ItemListViewClient): string {
    const type = item.item_type;

    // Equipment/weapons: show stat count (pre-computed in SQL)
    if (type === "equipment" || type === "weapon") {
      if (item.stat_count > 0) return `${item.stat_count} stats`;
      return "-";
    }

    // Mounts: show movement speed
    if (type === "mount" && item.mount_speed > 0) {
      return `${item.mount_speed} speed`;
    }

    // Potions: show tier from alchemy recipe level
    if (type === "potion" && item.alchemy_recipe_level_required != null) {
      return `Tier ${item.alchemy_recipe_level_required}`;
    }

    // Backpacks: show capacity
    if (type === "backpack" && item.backpack_slots > 0) {
      return `${item.backpack_slots} slots`;
    }

    return "-";
  }

  // Get unique item types for filter
  const uniqueTypes = $derived(
    Array.from(new Set(data.items.map((item) => item.item_type))).sort(),
  );

  // Get unique slots for filter
  const uniqueSlots = $derived(
    Array.from(
      new Set(data.items.map((item) => item.slot).filter((s) => s != null)),
    ).sort() as string[],
  );

  // Get unique classes for filter (using precomputed data)
  const uniqueClasses = $derived(
    Array.from(new Set(Object.values(itemClassKeys).flat())).sort(),
  );

  type ItemRow = ItemListViewClient;

  const columns: ColumnDef<ItemRow>[] = [
    {
      accessorKey: "quality",
      header: "Quality",
      size: 120,
      filterFn: (row, columnId, filterValue: string[]) => {
        const value = row.getValue(columnId) as number;
        if (!filterValue || filterValue.length === 0) return true;
        return filterValue.includes(String(value));
      },
    },
    {
      accessorKey: "name",
      header: "Name",
      enableHiding: false,
      minSize: 350,
    },
    {
      accessorKey: "item_level",
      header: "iLvl",
      size: 150,
    },
    {
      accessorKey: "level_required",
      header: "Level",
      size: 100,
      filterFn: (
        row,
        columnId,
        filterValue: [number | null, number | null],
      ) => {
        const value = row.getValue(columnId) as number | null;
        if (!filterValue) return true;
        const [min, max] = filterValue;
        if (min === null && max === null) return true;
        if (value === null || value === 0) return min === null || min === 0;
        if (min !== null && value < min) return false;
        if (max !== null && value > max) return false;
        return true;
      },
    },
    {
      accessorKey: "slot",
      header: "Slot",
      size: 160,
      filterFn: (row, columnId, filterValue: string[]) => {
        const value = row.getValue(columnId) as string | null;
        if (!filterValue || filterValue.length === 0) return true;
        return value != null && filterValue.includes(value);
      },
    },
    {
      id: "class",
      header: "Class",
      size: 250,
      enableSorting: false,
      accessorFn: (row) => (itemClassKeys[row.id] ?? []).join(", "),
      getUniqueValues: (row) => itemClassKeys[row.id] ?? [],
      filterFn: (row, columnId, filterValue: string[]) => {
        // Use precomputed class keys (no JSON parsing)
        const classes = itemClassKeys[row.original.id] ?? [];
        if (!filterValue || filterValue.length === 0) return true;
        return classes.some((c) => filterValue.includes(c));
      },
    },
    {
      id: "notes",
      header: "Notes",
      size: 150,
      enableSorting: false,
      accessorFn: (row) => getNotes(row),
    },
    // Hidden - for filtering only
    {
      accessorKey: "item_type",
      header: "Type",
      enableHiding: false,
      filterFn: (row, columnId, filterValue: string[]) => {
        const value = row.getValue(columnId) as string;
        if (!filterValue || filterValue.length === 0) return true;
        return filterValue.includes(value);
      },
    },
    // Hidden - stats filter column
    {
      id: "stats",
      accessorKey: "stats",
      header: "Stats",
      enableHiding: false,
      enableSorting: false,
      filterFn: (
        row,
        _columnId,
        filterValue: { stats: string[]; mode: "any" | "all" },
      ) => {
        if (!filterValue || filterValue.stats.length === 0) return true;

        // Use precomputed stat keys (no JSON parsing)
        const rowStatKeys = itemStatKeys[row.original.id] ?? [];
        const { stats, mode } = filterValue;

        if (mode === "all") {
          return stats.every((stat) => rowStatKeys.includes(stat));
        } else {
          return stats.some((stat) => rowStatKeys.includes(stat));
        }
      },
    },
  ];

  const columnLabels: Record<string, string> = {
    quality: "Quality",
    name: "Name",
    item_level: "Item Level",
    level_required: "Level",
    slot: "Slot",
    class: "Class",
    notes: "Notes",
    item_type: "Type",
    stats: "Stats",
  };
</script>

{#snippet renderHeader({ header }: { header: Header<ItemRow, unknown> })}
  {#if header.id === "item_level" || header.id === "level_required"}
    <span class="ml-auto">{columnLabels[header.id] ?? header.id}</span>
  {:else if header.id === "item_type"}
    <span></span>
  {:else}
    {columnLabels[header.id] ?? header.id}
  {/if}
{/snippet}

{#snippet renderCell({
  cell,
  row,
}: {
  cell: Cell<ItemRow, unknown>;
  row: Row<ItemRow>;
})}
  {#if cell.column.id === "quality"}
    {@const q = row.original.quality}
    <span
      class="px-2 py-0.5 rounded text-xs font-medium text-white bg-quality-{q}"
    >
      {qualities[q]?.name ?? `Q${q}`}
    </span>
  {:else if cell.column.id === "name"}
    <ItemLink
      itemId={row.original.id}
      itemName={row.original.name}
      tooltipHtml={row.original.tooltip_html}
      class="whitespace-nowrap"
    />
  {:else if cell.column.id === "item_level"}
    <span class="ml-auto">{row.original.item_level || "-"}</span>
  {:else if cell.column.id === "level_required"}
    <span class="ml-auto">{row.original.level_required || "-"}</span>
  {:else if cell.column.id === "slot"}
    <span class={row.original.slot ? "" : "text-muted-foreground"}
      >{row.original.slot || "-"}</span
    >
  {:else if cell.column.id === "class"}
    {@const classes = itemClassKeys[row.original.id] ?? []}
    <ClassPills classes={classes.map((c) => c.toLowerCase())} />
  {:else if cell.column.id === "notes"}
    {@const notes = getNotes(row.original)}
    <span class={notes === "-" ? "text-muted-foreground" : ""}>{notes}</span>
  {:else if cell.column.id === "item_type" || cell.column.id === "stats"}
    <!-- Hidden filter columns -->
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderToolbar({ table }: { table: TanstackTable<ItemRow> })}
  {@const qualityCol = table.getColumn("quality")}
  {@const typeCol = table.getColumn("item_type")}
  {@const slotCol = table.getColumn("slot")}
  {@const classCol = table.getColumn("class")}
  {@const levelCol = table.getColumn("level_required")}
  {@const statsCol = table.getColumn("stats")}
  {@const facetedItemIds = (() => {
    // Get item IDs from faceted rows (filtered by everything except stats filter)
    const facetedRows = statsCol?.getFacetedRowModel()?.rows ?? [];
    return facetedRows.map((row) => row.original.id);
  })()}
  {#if qualityCol}
    <DataTableFacetedFilter
      column={qualityCol}
      title="Quality"
      options={qualities.map((q) => ({
        label: q.name,
        value: String(q.value),
      }))}
    />
  {/if}
  {#if typeCol}
    <DataTableFacetedFilter
      column={typeCol}
      title="Type"
      options={uniqueTypes.map((t) => ({
        label: formatItemType(t),
        value: t,
      }))}
    />
  {/if}
  {#if levelCol}
    <DataTableRangeFilter column={levelCol} title="Level" />
  {/if}
  {#if slotCol}
    <DataTableFacetedFilter
      column={slotCol}
      title="Slot"
      options={uniqueSlots.map((s) => ({
        label: s,
        value: s,
      }))}
    />
  {/if}
  {#if classCol}
    <DataTableFacetedFilter
      column={classCol}
      title="Class"
      options={uniqueClasses.map((c) => ({
        label: c,
        value: c,
      }))}
    />
  {/if}
  {#if statsCol}
    {@const statsFilterValue = statsCol.getFilterValue() as
      | { stats: string[]; mode: "any" | "all" }
      | undefined}
    <DataTableStatToggle
      bind:open={statPanelOpen}
      selectedCount={statsFilterValue?.stats.length ?? 0}
      mode={statsFilterValue?.mode ?? "all"}
    />
  {/if}
  <!-- Stat panel: order-last ensures it appears after Columns button, w-full makes it wrap to new line -->
  <div class="order-last w-full">
    {#if statsCol}
      <DataTableStatPanel
        column={statsCol}
        bind:open={statPanelOpen}
        totalRows={data.items.length}
        filteredRows={table.getFilteredRowModel().rows.length}
        {facetedItemIds}
      />
    {/if}
  </div>
{/snippet}

<svelte:head>
  <title>Items - Ancient Kingdoms Compendium</title>
  <meta
    name="description"
    content="Browse all items in Ancient Kingdoms - weapons, armor, consumables, and treasures with stats and drop locations."
  />
</svelte:head>

<div class="container mx-auto p-8 space-y-6">
  <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Items" }]} />

  <h1 class="text-3xl font-bold">Items</h1>

  <DataTable
    data={data.items}
    {columns}
    {columnLabels}
    {renderCell}
    {renderHeader}
    {renderToolbar}
    pageSize={PAGE_SIZE}
    initialSorting={[
      { id: "item_level", desc: true },
      { id: "name", desc: false },
    ]}
    initialColumnVisibility={{
      item_type: false,
      stats: false,
    }}
    urlKey="items"
    showPagination={true}
    showSearch={true}
    showColumnToggle={true}
    zebraStripe={true}
    paginateStaticHtml={true}
    searchPlaceholder="Search items..."
    class="bg-muted/30"
  />
</div>

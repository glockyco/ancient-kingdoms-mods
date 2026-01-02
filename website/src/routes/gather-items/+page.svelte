<script lang="ts">
  import { SvelteMap } from "svelte/reactivity";
  import {
    DataTable,
    DataTableFacetedFilter,
    DataTableRangeFilter,
    type ColumnDef,
    type Cell,
    type Row,
    type Header,
    type TanstackTable,
  } from "$lib/components/ui/data-table";
  import { IconBadge } from "$lib/components/ui/icon-badge";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import type {
    GatherItemListView,
    ResourceDropListView,
  } from "$lib/types/gather-items";
  import type { ResourceZoneInfo } from "$lib/queries/gather-items.server";
  import { formatGatheringRespawn } from "$lib/utils/format";
  import Leaf from "@lucide/svelte/icons/leaf";
  import Trees from "@lucide/svelte/icons/trees";
  import Castle from "@lucide/svelte/icons/castle";

  let { data } = $props();

  // Build a map of resource_id -> zones
  const resourceZoneMap = $derived.by(() => {
    const map = new SvelteMap<string, ResourceZoneInfo[]>();
    for (const rz of data.resourceZones) {
      const existing = map.get(rz.resource_id) || [];
      existing.push(rz);
      map.set(rz.resource_id, existing);
    }
    return map;
  });

  // Build a map of resource_id -> drops
  const resourceDropsMap = $derived.by(() => {
    const map = new SvelteMap<string, ResourceDropListView[]>();
    for (const drop of data.resourceDrops) {
      const existing = map.get(drop.resource_id) || [];
      existing.push(drop);
      map.set(drop.resource_id, existing);
    }
    return map;
  });

  // Extend resources with zones and drops arrays
  type ResourceWithZonesAndDrops = GatherItemListView & {
    zones: ResourceZoneInfo[];
    drops: ResourceDropListView[];
  };
  const resourcesWithZonesAndDrops = $derived(
    data.resources.map((r) => ({
      ...r,
      zones: resourceZoneMap.get(r.id) || [],
      drops: resourceDropsMap.get(r.id) || [],
    })),
  );

  const PAGE_SIZE = 20;

  // Roman numerals for tier display
  const romanNumerals = ["I", "II", "III", "IV", "V"];

  // Type colors for badges
  const typeColors: Record<string, string> = {
    Plant: "bg-green-600",
    Mineral: "bg-gray-500",
    "Radiant Spark": "bg-purple-600",
    Resource: "bg-gray-400",
  };

  // Get unique types for filter
  const uniqueTypes = $derived(
    Array.from(new Set(data.resources.map((item) => item.type))).sort(),
  );

  // Get unique zones for filter
  const uniqueZones = $derived(
    Array.from(
      new Map(data.resourceZones.map((rz) => [rz.zone_id, rz])).values(),
    ).sort((a, b) => a.zone_name.localeCompare(b.zone_name)),
  );

  const columns: ColumnDef<ResourceWithZonesAndDrops>[] = [
    {
      accessorKey: "type",
      header: "Type",
      size: 120,
      filterFn: (row, columnId, filterValue: string[]) => {
        const value = row.getValue(columnId) as string;
        if (!filterValue || filterValue.length === 0) return true;
        return filterValue.includes(value);
      },
    },
    {
      accessorKey: "level",
      header: "Tier",
      size: 80,
      filterFn: (
        row,
        columnId,
        filterValue: [number | null, number | null],
      ) => {
        const value = row.getValue(columnId) as number | null;
        if (!filterValue) return true;
        const [min, max] = filterValue;
        if (min === null && max === null) return true;
        if (value === null) return min === null || min === 0;
        if (min !== null && value < min) return false;
        if (max !== null && value > max) return false;
        return true;
      },
    },
    {
      accessorKey: "name",
      header: "Name",
      enableHiding: false,
      size: 180,
    },
    {
      id: "item",
      header: "Item",
      minSize: 180,
      accessorFn: (row) => row.item_reward_name || "",
    },
    {
      id: "drops",
      header: "Random Drops",
      size: 170,
      accessorFn: (row) => row.drops.map((d) => d.item_name).join(" "),
    },
    {
      accessorKey: "respawn_time",
      header: "Respawn",
      size: 120,
      sortingFn: (rowA, rowB) => {
        // Radiant sparks have random 100-3600s respawn regardless of database value
        // Use midpoint (1850s) for sorting
        const getEffectiveRespawn = (row: Row<ResourceWithZonesAndDrops>) => {
          if (row.original.type === "Radiant Spark") return 1850;
          return row.original.respawn_time;
        };
        return getEffectiveRespawn(rowA) - getEffectiveRespawn(rowB);
      },
    },
    {
      id: "zones",
      header: "Zones",
      size: 230,
      enableSorting: false,
      accessorFn: (row) => row.zones.map((z) => z.zone_name).join(" "),
      filterFn: (row, columnId, filterValue: string[]) => {
        const zones = row.original.zones;
        if (!filterValue || filterValue.length === 0) return true;
        return zones.some((z) => filterValue.includes(z.zone_id));
      },
    },
  ];

  const columnLabels: Record<string, string> = {
    type: "Type",
    name: "Name",
    level: "Tier",
    item: "Item",
    drops: "Random Drops",
    respawn_time: "Respawn",
    zones: "Zones",
  };
</script>

{#snippet renderHeader({
  header,
}: {
  header: Header<ResourceWithZonesAndDrops, unknown>;
})}
  {#if header.id === "level"}
    <span class="ml-auto">{columnLabels[header.id] ?? header.id}</span>
  {:else}
    {columnLabels[header.id] ?? header.id}
  {/if}
{/snippet}

{#snippet renderCell({
  cell,
  row,
}: {
  cell: Cell<ResourceWithZonesAndDrops, unknown>;
  row: Row<ResourceWithZonesAndDrops>;
})}
  {#if cell.column.id === "type"}
    {@const t = row.original.type}
    <span
      class="px-2 py-0.5 rounded text-xs font-medium text-white {typeColors[
        t
      ] ?? 'bg-gray-600'}"
    >
      {t}
    </span>
  {:else if cell.column.id === "name"}
    <a
      href="/gather-items/{row.original.id}"
      class="text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
    >
      {row.original.name}
    </a>
  {:else if cell.column.id === "level"}
    {@const level = row.original.level}
    <span class="ml-auto">
      {#if level != null && level >= 0 && level < romanNumerals.length}
        {romanNumerals[level]}
      {:else if level != null}
        {level}
      {:else}
        -
      {/if}
    </span>
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
          >&nbsp;×1–{row.original.item_reward_amount}</span
        >
      {:else}
        <span class="text-muted-foreground">&nbsp;×1</span>
      {/if}
    {:else}
      <span class="text-muted-foreground">-</span>
    {/if}
  {:else if cell.column.id === "drops"}
    {@const drops = row.original.drops}
    {#if drops.length > 0}
      <span class="text-muted-foreground">{drops.length} items</span>
    {:else}
      <span class="text-muted-foreground">-</span>
    {/if}
  {:else if cell.column.id === "respawn_time"}
    {formatGatheringRespawn(row.original.type, row.original.respawn_time)}
  {:else if cell.column.id === "zones"}
    {@const zones = row.original.zones}
    <div class="flex gap-1 whitespace-nowrap">
      {#if zones.length > 0}
        <IconBadge
          href="/zones/{zones[0].zone_id}"
          icon={zones[0].is_dungeon ? Castle : Trees}
          iconClass={zones[0].is_dungeon ? "text-purple-500" : "text-green-500"}
        >
          {zones[0].zone_name}
        </IconBadge>
        {#if zones.length > 1}
          <span class="text-muted-foreground text-xs self-center"
            >+{zones.length - 1}</span
          >
        {/if}
      {:else}
        <span class="text-muted-foreground">-</span>
      {/if}
    </div>
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderToolbar({
  table,
}: {
  table: TanstackTable<ResourceWithZonesAndDrops>;
})}
  {@const typeCol = table.getColumn("type")}
  {@const levelCol = table.getColumn("level")}
  {@const zonesCol = table.getColumn("zones")}
  {@const zoneCountsFiltered = (() => {
    const counts = new SvelteMap<string, number>();
    const facetedRows = zonesCol?.getFacetedRowModel()?.rows ?? [];
    for (const row of facetedRows) {
      for (const zone of row.original.zones) {
        counts.set(zone.zone_id, (counts.get(zone.zone_id) ?? 0) + 1);
      }
    }
    return counts;
  })()}
  {#if levelCol}
    <DataTableRangeFilter column={levelCol} title="Tier" />
  {/if}
  {#if typeCol}
    <DataTableFacetedFilter
      column={typeCol}
      title="Type"
      options={uniqueTypes.map((t) => ({
        label: t,
        value: t,
      }))}
    />
  {/if}
  {#if zonesCol}
    <DataTableFacetedFilter
      column={zonesCol}
      title="Zone"
      options={uniqueZones.map((z) => ({
        label: z.zone_name,
        value: z.zone_id,
      }))}
      counts={zoneCountsFiltered}
    />
  {/if}
{/snippet}

<svelte:head>
  <title>Gathering Resources - Ancient Kingdoms Compendium</title>
  <meta
    name="description"
    content="Gathering resources in Ancient Kingdoms - plants, minerals, radiant sparks, and spawn locations."
  />
</svelte:head>

<div class="container mx-auto p-8 space-y-8">
  <Breadcrumb
    items={[{ label: "Home", href: "/" }, { label: "Gathering Resources" }]}
  />

  <h1 class="text-3xl font-bold flex items-center gap-3">
    <Leaf class="h-8 w-8 text-green-500" />
    Gathering Resources ({data.resources.length})
  </h1>

  <DataTable
    data={resourcesWithZonesAndDrops}
    {columns}
    {columnLabels}
    {renderCell}
    {renderHeader}
    {renderToolbar}
    pageSize={PAGE_SIZE}
    initialSorting={[
      { id: "type", desc: false },
      { id: "level", desc: false },
    ]}
    urlKey="resources"
    showPagination={true}
    showSearch={true}
    showColumnToggle={true}
    zebraStripe={true}
    paginateStaticHtml={true}
    searchPlaceholder="Search resources..."
    class="bg-muted/30"
  />
</div>

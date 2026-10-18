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
  import Seo from "$lib/components/Seo.svelte";
  import JsonLd from "$lib/components/JsonLd.svelte";
  import { buildCollectionPage } from "$lib/seo/jsonld";
  import MapLink from "$lib/components/MapLink.svelte";
  import type {
    ChestListView,
    ChestDropListView,
  } from "$lib/queries/gather-items.server";
  import Box from "@lucide/svelte/icons/box";
  import Trees from "@lucide/svelte/icons/trees";
  import Castle from "@lucide/svelte/icons/castle";
  import {
    formatDuration,
    formatPercent,
    formatNumber,
  } from "$lib/utils/format";
  import PrimaryRewards from "$lib/components/acquisition/PrimaryRewards.svelte";
  import { minimumGoldQuantity } from "$lib/components/acquisition/display";
  import EntityIcon from "$lib/components/EntityIcon.svelte";
  import { base } from "$app/paths";

  let { data } = $props();

  const collectionNode = $derived(
    buildCollectionPage({
      path: "/chests",
      name: "Chests — Ancient Kingdoms Compendium",
      description: `Find ${formatNumber(data.chests.length)} chests by zone, key, reward, and respawn time.`,
      items: data.chests.map((chest) => ({
        name: chest.name,
        path: `/chests/${chest.id}`,
      })),
    }),
  );

  const PAGE_SIZE = 20;

  // Build a map of chest_id -> drops
  const chestDropsMap = $derived.by(() => {
    const map = new SvelteMap<string, ChestDropListView[]>();
    for (const drop of data.chestDrops) {
      const existing = map.get(drop.chest_id) || [];
      existing.push(drop);
      map.set(drop.chest_id, existing);
    }
    return map;
  });

  // Extend chests with drops array
  type ChestWithDrops = ChestListView & { drops: ChestDropListView[] };
  const chestsWithDrops = $derived(
    data.chests.map((c) => ({
      ...c,
      drops: chestDropsMap.get(c.id) || [],
    })),
  );

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
        data.chests.flatMap((chest) =>
          chest.keys.flatMap((key) =>
            key.itemId && key.itemName
              ? [[key.itemId, key.itemName] as const]
              : [],
          ),
        ),
      ).entries(),
    ).sort((a, b) => a[1]!.localeCompare(b[1]!)),
  );

  const columns: ColumnDef<ChestWithDrops>[] = [
    {
      id: "name",
      header: "Chest",
      enableHiding: false,
      size: 80,
    },
    {
      id: "key",
      header: "Key",
      size: 230,
      accessorFn: (row) =>
        row.keys.map((key) => key.itemName ?? "Unpublished key").join(" "),
      getUniqueValues: (row) =>
        row.keys.flatMap((key) => (key.itemId ? [key.itemId] : [])),
      filterFn: (row, columnId, filterValue: string[]) => {
        if (!filterValue || filterValue.length === 0) return true;
        return row.original.keys.some(
          (key) => key.itemId !== null && filterValue.includes(key.itemId),
        );
      },
    },
    {
      id: "gold",
      header: "Gold",
      size: 130,
      accessorFn: (row) => minimumGoldQuantity(row.primaryRewards),
      sortingFn: "basic",
      sortUndefined: "last",
    },
    {
      id: "item",
      header: "Potential Items",
      minSize: 180,
      accessorFn: (row) =>
        row.primaryRewards
          .filter((reward) => reward.resourceKind === "item")
          .map((reward) => reward.itemName ?? "Unpublished item")
          .join(" "),
    },
    {
      id: "chance",
      header: "Reward chance per opening",
      size: 220,
      accessorFn: (row) => row.openingChance,
    },
    {
      id: "drops",
      header: "Random Drops",
      size: 170,
      accessorFn: (row) => row.drops.length,
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
      getUniqueValues: (row) => [row.zone_id],
      filterFn: (row, columnId, filterValue: string[]) => {
        const zoneId = row.original.zone_id;
        if (!filterValue || filterValue.length === 0) return true;
        return filterValue.includes(zoneId);
      },
    },
    {
      id: "location",
      header: "Location",
      size: 120,
    },
  ];

  const columnLabels: Record<string, string> = {
    zone: "Zone",
    location: "Location",
    name: "Chest",
    respawn_time: "Respawn",
    key: "Key",
    gold: "Gold",
    item: "Item",
    drops: "Random Drops",
    chance: "Reward chance per opening",
  };
</script>

{#snippet renderToolbar({ table }: { table: TanstackTable<ChestWithDrops> })}
  {@const zoneCol = table.getColumn("zone")}
  {@const keyCol = table.getColumn("key")}
  {#if zoneCol}
    <DataTableFacetedFilter
      column={zoneCol}
      title="Zone"
      options={uniqueZones.map((c) => ({
        label: c.zone_name,
        value: c.zone_id,
      }))}
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
    />
  {/if}
{/snippet}

{#snippet renderHeader({ header }: { header: Header<ChestWithDrops, unknown> })}
  {#if header.id === "chance"}
    <span class="ml-auto whitespace-normal text-right"
      >{columnLabels[header.id] ?? header.id}</span
    >
  {:else}
    {columnLabels[header.id] ?? header.id}
  {/if}
{/snippet}

{#snippet renderCell({
  cell,
  row,
}: {
  cell: Cell<ChestWithDrops, unknown>;
  row: Row<ChestWithDrops>;
})}
  {#if cell.column.id === "zone"}
    <IconBadge
      href="/zones/{row.original.zone_id}"
      icon={row.original.is_dungeon ? Castle : Trees}
      iconClass={row.original.is_dungeon ? "text-purple-500" : "text-green-500"}
    >
      {row.original.zone_name}
    </IconBadge>
  {:else if cell.column.id === "location"}
    {#if row.original.position_x != null && row.original.position_y != null}
      <MapLink entityId={row.original.id} entityType="chest" compact />
    {:else}
      <span class="text-muted-foreground">-</span>
    {/if}
  {:else if cell.column.id === "name"}
    <a
      href="/chests/{row.original.id}"
      aria-label={`Chest in ${row.original.zone_name}`}
      title={`Chest in ${row.original.zone_name}`}
      class="inline-flex"
    >
      <EntityIcon
        src={row.original.visual_public_path
          ? `${base}/${row.original.visual_public_path}`
          : null}
        alt=""
        fallback={Box}
        size={32}
      />
    </a>
  {:else if cell.column.id === "respawn_time"}
    {formatDuration(row.original.respawn_time)}
  {:else if cell.column.id === "key"}
    {#each row.original.keys as key (JSON.stringify( [key.itemId, key.withheld] ))}
      <div>
        {#if key.itemId}
          <a
            href="/items/{key.itemId}"
            class="text-blue-600 dark:text-blue-400 hover:underline"
            >{key.itemName}</a
          >
        {:else}
          <span>Unpublished key</span>
        {/if}
      </div>
    {:else}
      <span class="text-muted-foreground">-</span>
    {/each}
  {:else if cell.column.id === "gold"}
    <PrimaryRewards
      rewards={row.original.primaryRewards.filter(
        (reward) => reward.resourceKind === "gold",
      )}
    />
  {:else if cell.column.id === "item"}
    <PrimaryRewards
      rewards={row.original.primaryRewards.filter(
        (reward) => reward.resourceKind === "item",
      )}
    />
  {:else if cell.column.id === "chance"}
    {#if row.original.openingChance !== null}
      <span class="ml-auto">
        {formatPercent(row.original.openingChance, {
          decimals: 1,
          trailingZeros: false,
        })}
      </span>
    {:else}
      <span class="text-muted-foreground">Varies by method</span>
    {/if}
  {:else if cell.column.id === "drops"}
    {@const drops = row.original.drops}
    {#if drops.length > 0}
      <span class="text-muted-foreground"
        >{drops.length} {drops.length === 1 ? "item" : "items"}</span
      >
    {:else}
      <span class="text-muted-foreground">-</span>
    {/if}
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

<Seo
  title="Chests - Ancient Kingdoms"
  description={`Find ${formatNumber(data.chests.length)} chests on the world map, with required keys, gold ranges, item rewards, and respawn times.`}
  path="/chests"
/>

<JsonLd node={collectionNode} />

<div class="container mx-auto p-8 space-y-8">
  <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Chests" }]} />

  <h1 class="text-3xl font-bold flex items-center gap-3">
    <Box class="h-8 w-8 text-sky-500" />
    Chests ({data.chests.length})
  </h1>

  <DataTable
    data={chestsWithDrops}
    {columns}
    {columnLabels}
    {renderCell}
    {renderHeader}
    {renderToolbar}
    pageSize={PAGE_SIZE}
    initialSorting={[{ id: "zone", desc: false }]}
    initialColumnVisibility={{ respawn_time: false }}
    urlKey="chests"
    showPagination={true}
    showSearch={true}
    showColumnToggle={true}
    zebraStripe={true}
    paginateStaticHtml={true}
    searchPlaceholder="Search chests..."
    class="bg-muted/30"
  />
</div>

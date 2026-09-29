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
  import Seo from "$lib/components/Seo.svelte";
  import JsonLd from "$lib/components/JsonLd.svelte";
  import { buildCollectionPage } from "$lib/seo/jsonld";
  import Trees from "@lucide/svelte/icons/trees";
  import Check from "@lucide/svelte/icons/check";
  import type { AltarListView } from "$lib/types/altars";

  let { data } = $props();

  const collectionNode = $derived(
    buildCollectionPage({
      path: "/altars",
      name: "Altars — Ancient Kingdoms Compendium",
      description: `Find ${data.altars.length.toLocaleString()} Forgotten and Avatar altars by zone, boss, and level.`,
      items: data.altars.map((altar) => ({
        name: altar.name,
        path: `/altars/${altar.id}`,
      })),
    }),
  );

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
      accessorFn: (row) => row.bossNames.join(", "),
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
    {#if row.original.bossIds.length > 0}
      {#each row.original.bossIds as bossId, i (bossId)}
        <a
          href="/monsters/{bossId}"
          class="text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
        >
          {row.original.bossNames[i]}
        </a>{#if i < row.original.bossIds.length - 1},
        {/if}
      {/each}
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

<Seo
  title="Altars - Ancient Kingdoms"
  description={`Find ${data.altars.length.toLocaleString()} Forgotten and Avatar altars with wave counts, bosses, level requirements, and rewards from common to legendary.`}
  path="/altars"
/>

<JsonLd node={collectionNode} />

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

  <section id="how-altars-work" class="space-y-4">
    <h2 class="text-xl font-semibold">How altars and trials work</h2>
    <div class="overflow-x-auto rounded-md border bg-muted/30">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b">
            <th class="h-10 whitespace-nowrap px-4 text-left font-medium"
              >Event</th
            >
            <th class="h-10 whitespace-nowrap px-4 text-left font-medium"
              >How to start</th
            >
            <th class="h-10 whitespace-nowrap px-4 text-left font-medium"
              >How to finish</th
            >
          </tr>
        </thead>
        <tbody class="[&>tr:nth-child(even)>td]:bg-muted/30">
          <!-- Source: server-scripts/EventAltar.cs:201-213; server-scripts/AvatarEventAltar.cs:197-209 — activation consumes one required item. server-scripts/DefaultEvent.cs:103-150; server-scripts/AvatarEvent.cs:93-132 — the last wave must be cleared before its timer expires. -->
          <tr class="border-b last:border-0">
            <td class="px-4 py-2">Forgotten or Avatar altar</td>
            <td class="px-4 py-2">Use one required offering</td>
            <td class="px-4 py-2">
              Clear the last wave before its timer ends
            </td>
          </tr>
          <!-- Source: server-scripts/TrialAncientsEvent.cs:69-119,221-251 — entering starts a 30-second preparation countdown, and clearing the final wave completes the trial. -->
          <tr class="border-b last:border-0">
            <td class="px-4 py-2">Trial of the Ancients</td>
            <td class="px-4 py-2">
              Enter the trial area (30-second preparation)
            </td>
            <td class="px-4 py-2">Clear the final wave</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Source: server-scripts/DefaultEvent.cs:64-80,273-291; server-scripts/AvatarEvent.cs:54-70,231-249 — the activating player must remain alive inside the altar radius. -->
    <p class="max-w-2xl text-pretty text-sm text-muted-foreground">
      At an altar, the player who used the offering must stay alive in the event
      area. The attempt ends if that player leaves or dies, even if other
      players remain.
    </p>
  </section>
</div>

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
  import MapLink from "$lib/components/MapLink.svelte";
  import { TRAP_TYPE_LABELS, type TrapType } from "$lib/constants/traps";
  import type { TrapListView } from "$lib/queries/traps.server";
  import Castle from "@lucide/svelte/icons/castle";
  import Trees from "@lucide/svelte/icons/trees";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";

  let { data } = $props();

  const PAGE_SIZE = 20;

  const typeOptions = Object.entries(TRAP_TYPE_LABELS).map(
    ([value, label]) => ({ value: value as TrapType, label }),
  );

  const uniqueZones = $derived(
    Array.from(new Map(data.traps.map((t) => [t.zone_id, t])).values()).sort(
      (a, b) => a.zone_name.localeCompare(b.zone_name),
    ),
  );

  const uniqueEffects = $derived(
    Array.from(
      new Map(
        data.traps
          .filter((t) => t.effect_skill_id && t.effect_skill_name)
          .map((t) => [t.effect_skill_id, t.effect_skill_name] as const),
      ).entries(),
    ).sort((a, b) => a[1]!.localeCompare(b[1]!)),
  );

  const columns: ColumnDef<TrapListView>[] = [
    {
      id: "name",
      header: "Name",
      minSize: 180,
      enableHiding: false,
    },
    {
      id: "type",
      header: "Type",
      size: 170,
      accessorFn: (row) => TRAP_TYPE_LABELS[row.type],
      getUniqueValues: (row) => [row.type],
      filterFn: (row, _columnId, filterValue: string[]) => {
        if (!filterValue || filterValue.length === 0) return true;
        return filterValue.includes(row.original.type);
      },
    },
    {
      id: "zone",
      header: "Zone",
      minSize: 180,
      accessorFn: (row) => row.zone_name,
      getUniqueValues: (row) => [row.zone_id],
      filterFn: (row, _columnId, filterValue: string[]) => {
        if (!filterValue || filterValue.length === 0) return true;
        return filterValue.includes(row.original.zone_id);
      },
    },
    {
      id: "sub_zone",
      header: "Area",
      minSize: 200,
      accessorFn: (row) => row.sub_zone_name ?? "",
    },
    {
      id: "effect",
      header: "Effect",
      minSize: 180,
      accessorFn: (row) => row.effect_skill_name ?? "",
      getUniqueValues: (row) =>
        row.effect_skill_id ? [row.effect_skill_id] : [],
      filterFn: (row, _columnId, filterValue: string[]) => {
        if (!filterValue || filterValue.length === 0) return true;
        const effectId = row.original.effect_skill_id;
        return effectId != null && filterValue.includes(effectId);
      },
    },
    {
      id: "teleport",
      header: "Teleports To",
      minSize: 150,
      accessorFn: (row) => row.teleport_zone_name ?? "",
    },
    {
      id: "fire_interval",
      header: "Interval",
      size: 110,
      accessorFn: (row) => row.fire_interval ?? 0,
    },
    {
      id: "size",
      header: "Area Size",
      size: 110,
      enableSorting: false,
    },
    {
      id: "location",
      header: "Location",
      size: 90,
      enableSorting: false,
    },
  ];

  const columnLabels: Record<string, string> = {
    name: "Name",
    type: "Type",
    zone: "Zone",
    sub_zone: "Area",
    effect: "Effect",
    teleport: "Teleports To",
    fire_interval: "Interval",
    size: "Area Size",
    location: "Location",
  };
</script>

{#snippet renderToolbar({ table }: { table: TanstackTable<TrapListView> })}
  {@const typeCol = table.getColumn("type")}
  {@const zoneCol = table.getColumn("zone")}
  {@const effectCol = table.getColumn("effect")}
  {#if typeCol}
    <DataTableFacetedFilter
      column={typeCol}
      title="Type"
      options={typeOptions}
    />
  {/if}
  {#if zoneCol}
    <DataTableFacetedFilter
      column={zoneCol}
      title="Zone"
      options={uniqueZones.map((trap) => ({
        label: trap.zone_name,
        value: trap.zone_id,
      }))}
    />
  {/if}
  {#if effectCol}
    <DataTableFacetedFilter
      column={effectCol}
      title="Effect"
      options={uniqueEffects.map(([id, name]) => ({
        label: name!,
        value: id!,
      }))}
    />
  {/if}
{/snippet}

{#snippet renderHeader({ header }: { header: Header<TrapListView, unknown> })}
  {columnLabels[header.id] ?? header.id}
{/snippet}

{#snippet renderCell({
  cell,
  row,
}: {
  cell: Cell<TrapListView, unknown>;
  row: Row<TrapListView>;
})}
  {#if cell.column.id === "name"}
    {row.original.name}
  {:else if cell.column.id === "zone"}
    <IconBadge
      href="/zones/{row.original.zone_id}"
      icon={row.original.is_dungeon ? Castle : Trees}
      iconClass={row.original.is_dungeon ? "text-purple-500" : "text-green-500"}
    >
      {row.original.zone_name}
    </IconBadge>
  {:else if cell.column.id === "sub_zone"}
    {#if row.original.sub_zone_name}
      {row.original.sub_zone_name}
    {:else}
      <span class="text-muted-foreground">-</span>
    {/if}
  {:else if cell.column.id === "effect"}
    {#if row.original.effect_skill_id && row.original.effect_skill_name}
      <a
        href="/skills/{row.original.effect_skill_id}"
        class="text-blue-600 dark:text-blue-400 hover:underline"
      >
        {row.original.effect_skill_name}
      </a>
    {:else}
      <span class="text-muted-foreground">-</span>
    {/if}
  {:else if cell.column.id === "teleport"}
    {#if row.original.teleport_zone_id && row.original.teleport_zone_name}
      <a
        href="/zones/{row.original.teleport_zone_id}"
        class="text-blue-600 dark:text-blue-400 hover:underline"
      >
        {row.original.teleport_zone_name}
      </a>
    {:else}
      <span class="text-muted-foreground">-</span>
    {/if}
  {:else if cell.column.id === "fire_interval"}
    {#if row.original.fire_interval != null}
      {row.original.fire_interval}s
    {:else}
      <span class="text-muted-foreground">-</span>
    {/if}
  {:else if cell.column.id === "size"}
    {#if row.original.trap_width != null && row.original.trap_height != null}
      {row.original.trap_width} × {row.original.trap_height}
    {:else}
      <span class="text-muted-foreground">-</span>
    {/if}
  {:else if cell.column.id === "location"}
    {#if row.original.position_x != null && row.original.position_y != null}
      <MapLink entityId={row.original.id} entityType="trap" compact />
    {:else}
      <span class="text-muted-foreground">-</span>
    {/if}
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

<Seo
  title="Traps — Ancient Kingdoms"
  description={`${data.traps.length.toLocaleString()} traps across Ancient Kingdoms, with trap kinds, effects, teleport destinations, and mapped locations.`}
  path="/traps"
/>

<div class="container mx-auto p-8 space-y-8">
  <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Traps" }]} />

  <h1 class="text-3xl font-bold flex items-center gap-3">
    <TriangleAlert class="h-8 w-8 text-rose-600" />
    Traps ({data.traps.length})
  </h1>

  <DataTable
    data={data.traps}
    {columns}
    {columnLabels}
    {renderCell}
    {renderHeader}
    {renderToolbar}
    pageSize={PAGE_SIZE}
    initialSorting={[{ id: "zone", desc: false }]}
    initialColumnVisibility={{
      size: false,
      fire_interval: false,
      teleport: false,
    }}
    urlKey="traps"
    showPagination={true}
    showSearch={true}
    showColumnToggle={true}
    zebraStripe={true}
    paginateStaticHtml={true}
    searchPlaceholder="Search traps..."
    class="bg-muted/30"
  />
</div>

<script lang="ts">
  import { formatNumber } from "$lib/utils/format";
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
  import TrapMechanics from "$lib/components/TrapMechanics.svelte";
  import TrapEffect from "$lib/components/TrapEffect.svelte";
  import { TRAP_TYPE_LABELS, type TrapType } from "$lib/constants/traps";
  import type { TrapListRow as TrapRow } from "$lib/queries/traps.server";
  import Castle from "@lucide/svelte/icons/castle";
  import Trees from "@lucide/svelte/icons/trees";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";

  let { data } = $props();

  const PAGE_SIZE = 20;
  const trapCount = $derived(
    data.traps.reduce((total, trap) => total + trap.count, 0),
  );

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

  const columns: ColumnDef<TrapRow>[] = [
    {
      id: "effect",
      header: "Effect",
      size: 360,
      enableHiding: false,
      accessorFn: (row) =>
        row.effect_skill_name ?? row.teleport_zone_name ?? "Unknown effect",
      getUniqueValues: (row) =>
        row.effect_skill_id ? [row.effect_skill_id] : [],
      filterFn: (row, _columnId, filterValue: string[]) => {
        if (!filterValue || filterValue.length === 0) return true;
        const effectId = row.original.effect_skill_id;
        return effectId != null && filterValue.includes(effectId);
      },
    },
    {
      id: "mechanics",
      header: "Mechanics",
      minSize: 280,
      accessorFn: (row) =>
        [TRAP_TYPE_LABELS[row.type], row.fire_interval, row.name]
          .filter((value) => value != null)
          .join(" "),
    },
    {
      id: "type",
      header: "Type",
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
      size: 210,
      accessorFn: (row) => row.zone_name,
      getUniqueValues: (row) => [row.zone_id],
      filterFn: (row, _columnId, filterValue: string[]) => {
        if (!filterValue || filterValue.length === 0) return true;
        return filterValue.includes(row.original.zone_id);
      },
    },
    {
      id: "location",
      header: "Location",
      size: 90,
      enableSorting: false,
    },
  ];

  const columnLabels: Record<string, string> = {
    effect: "Effect",
    mechanics: "Mechanics",
    type: "Type",
    zone: "Zone",
    location: "Location",
  };
</script>

{#snippet renderToolbar({ table }: { table: TanstackTable<TrapRow> })}
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

{#snippet renderHeader({ header }: { header: Header<TrapRow, unknown> })}
  {columnLabels[header.id] ?? header.id}
{/snippet}

{#snippet renderCell({
  cell,
  row,
}: {
  cell: Cell<TrapRow, unknown>;
  row: Row<TrapRow>;
})}
  {#if cell.column.id === "effect"}
    <TrapEffect
      effectSkillId={row.original.effect_skill_id}
      effectSkillName={row.original.effect_skill_name}
      teleportZoneId={row.original.teleport_zone_id}
      teleportZoneName={row.original.teleport_zone_name}
    />
    {#if row.original.count > 1}
      <span class="text-muted-foreground"
        >&nbsp;({formatNumber(row.original.count)} traps)</span
      >
    {/if}
  {:else if cell.column.id === "mechanics"}
    <TrapMechanics
      type={row.original.type}
      fireInterval={row.original.fire_interval}
      compact
    />
  {:else if cell.column.id === "zone"}
    <IconBadge
      href="/zones/{row.original.zone_id}"
      icon={row.original.is_dungeon ? Castle : Trees}
      iconClass={row.original.is_dungeon ? "text-purple-500" : "text-green-500"}
    >
      {row.original.zone_name}
    </IconBadge>
  {:else if cell.column.id === "location"}
    {#if row.original.position_x != null && row.original.position_y != null}
      <MapLink entityId={row.original.id} entityType="trap" compact />
    {:else}
      <span class="text-muted-foreground">No in-game map</span>
    {/if}
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

<Seo
  title="Traps - Ancient Kingdoms"
  description={`${formatNumber(trapCount)} traps by zone, with effects, teleport destinations, and map locations where an in-game map is available.`}
  path="/traps"
/>

<div class="container mx-auto p-8 space-y-8">
  <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Traps" }]} />

  <h1 class="text-3xl font-bold flex items-center gap-3">
    <TriangleAlert class="h-8 w-8 text-rose-600" />
    Traps
  </h1>
  <p class="text-muted-foreground">
    Disarmable traps trigger when you step on them. A Rogue with
    <a
      href="/skills/detect_traps"
      class="text-blue-600 dark:text-blue-400 hover:underline">Detect Traps</a
    >
    or a Bard with
    <a
      href="/skills/sharp_senses"
      class="text-blue-600 dark:text-blue-400 hover:underline">Sharp Senses</a
    >
    can disarm them. An active Rogue or Bard mercenary disarms them automatically.
  </p>

  <DataTable
    data={data.traps}
    {columns}
    {columnLabels}
    {renderCell}
    {renderHeader}
    {renderToolbar}
    pageSize={PAGE_SIZE}
    initialSorting={[{ id: "zone", desc: false }]}
    initialColumnVisibility={{ type: false }}
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

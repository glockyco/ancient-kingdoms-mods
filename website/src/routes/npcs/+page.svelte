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
  import RoleBadges from "$lib/components/RoleBadges.svelte";
  import type { NpcZoneInfo } from "$lib/types/npcs";
  import {
    ROLE_CONFIG,
    getActiveRoles,
    getActiveRoleKeys,
  } from "$lib/utils/roles";
  import Castle from "@lucide/svelte/icons/castle";
  import Trees from "@lucide/svelte/icons/trees";

  let { data } = $props();

  const PAGE_SIZE = 20;

  // Build zone lookup for each NPC
  const npcZoneMap = $derived.by(() => {
    const map = new SvelteMap<string, NpcZoneInfo[]>();
    for (const nz of data.npcZones) {
      if (!map.has(nz.npc_id)) {
        map.set(nz.npc_id, []);
      }
      map.get(nz.npc_id)!.push(nz);
    }
    return map;
  });

  // Get unique zones for filter options
  const uniqueZones = $derived(
    Array.from(
      new Map(data.npcZones.map((nz) => [nz.zone_id, nz])).values(),
    ).sort((a, b) => a.zone_name.localeCompare(b.zone_name)),
  );

  // Get unique factions for filter options
  const uniqueFactions = $derived(
    Array.from(
      new Set(
        data.npcs.map((n) => n.faction).filter((f): f is string => f !== null),
      ),
    ).sort(),
  );

  // Add virtual columns for filtering
  const dataWithVirtual = data.npcs.map((n) => ({
    ...n,
    zones: npcZoneMap.get(n.id) || [],
    zone_ids: Array.from(
      new Set((npcZoneMap.get(n.id) || []).map((z) => z.zone_id)),
    ),
    role_keys: getActiveRoleKeys(n.roles),
    faction_filter: n.faction || "",
  }));

  type NpcRow = (typeof dataWithVirtual)[number];

  const columns: ColumnDef<NpcRow>[] = [
    {
      accessorKey: "name",
      header: "Name",
      enableHiding: false,
      minSize: 180,
    },
    {
      accessorKey: "faction",
      header: "Faction",
      size: 170,
    },
    {
      accessorKey: "race",
      header: "Race",
      size: 120,
    },
    {
      id: "roles",
      header: "Roles",
      size: 330,
      enableSorting: false,
      accessorFn: (row) =>
        getActiveRoles(row.roles)
          .map((role) => role.label)
          .join(" "),
    },
    {
      id: "zones",
      header: "Zone",
      size: 200,
      enableSorting: false,
      accessorFn: (row) => row.zones.map((z) => z.zone_name).join(" "),
    },
    {
      id: "zone_ids",
      accessorKey: "zone_ids",
      header: "Zone Filter",
      enableHiding: false,
      getUniqueValues: (row) => row.zone_ids,
      filterFn: (row, columnId, filterValue: string[]) => {
        const zoneIds = row.getValue(columnId) as string[];
        if (!filterValue || filterValue.length === 0) return true;
        return zoneIds.some((z) => filterValue.includes(z));
      },
    },
    {
      id: "role_keys",
      accessorKey: "role_keys",
      header: "Role Filter",
      enableHiding: false,
      getUniqueValues: (row) => row.role_keys,
      filterFn: (row, columnId, filterValue: string[]) => {
        const roleKeys = row.getValue(columnId) as string[];
        if (!filterValue || filterValue.length === 0) return true;
        return roleKeys.some((r) => filterValue.includes(r));
      },
    },
    {
      id: "faction_filter",
      accessorKey: "faction_filter",
      header: "Faction Filter",
      enableHiding: false,
      filterFn: (row, columnId, filterValue: string[]) => {
        const faction = row.getValue(columnId) as string;
        if (!filterValue || filterValue.length === 0) return true;
        return filterValue.includes(faction);
      },
    },
  ];

  const columnLabels: Record<string, string> = {
    name: "Name",
    faction: "Faction",
    race: "Race",
    roles: "Roles",
    zones: "Zone",
    zone_ids: "Zone Filter",
    role_keys: "Role Filter",
    faction_filter: "Faction Filter",
  };
</script>

{#snippet renderHeader({ header }: { header: Header<NpcRow, unknown> })}
  {#if header.id === "zone_ids" || header.id === "role_keys" || header.id === "faction_filter"}
    <span></span>
  {:else}
    {columnLabels[header.id] ?? header.id}
  {/if}
{/snippet}

{#snippet renderCell({
  cell,
  row,
}: {
  cell: Cell<NpcRow, unknown>;
  row: Row<NpcRow>;
})}
  {#if cell.column.id === "name"}
    <a
      href="/npcs/{row.original.id}"
      class="text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
    >
      {row.original.name}
    </a>
  {:else if cell.column.id === "faction"}
    <span class="whitespace-nowrap">{row.original.faction || "-"}</span>
  {:else if cell.column.id === "race"}
    <span class="whitespace-nowrap">{row.original.race || "-"}</span>
  {:else if cell.column.id === "roles"}
    <RoleBadges roles={row.original.roles} />
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
  {:else if cell.column.id === "zone_ids" || cell.column.id === "role_keys" || cell.column.id === "faction_filter"}
    <!-- Hidden filter columns -->
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderToolbar({ table }: { table: TanstackTable<NpcRow> })}
  {@const factionCol = table.getColumn("faction_filter")}
  {@const roleKeysCol = table.getColumn("role_keys")}
  {@const zoneIdsCol = table.getColumn("zone_ids")}
  {#if factionCol}
    <DataTableFacetedFilter
      column={factionCol}
      title="Faction"
      options={uniqueFactions.map((f) => ({
        label: f,
        value: f,
      }))}
    />
  {/if}
  {#if roleKeysCol}
    <DataTableFacetedFilter
      column={roleKeysCol}
      title="Role"
      options={ROLE_CONFIG.map((r) => ({
        label: r.label,
        value: r.key,
      })).sort((a, b) => a.label.localeCompare(b.label))}
    />
  {/if}
  {#if zoneIdsCol}
    <DataTableFacetedFilter
      column={zoneIdsCol}
      title="Zone"
      options={uniqueZones.map((z) => ({
        label: z.zone_name,
        value: z.zone_id,
      }))}
    />
  {/if}
{/snippet}

<svelte:head>
  <title>NPCs - Ancient Kingdoms Compendium</title>
  <meta
    name="description"
    content="All NPCs in Ancient Kingdoms - merchants, quest givers, trainers, and services across every zone."
  />
</svelte:head>

<div class="container mx-auto p-8 space-y-6">
  <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "NPCs" }]} />

  <h1 class="text-3xl font-bold">NPCs</h1>

  <DataTable
    data={dataWithVirtual}
    {columns}
    {columnLabels}
    {renderCell}
    {renderHeader}
    {renderToolbar}
    pageSize={PAGE_SIZE}
    initialSorting={[{ id: "name", desc: false }]}
    initialColumnVisibility={{
      zone_ids: false,
      role_keys: false,
      faction_filter: false,
    }}
    urlKey="npcs"
    showPagination={true}
    showSearch={true}
    showColumnToggle={true}
    zebraStripe={true}
    paginateStaticHtml={true}
    searchPlaceholder="Search NPCs..."
    class="bg-muted/30"
  />
</div>

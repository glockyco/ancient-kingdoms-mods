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
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import type { MonsterZoneInfo } from "$lib/types/monsters";
  import Crown from "@lucide/svelte/icons/crown";
  import Shield from "@lucide/svelte/icons/shield";
  import Sword from "@lucide/svelte/icons/sword";
  import Castle from "@lucide/svelte/icons/castle";
  import Trees from "@lucide/svelte/icons/trees";

  let { data } = $props();

  const PAGE_SIZE = 20;

  // Build zone lookup for each monster (computed once)
  const monsterZoneMap = $derived.by(() => {
    const map = new SvelteMap<string, MonsterZoneInfo[]>();
    for (const mz of data.monsterZones) {
      if (!map.has(mz.monster_id)) {
        map.set(mz.monster_id, []);
      }
      map.get(mz.monster_id)!.push(mz);
    }
    return map;
  });

  // Get unique zones for filter options
  const uniqueZones = $derived(
    Array.from(
      new Map(data.monsterZones.map((mz) => [mz.zone_id, mz])).values(),
    ).sort((a, b) => a.zone_name.localeCompare(b.zone_name)),
  );

  // Determine classification string for faceted filter
  function getClassification(m: (typeof data.monsters)[0]): string {
    if (m.is_boss) return "boss";
    if (m.is_elite) return "elite";
    return "regular";
  }

  // Add virtual columns for filtering (computed once)
  const dataWithVirtual = data.monsters.map((m) => ({
    ...m,
    classification: getClassification(m),
    zones: monsterZoneMap.get(m.id) || [],
    zone_ids: Array.from(
      new Set((monsterZoneMap.get(m.id) || []).map((z) => z.zone_id)),
    ),
  }));

  type MonsterRow = (typeof dataWithVirtual)[number];

  const columns: ColumnDef<MonsterRow>[] = [
    {
      id: "icon",
      header: "",
      size: 50,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: "Name",
      enableHiding: false,
      minSize: 220,
    },
    {
      accessorKey: "level",
      header: "Level",
      size: 150,
    },
    {
      accessorKey: "health",
      header: "Health",
      size: 150,
    },
    {
      accessorKey: "damage",
      header: "Damage",
      size: 150,
    },
    {
      accessorKey: "magic_damage",
      header: "Magic Dmg",
      size: 180,
    },
    {
      accessorKey: "defense",
      header: "Defense",
      size: 150,
    },
    {
      accessorKey: "magic_resist",
      header: "Magic Res",
      size: 150,
    },
    {
      accessorKey: "poison_resist",
      header: "Poison Res",
      size: 150,
    },
    {
      accessorKey: "fire_resist",
      header: "Fire Res",
      size: 150,
    },
    {
      accessorKey: "cold_resist",
      header: "Cold Res",
      size: 150,
    },
    {
      accessorKey: "disease_resist",
      header: "Disease Res",
      size: 150,
    },
    {
      id: "respawn_time",
      header: "Respawn",
      size: 120,
      accessorFn: (row) => {
        if (row.no_respawn) return null;
        const total = row.death_time + row.respawn_time;
        return total === 0 ? null : total;
      },
      sortUndefined: "last",
    },
    {
      id: "respawn_chance",
      header: "Chance",
      size: 120,
      accessorFn: (row) =>
        row.respawn_probability === 1 ? -1 : row.respawn_probability,
    },
    {
      id: "special",
      header: "Special",
      size: 130,
      accessorFn: (row) => {
        if (row.spawn_time_start !== 0 || row.spawn_time_end !== 0) return 1;
        if (row.special_spawn_type === "altar") return 2;
        if (row.special_spawn_type === "summon") return 3;
        if (row.special_spawn_type === "placeholder") return 4;
        return 0;
      },
    },
    {
      id: "zones",
      header: "Zones",
      size: 230,
      enableSorting: false,
    },
    {
      id: "classification",
      accessorKey: "classification",
      header: "Class",
      enableHiding: false,
      filterFn: (row, columnId, filterValue: string[]) => {
        const value = row.getValue(columnId) as string;
        if (!filterValue || filterValue.length === 0) return true;
        return filterValue.includes(value);
      },
    },
    {
      id: "zone_ids",
      accessorKey: "zone_ids",
      header: "Zone Filter",
      enableHiding: false,
      filterFn: (row, columnId, filterValue: string[]) => {
        const zoneIds = row.getValue(columnId) as string[];
        if (!filterValue || filterValue.length === 0) return true;
        return zoneIds.some((z) => filterValue.includes(z));
      },
    },
  ];

  const columnLabels: Record<string, string> = {
    icon: "",
    name: "Name",
    level: "Level",
    health: "Health",
    damage: "Damage",
    magic_damage: "Magic Damage",
    defense: "Defense",
    magic_resist: "Magic Resist",
    poison_resist: "Poison Resist",
    fire_resist: "Fire Resist",
    cold_resist: "Cold Resist",
    disease_resist: "Disease Resist",
    respawn_time: "Respawn",
    respawn_chance: "Chance",
    special: "Special",
    zones: "Zones",
    classification: "Classification",
    zone_ids: "Zone Filter",
  };

  function formatRespawnTime(row: MonsterRow): string {
    if (row.no_respawn) return "-";
    const totalSeconds = row.death_time + row.respawn_time;
    if (totalSeconds === 0) return "-";
    const minutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0
        ? `${hours}h ${remainingMinutes}m`
        : `${hours}h`;
    }
    return `${minutes}m`;
  }

  function formatChance(row: MonsterRow): string {
    if (row.no_respawn) return "-";
    if (row.respawn_probability === 1) return "-";
    return `${Math.round(row.respawn_probability * 100)}%`;
  }

  function formatSpecial(row: MonsterRow): string {
    if (row.spawn_time_start !== 0 || row.spawn_time_end !== 0) {
      return `${row.spawn_time_start}:00-${row.spawn_time_end}:00`;
    }
    if (row.special_spawn_type === "altar") return "Altar";
    if (row.special_spawn_type === "summon") return "Blocked";
    if (row.special_spawn_type === "placeholder") return "On Death";
    return "-";
  }

  function formatNumber(n: number): string {
    return n.toLocaleString();
  }
</script>

{#snippet renderHeader({ header }: { header: Header<MonsterRow, unknown> })}
  {#if header.id === "icon" || header.id === "classification" || header.id === "zone_ids"}
    <span></span>
  {:else if header.id === "level" || header.id === "health" || header.id === "damage" || header.id === "magic_damage" || header.id === "defense" || header.id === "magic_resist" || header.id === "poison_resist" || header.id === "fire_resist" || header.id === "cold_resist" || header.id === "disease_resist" || header.id === "respawn_time" || header.id === "respawn_chance" || header.id === "special"}
    <span class="ml-auto">{columnLabels[header.id] ?? header.id}</span>
  {:else}
    {columnLabels[header.id] ?? header.id}
  {/if}
{/snippet}

{#snippet renderCell({
  cell,
  row,
}: {
  cell: Cell<MonsterRow, unknown>;
  row: Row<MonsterRow>;
})}
  {#if cell.column.id === "icon"}
    {@const color = row.original.is_boss
      ? "text-cyan-600 dark:text-cyan-400"
      : row.original.is_elite
        ? "text-purple-600 dark:text-purple-400"
        : "text-red-600 dark:text-red-400"}
    <div class="flex justify-center">
      {#if row.original.is_boss}
        <Crown class="h-4 w-4 {color}" />
      {:else if row.original.is_elite}
        <Shield class="h-4 w-4 {color}" />
      {:else}
        <Sword class="h-4 w-4 {color}" />
      {/if}
    </div>
  {:else if cell.column.id === "name"}
    <a
      href="/monsters/{row.original.id}"
      class="text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
    >
      {row.original.name}
    </a>
  {:else if cell.column.id === "level"}
    <span class="ml-auto">{row.original.level}</span>
  {:else if cell.column.id === "health" || cell.column.id === "damage" || cell.column.id === "magic_damage" || cell.column.id === "defense" || cell.column.id === "magic_resist" || cell.column.id === "poison_resist" || cell.column.id === "fire_resist" || cell.column.id === "cold_resist" || cell.column.id === "disease_resist"}
    <span class="ml-auto">{formatNumber(cell.getValue() as number)}</span>
  {:else if cell.column.id === "respawn_time"}
    <span class="ml-auto whitespace-nowrap"
      >{formatRespawnTime(row.original)}</span
    >
  {:else if cell.column.id === "respawn_chance"}
    <span class="ml-auto">{formatChance(row.original)}</span>
  {:else if cell.column.id === "special"}
    <span class="ml-auto whitespace-nowrap">{formatSpecial(row.original)}</span>
  {:else if cell.column.id === "zones"}
    {@const zones = row.original.zones}
    <div class="flex gap-1 whitespace-nowrap">
      {#if zones.length > 0}
        <a
          href="/zones/{zones[0].zone_id}"
          class="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-0.5 text-xs transition-colors hover:bg-muted"
        >
          {#if zones[0].is_dungeon}
            <Castle class="h-3 w-3 text-purple-500" />
          {:else}
            <Trees class="h-3 w-3 text-green-500" />
          {/if}
          {zones[0].zone_name}
        </a>
        {#if zones.length > 1}
          <span class="text-muted-foreground text-xs self-center"
            >+{zones.length - 1}</span
          >
        {/if}
      {:else}
        <span class="text-muted-foreground">-</span>
      {/if}
    </div>
  {:else if cell.column.id === "classification" || cell.column.id === "zone_ids"}
    <!-- Hidden filter columns -->
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderToolbar({ table }: { table: TanstackTable<MonsterRow> })}
  {@const classificationCol = table.getColumn("classification")}
  {@const zoneIdsCol = table.getColumn("zone_ids")}
  {#if classificationCol}
    <DataTableFacetedFilter
      column={classificationCol}
      title="Classification"
      options={[
        { label: "Boss", value: "boss" },
        { label: "Elite", value: "elite" },
        { label: "Regular", value: "regular" },
      ]}
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
  <title>Monsters - Ancient Kingdoms Compendium</title>
  <meta
    name="description"
    content="Browse all monsters in Ancient Kingdoms. Filter by level, classification, and zone. View stats and spawn locations."
  />
</svelte:head>

<div class="container mx-auto p-8 space-y-6">
  <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Monsters" }]} />

  <h1 class="text-3xl font-bold">Monsters</h1>

  <DataTable
    data={dataWithVirtual}
    {columns}
    {columnLabels}
    {renderCell}
    {renderHeader}
    {renderToolbar}
    pageSize={PAGE_SIZE}
    initialSorting={[
      { id: "level", desc: true },
      { id: "health", desc: true },
      { id: "name", desc: false },
    ]}
    initialColumnVisibility={{
      damage: false,
      magic_damage: false,
      defense: false,
      magic_resist: false,
      poison_resist: false,
      fire_resist: false,
      cold_resist: false,
      disease_resist: false,
      classification: false,
      zone_ids: false,
    }}
    urlKey="monsters"
    showPagination={true}
    showSearch={true}
    showColumnToggle={true}
    zebraStripe={true}
    paginateStaticHtml={true}
    searchPlaceholder="Search monsters..."
    class="bg-muted/30"
  />
</div>

<script lang="ts">
  import { formatNumber } from "$lib/utils/format";
  import { statName, formatStat } from "$lib/stats";
  import type { StatId } from "$lib/generated/stat-vocabulary";
  import Skull from "@lucide/svelte/icons/skull";
  import EntityLink from "$lib/components/EntityLink.svelte";
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
  import Seo from "$lib/components/Seo.svelte";
  import JsonLd from "$lib/components/JsonLd.svelte";
  import { buildCollectionPage } from "$lib/seo/jsonld";
  import MonsterTypeIcon from "$lib/components/MonsterTypeIcon.svelte";
  import type { MonsterZoneInfo } from "$lib/types/monsters";
  import {
    createRespawnColumns,
    isRespawnColumn,
    RespawnCells,
  } from "$lib/components/monster-table";
  import Castle from "@lucide/svelte/icons/castle";
  import Trees from "@lucide/svelte/icons/trees";

  let { data } = $props();

  const collectionNode = $derived(
    buildCollectionPage({
      path: "/monsters",
      name: "Monsters — Ancient Kingdoms Compendium",
      description: `Searchable database of ${formatNumber(data.monsters.length)} monsters in Ancient Kingdoms.`,
      items: data.monsters.map((monster) => ({
        name: monster.name,
        path: `/monsters/${monster.id}`,
      })),
    }),
  );

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
    if (m.is_fabled) return "fabled";
    if (m.is_boss) return "boss";
    if (m.is_elite) return "elite";
    return "regular";
  }

  // Add virtual columns for filtering
  const dataWithVirtual = $derived(
    data.monsters.map((m) => ({
      ...m,
      classification: getClassification(m),
      zones: monsterZoneMap.get(m.id) || [],
      zone_ids: Array.from(
        new Set((monsterZoneMap.get(m.id) || []).map((z) => z.zone_id)),
      ),
    })),
  );

  type MonsterRow = (typeof dataWithVirtual)[number];
  const columnStats: Record<string, StatId> = {
    health: "health",
    damage: "attack_power",
    magic_damage: "spell_power",
    defense: "armor_class",
    magic_resist: "magic_resist",
    poison_resist: "poison_resist",
    fire_resist: "fire_resist",
    cold_resist: "cold_resist",
    disease_resist: "disease_resist",
  };

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
      accessorKey: "level_min",
      header: "Level",
      size: 150,
      filterFn: (
        row,
        _columnId,
        filterValue: [number | null, number | null],
      ) => {
        const value = row.getValue("level_min") as number;
        if (!filterValue) return true;
        const [min, max] = filterValue;
        if (min === null && max === null) return true;
        if (min !== null && value < min) return false;
        if (max !== null && value > max) return false;
        return true;
      },
    },
    {
      accessorKey: "health",
      header: statName(columnStats.health),
      size: 150,
    },
    {
      accessorKey: "damage",
      header: statName(columnStats.damage),
      size: 150,
    },
    {
      accessorKey: "magic_damage",
      header: statName(columnStats.magic_damage),
      size: 180,
    },
    {
      accessorKey: "defense",
      header: statName(columnStats.defense),
      size: 150,
    },
    {
      accessorKey: "magic_resist",
      header: statName(columnStats.magic_resist),
      size: 150,
    },
    {
      accessorKey: "poison_resist",
      header: statName(columnStats.poison_resist),
      size: 150,
    },
    {
      accessorKey: "fire_resist",
      header: statName(columnStats.fire_resist),
      size: 150,
    },
    {
      accessorKey: "cold_resist",
      header: statName(columnStats.cold_resist),
      size: 150,
    },
    {
      accessorKey: "disease_resist",
      header: statName(columnStats.disease_resist),
      size: 150,
    },
    ...createRespawnColumns<MonsterRow>(),
    {
      id: "zones",
      header: "Zones",
      size: 230,
      enableSorting: false,
      accessorFn: (row) => row.zones.map((z) => z.zone_name).join(" "),
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
      getUniqueValues: (row) => row.zone_ids,
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
    level_min: "Level",
    ...Object.fromEntries(
      Object.entries(columnStats).map(([key, id]) => [key, statName(id)]),
    ),
    respawn_time: "Respawn",
    respawn_chance: "Chance",
    special: "Special",
    zones: "Zones",
    classification: "Classification",
    zone_ids: "Zone Filter",
  };
</script>

{#snippet renderHeader({ header }: { header: Header<MonsterRow, unknown> })}
  {#if header.id === "icon" || header.id === "classification" || header.id === "zone_ids"}
    <span></span>
  {:else if header.id === "level_min" || header.id === "health" || header.id === "damage" || header.id === "magic_damage" || header.id === "defense" || header.id === "magic_resist" || header.id === "poison_resist" || header.id === "fire_resist" || header.id === "cold_resist" || header.id === "disease_resist" || header.id === "respawn_time" || header.id === "respawn_chance" || header.id === "special"}
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
    <div class="flex justify-center">
      <MonsterTypeIcon
        isBoss={row.original.is_boss}
        isFabled={row.original.is_fabled}
        isElite={row.original.is_elite}
      />
    </div>
  {:else if cell.column.id === "name"}
    <EntityLink
      href="/monsters/{row.original.id}"
      name={row.original.name}
      variant="reference"
      domain="monster"
      entityId={row.original.id}
      imageKind="primary"
      imageAvailable={row.original.visual_public_path}
      fallback={Skull}
      size={32}
      class="flex whitespace-nowrap"
    />
  {:else if cell.column.id === "level_min"}
    {@const hasVariance = row.original.level_min !== row.original.level_max}
    <span class="ml-auto"
      >{row.original.level_min}<span class={hasVariance ? "" : "invisible"}
        >+</span
      ></span
    >
  {:else if cell.column.id === "health"}
    {@const hasVariance = row.original.level_min !== row.original.level_max}
    {@const minHealth =
      row.original.health_base +
      row.original.health_per_level * (row.original.level_min - 1)}
    <span class="ml-auto"
      >{formatStat("health", minHealth)}<span
        class={hasVariance ? "" : "invisible"}>+</span
      ></span
    >
  {:else if cell.column.id === "damage" || cell.column.id === "magic_damage" || cell.column.id === "defense" || cell.column.id === "magic_resist" || cell.column.id === "poison_resist" || cell.column.id === "fire_resist" || cell.column.id === "cold_resist" || cell.column.id === "disease_resist"}
    <span class="ml-auto"
      >{formatStat(
        columnStats[cell.column.id],
        cell.getValue() as number,
      )}</span
    >
  {:else if isRespawnColumn(cell.column.id)}
    <RespawnCells columnId={cell.column.id} row={row.original} />
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
  {:else if cell.column.id === "classification" || cell.column.id === "zone_ids"}
    <!-- Hidden filter columns -->
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderToolbar({ table }: { table: TanstackTable<MonsterRow> })}
  {@const classificationCol = table.getColumn("classification")}
  {@const zoneIdsCol = table.getColumn("zone_ids")}
  {@const levelCol = table.getColumn("level_min")}
  {#if classificationCol}
    <DataTableFacetedFilter
      column={classificationCol}
      title="Classification"
      options={[
        { label: "Boss", value: "boss" },
        { label: "Fabled", value: "fabled" },
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
  {#if levelCol}
    <DataTableRangeFilter column={levelCol} title="Level" />
  {/if}
{/snippet}

<Seo
  title="Monsters - Ancient Kingdoms"
  description={`${formatNumber(data.monsters.length)} monsters across Eratiath — bosses, elites, hunts, and regular spawns. Filter by level, type, or zone, then see drops, abilities, and respawn timers.`}
  path="/monsters"
/>

<JsonLd node={collectionNode} />

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
      { id: "level_min", desc: true },
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

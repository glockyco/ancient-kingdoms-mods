<script lang="ts">
  import Seo from "$lib/components/Seo.svelte";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import MasteryCurve from "$lib/components/professions/MasteryCurve.svelte";
  import ProfessionHeader from "$lib/components/professions/ProfessionHeader.svelte";
  import MonsterTypeIcon from "$lib/components/MonsterTypeIcon.svelte";
  import EntityReference from "$lib/components/EntityReference.svelte";
  import MapLink from "$lib/components/MapLink.svelte";
  import {
    DataTable,
    DataTableFacetedFilter,
    DataTableRangeFilter,
    type Cell,
    type ColumnDef,
    type Header,
    type Row,
    type TanstackTable,
  } from "$lib/components/ui/data-table";
  import {
    createRespawnColumns,
    isRespawnColumn,
    RespawnCells,
  } from "$lib/components/monster-table";
  import {
    PROFESSION_MECHANICS,
    thresholdedDamageReduction,
  } from "$lib/data/professions/mechanics";
  import type { SlayerTarget } from "./slayer-page-data.server";
  import Skull from "@lucide/svelte/icons/skull";

  let { data } = $props();

  const PAGE_SIZE = 20;

  const mechanics = PROFESSION_MECHANICS.slayer;
  let slayerLevel = $state(mechanics.damageReduction.thresholdPercent);
  const damageReduction = $derived(
    thresholdedDamageReduction(mechanics.damageReduction, slayerLevel),
  );
  const damageCurve = [
    {
      id: "slayer_reduction",
      label: "Damage reduction",
      chanceAt: (skillPercent: number) =>
        thresholdedDamageReduction(mechanics.damageReduction, skillPercent),
    },
  ];

  const sections = [
    { id: "how-it-works", label: "How Slayer works" },
    { id: "payoff", label: "Damage reduction" },
    { id: "mastery", label: "Mastery" },
    { id: "targets", label: "Targets" },
  ];

  function getClassification(target: SlayerTarget): string {
    if (target.is_world_boss) return "world_boss";
    if (target.is_fabled) return "fabled";
    if (target.is_boss) return "boss";
    return "elite";
  }

  const dataWithVirtual = $derived(
    data.targets.map((target) => ({
      ...target,
      classification: getClassification(target),
      zone_ids: [target.zone_id],
      requirement: requirementText(target),
    })),
  );

  type TargetRow = (typeof dataWithVirtual)[number];

  const uniqueZones = $derived(
    Array.from(
      new Map(data.targets.map((target) => [target.zone_id, target])).values(),
    ).sort((a, b) => a.zone_name.localeCompare(b.zone_name)),
  );

  // Source: server-scripts/Monster.cs:Awake — altar, summon, and placeholder
  // targets only appear after their own trigger, so the table names the trigger
  // instead of the generic spawn label.
  function requirementText(target: SlayerTarget): string {
    if (target.spawn_type === "altar") {
      const wave =
        target.source_altar_wave !== null
          ? `, wave ${target.source_altar_wave + 1}`
          : "";
      return `${target.source_altar_name ?? "Altar"}${wave}`;
    }
    if (target.spawn_type === "summon") {
      const count = target.source_summon_kill_count ?? 1;
      const plural = count > 1 ? "s" : "";
      return `Blocked while ${count} ${target.source_summon_kill_monster_name}${plural} alive`;
    }
    if (target.spawn_type === "placeholder") {
      const chance =
        target.source_spawn_probability !== null &&
        target.source_spawn_probability < 1
          ? ` (${(target.source_spawn_probability * 100).toFixed(0)}% chance)`
          : "";
      return `Appears after killing ${target.source_monster_name}${chance}`;
    }
    return "";
  }

  const columns: ColumnDef<TargetRow>[] = [
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
      size: 220,
      minSize: 220,
    },
    {
      accessorKey: "level_min",
      header: "Level",
      size: 90,
      filterFn: (
        row,
        _columnId,
        filterValue: [number | null, number | null],
      ) => {
        const value = row.getValue("level_min") as number;
        if (!filterValue) return true;
        const [min, max] = filterValue;
        if (min !== null && value < min) return false;
        if (max !== null && value > max) return false;
        return true;
      },
    },
    {
      id: "map",
      header: "Map",
      size: 80,
      enableSorting: false,
      enableGlobalFilter: false,
    },
    {
      id: "zones",
      header: "Zone",
      size: 220,
      minSize: 220,
      enableSorting: false,
      accessorFn: (row) => row.zone_name,
    },
    ...createRespawnColumns<TargetRow>().filter(
      (column) => column.id !== "special",
    ),
    {
      accessorKey: "requirement",
      header: "Requirement",
      size: 300,
      enableSorting: false,
    },
    {
      id: "classification",
      accessorKey: "classification",
      header: "Classification",
      enableHiding: false,
      filterFn: (row, columnId, filterValue: string[]) => {
        const value = row.getValue(columnId) as string;
        return !filterValue?.length || filterValue.includes(value);
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
        return (
          !filterValue?.length || zoneIds.some((z) => filterValue.includes(z))
        );
      },
    },
  ];

  const columnLabels: Record<string, string> = {
    icon: "",
    name: "Name",
    level_min: "Level",
    map: "Map",
    zones: "Zone",
    respawn_time: "Respawn",
    respawn_chance: "Chance",
    requirement: "Requirement",
    classification: "Classification",
    zone_ids: "Zone Filter",
  };
</script>

{#snippet renderHeader({ header }: { header: Header<TargetRow, unknown> })}
  {#if header.id === "icon" || header.id === "classification" || header.id === "zone_ids"}
    <span></span>
  {:else if header.id === "level_min" || isRespawnColumn(header.id)}
    <span class="ml-auto">{columnLabels[header.id] ?? header.id}</span>
  {:else}
    {columnLabels[header.id] ?? header.id}
  {/if}
{/snippet}

{#snippet renderCell({
  cell,
  row,
}: {
  cell: Cell<TargetRow, unknown>;
  row: Row<TargetRow>;
})}
  {@const target = row.original}
  {#if cell.column.id === "icon"}
    <div class="flex justify-center">
      <MonsterTypeIcon
        isBoss={target.is_boss}
        isFabled={target.is_fabled}
        isElite={target.is_elite}
      />
    </div>
  {:else if cell.column.id === "name"}
    <EntityReference
      href="/monsters/{target.id}"
      name={target.name}
      domain="monster"
      entityId={target.id}
      imageKind="primary"
      imageAvailable={target.visual_public_path}
      size={32}
      title={target.name}
      class="flex min-w-0 max-w-full"
      nameClass="truncate"
    />
  {:else if cell.column.id === "level_min"}
    {@const hasVariance = target.level_min !== target.level_max}
    <span class="ml-auto"
      >{target.level_min}<span class={hasVariance ? "" : "invisible"}>+</span
      ></span
    >
  {:else if cell.column.id === "map"}
    {#if target.position_x !== null && target.position_y !== null}
      <MapLink entityId={target.id} entityType="monster" compact />
    {:else}
      <span class="text-muted-foreground">-</span>
    {/if}
  {:else if cell.column.id === "zones"}
    <a
      href="/zones/{target.zone_id}"
      class="block truncate text-blue-600 hover:underline dark:text-blue-400"
      title={target.zone_name}
    >
      {target.zone_name}
    </a>
  {:else if cell.column.id === "requirement"}
    <span class="block truncate" title={target.requirement}>
      {#if target.spawn_type === "altar"}
        <a
          href="/altars/{target.source_altar_id}"
          class="text-blue-600 hover:underline dark:text-blue-400"
          >{target.source_altar_name}</a
        >{#if target.source_altar_wave !== null}, wave {target.source_altar_wave +
            1}{/if}
      {:else if target.spawn_type === "summon"}
        Blocked while {target.source_summon_kill_count}
        <a
          href="/monsters/{target.source_summon_kill_monster_id}"
          class="text-blue-600 hover:underline dark:text-blue-400"
          >{target.source_summon_kill_monster_name}{(target.source_summon_kill_count ??
            1) > 1
            ? "s"
            : ""}</a
        > alive
      {:else if target.spawn_type === "placeholder"}
        Appears after killing
        <a
          href="/monsters/{target.source_monster_id}"
          class="text-blue-600 hover:underline dark:text-blue-400"
          >{target.source_monster_name}</a
        >{#if target.source_spawn_probability !== null && target.source_spawn_probability < 1}
          ({(target.source_spawn_probability * 100).toFixed(0)}% chance){/if}
      {:else}
        <span class="text-muted-foreground">-</span>
      {/if}
    </span>
  {:else if isRespawnColumn(cell.column.id)}
    <RespawnCells columnId={cell.column.id} row={target} />
  {:else if cell.column.id === "classification" || cell.column.id === "zone_ids"}
    <!-- Hidden filter columns -->
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderToolbar({ table }: { table: TanstackTable<TargetRow> })}
  {@const classificationCol = table.getColumn("classification")}
  {@const zoneIdsCol = table.getColumn("zone_ids")}
  {@const levelCol = table.getColumn("level_min")}
  {#if classificationCol}
    <DataTableFacetedFilter
      column={classificationCol}
      title="Classification"
      options={[
        { label: "World boss", value: "world_boss" },
        { label: "Boss", value: "boss" },
        { label: "Fabled", value: "fabled" },
        { label: "Elite", value: "elite" },
      ]}
    />
  {/if}
  {#if zoneIdsCol}
    <DataTableFacetedFilter
      column={zoneIdsCol}
      title="Zone"
      options={uniqueZones.map((zone) => ({
        label: zone.zone_name,
        value: zone.zone_id,
      }))}
    />
  {/if}
  {#if levelCol}
    <DataTableRangeFilter column={levelCol} title="Level" />
  {/if}
{/snippet}

<Seo
  title={`${data.profession.name} - Ancient Kingdoms`}
  description={`Slayer reduces the damage that bosses and elites deal to you, up to 10% at full mastery. All ${data.targets.length} Slayer targets with levels, zones, spawn requirements, and respawn times.`}
  path="/professions/slayer"
/>

<div class="container mx-auto max-w-6xl space-y-10 p-8">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Professions", href: "/professions" },
      { label: data.profession.name },
    ]}
  />

  <ProfessionHeader
    profession={data.profession}
    icon={Skull}
    iconClass="text-red-500 dark:text-red-400"
    iconBackgroundClass="bg-red-500/10"
    {sections}
  >
    <!-- Source: server-scripts/Combat.cs:DealDamageAt -->
    <p>
      Defeat bosses and elites to increase Slayer mastery across your account.
      <strong class="font-semibold text-foreground"
        >From 10% Slayer, boss and elite attacks do less damage to you, your
        mercenaries, and your summons. At 100%, the reduction is 10%.</strong
      >
    </p>
  </ProfessionHeader>

  <section id="how-it-works" class="space-y-4">
    <h2 class="text-xl font-semibold">How Slayer works</h2>
    <ol class="divide-y divide-border">
      <!-- Source: server-scripts/Player.cs:UserCode_TargetRpcBossEliteApproach__NetworkIdentity -->
      <li class="grid grid-cols-[1.5rem_1fr] gap-3 py-3 first:pt-0">
        <span class="text-sm tabular-nums text-muted-foreground">1</span>
        <div>
          <p class="font-medium">Find a boss or an elite.</p>
          <p class="mt-0.5 text-pretty text-sm text-muted-foreground">
            Only these {data.targets.length} targets give Slayer mastery. When you
            come near one, your Bestiary adds it with zero kills.
          </p>
        </div>
      </li>
      <!-- Source: server-scripts/Monster.cs:OnDeath -->
      <li class="grid grid-cols-[1.5rem_1fr] gap-3 py-3">
        <span class="text-sm tabular-nums text-muted-foreground">2</span>
        <div>
          <p class="font-medium">Kill the target.</p>
          <p class="mt-0.5 text-pretty text-sm text-muted-foreground">
            The player with the highest aggro gets the kill credit. In a party,
            each nearby member also gets
            <a
              href="#mastery"
              class="text-blue-600 hover:underline dark:text-blue-400">credit</a
            >.
          </p>
        </div>
      </li>
      <!-- Source: server-scripts/Database.cs:CalculateSlayerLevelForAccount -->
      <li class="grid grid-cols-[1.5rem_1fr] gap-3 py-3">
        <span class="text-sm tabular-nums text-muted-foreground">3</span>
        <div>
          <p class="font-medium">Collect the mastery.</p>
          <p class="mt-0.5 text-pretty text-sm text-muted-foreground">
            Each credited kill adds 0.02 percentage points to
            <a
              href="#mastery"
              class="text-blue-600 hover:underline dark:text-blue-400"
              >account Slayer</a
            >. Only the first 50 kills of each target count. After that, find a
            new target.
          </p>
        </div>
      </li>
      <!-- Source: server-scripts/Combat.cs:DealDamageAt -->
      <li class="grid grid-cols-[1.5rem_1fr] gap-3 py-3">
        <span class="text-sm tabular-nums text-muted-foreground">4</span>
        <div>
          <p class="font-medium">Take less damage.</p>
          <p class="mt-0.5 text-pretty text-sm text-muted-foreground">
            From {mechanics.damageReduction.thresholdPercent}% mastery, every
            boss and elite deals
            <a
              href="#payoff"
              class="text-blue-600 hover:underline dark:text-blue-400"
              >less damage</a
            > to you. The reduction grows to 10% at full mastery.
          </p>
        </div>
      </li>
    </ol>
  </section>

  <section id="payoff" class="space-y-4">
    <h2 class="text-xl font-semibold">Damage reduction</h2>
    <p class="max-w-2xl text-balance text-sm text-muted-foreground">
      Slayer has no combat effect below 10%. From 10%, each point of mastery
      increases your protection against a boss or elite. The game applies this
      reduction before armor and elemental resistance.
    </p>

    <div class="space-y-5 rounded-lg border p-4 md:p-5">
      <div class="flex flex-wrap items-baseline gap-3">
        <label
          for="slayer-mastery"
          class="text-xs uppercase tracking-wider text-muted-foreground"
          >Slayer mastery</label
        >
        <input
          id="slayer-mastery"
          type="range"
          min="0"
          max={mechanics.capPercent}
          bind:value={slayerLevel}
          class="w-44 accent-red-500"
        />
        <output class="w-14 text-lg font-semibold tabular-nums"
          >{slayerLevel}%</output
        >
      </div>

      <MasteryCurve
        series={damageCurve}
        skillLevel={slayerLevel}
        ariaLabel="Slayer damage reduction against Slayer mastery"
        skillLabel="Slayer mastery"
        yMax={0.1}
        yTicks={[0, 0.025, 0.05, 0.075, 0.1]}
      />

      <p class="text-pretty text-sm text-muted-foreground">
        {#if slayerLevel < mechanics.damageReduction.thresholdPercent}
          At {slayerLevel}% mastery, a boss or elite deals full damage. The
          reduction starts at {mechanics.damageReduction.thresholdPercent}%.
        {:else}
          At {slayerLevel}% mastery, a boss or elite deals
          <strong class="font-semibold text-foreground"
            >{(damageReduction * 100).toFixed(1)}% less damage</strong
          > to you.
        {/if}
      </p>

      <details class="text-sm">
        <summary class="w-fit cursor-pointer font-medium hover:underline"
          >Exact damage rule</summary
        >
        <!-- Source: server-scripts/Combat.cs:DealDamageAt -->
        <div class="mt-2 space-y-2 text-pretty text-muted-foreground">
          <p>
            From 10% mastery, the game subtracts <code
              >ceil(damage × Slayer × 0.1)</code
            >. The game stores Slayer as a value from 0 to 1. The upward
            rounding can increase the reduction on a small hit.
          </p>
          <p>A mercenary or summon uses the Slayer mastery of its owner.</p>
        </div>
      </details>
    </div>
  </section>

  <section id="mastery" class="space-y-4">
    <h2 class="text-xl font-semibold">Account-wide mastery</h2>
    <!-- Source: server-scripts/Database.cs:CalculateSlayerLevelForAccount -->
    <p class="max-w-2xl text-pretty text-sm text-muted-foreground">
      The game adds the capped kills of every character on the account, then
      stops Slayer at 100%. One target adds a maximum of 1 percentage point, so
      100% needs kills from a minimum of 100 targets.
    </p>

    <div class="overflow-x-auto">
      <p class="min-w-max font-mono text-sm">
        Slayer = min(100%, Σ 0.02% × min(50, account kills per target))
      </p>
    </div>

    <div class="max-w-2xl space-y-3 text-pretty text-sm text-muted-foreground">
      <!-- Source: server-scripts/Monster.cs:OnDeath -->
      <!-- Source: server-scripts/Player.cs:UserCode_TargetRpcUpdateKillsBestiary__String -->
      <p>
        A mercenary or a summon with the highest aggro gives the credit to its
        owner. In a party, each nearby member gets the same credit.
      </p>
      <p>
        The Bestiary count stays with one character. Slayer mastery is the total
        for the account, and every race starts at 0%. A kill after the 50-kill
        limit still increases the Bestiary count, but not Slayer mastery.
      </p>
    </div>
  </section>

  <section id="targets" class="space-y-4">
    <h2 class="text-xl font-semibold">Slayer targets</h2>
    <p class="max-w-2xl text-balance text-sm text-muted-foreground">
      Only bosses and elites give Slayer mastery. Regular monsters and hunt
      targets do not.
    </p>

    <DataTable
      data={dataWithVirtual}
      {columns}
      {columnLabels}
      {renderCell}
      {renderHeader}
      {renderToolbar}
      pageSize={PAGE_SIZE}
      initialSorting={[
        { id: "level_min", desc: false },
        { id: "name", desc: false },
      ]}
      initialColumnVisibility={{
        classification: false,
        zone_ids: false,
      }}
      urlKey="slayer-targets"
      showPagination={true}
      showSearch={true}
      showColumnToggle={true}
      zebraStripe={true}
      paginateStaticHtml={true}
      searchPlaceholder="Search targets..."
      class="bg-muted/30"
    />
  </section>
</div>

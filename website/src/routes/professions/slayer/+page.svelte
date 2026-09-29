<script lang="ts">
  import Seo from "$lib/components/Seo.svelte";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import MasteryCurve from "$lib/components/professions/MasteryCurve.svelte";
  import * as Card from "$lib/components/ui/card";
  import GuideFacts from "$lib/components/GuideFacts.svelte";
  import ProfessionHeader from "$lib/components/professions/ProfessionHeader.svelte";
  import MonsterTypeIcon from "$lib/components/MonsterTypeIcon.svelte";
  import EntityLink from "$lib/components/EntityLink.svelte";
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
    { id: "targets", label: "Targets" },
    { id: "how-it-works", label: "How Slayer works" },
    { id: "payoff", label: "Damage reduction" },
    { id: "mastery", label: "Mastery" },
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

  // Source: server-scripts/EventAltar.cs:201-213; server-scripts/DefaultEvent.cs:200-213 — altar activation starts the event that spawns each wave.
  // Source: server-scripts/Monster.cs:695-706,2217-2237 — summonable monsters start hidden and wait for readiness.
  // Source: server-scripts/Monster.cs:2890-2899 — a slain monster can spawn its configured placeholder.
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
    <EntityLink
      href="/monsters/{target.id}"
      name={target.name}
      variant="reference"
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

  <Card.Root id="how-it-works" class="bg-muted/30">
    <Card.Header
      ><Card.Title class="text-xl">How slayer works</Card.Title></Card.Header
    >
    <Card.Content class="space-y-6">
      <!-- Source: server-scripts/Combat.cs:781-788; server-scripts/Database.cs:3339-3346 — damage reduction begins at 10% Slayer and each target contributes at most 1 percentage point of mastery. -->
      <GuideFacts
        facts={[
          { value: "10%", label: "Reduction starts at Slayer" },
          { value: "50", label: "Credited kills per target" },
          { value: "+1 pp", label: "Maximum Slayer per target" },
        ]}
      />
      <ol class="divide-y divide-border text-sm">
        <!-- Source: server-scripts/Player.cs:UserCode_TargetRpcBossEliteApproach__NetworkIdentity; server-scripts/Player.cs:13635-13642; server-scripts/UIBestiaryDetail.cs:150-154 — approaching a target records discovery with zero kills, without revealing drops. -->
        <li class="grid grid-cols-[1.5rem_1fr] gap-3 py-3 first:pt-0">
          <span class="tabular-nums text-muted-foreground">1</span>
          <div>
            <p class="font-medium">Discover a boss or elite.</p>
            <p class="mt-0.5 text-muted-foreground">
              Approaching it records the target with zero kills. Its drops
              remain hidden.
            </p>
          </div>
        </li>
        <!-- Source: server-scripts/Monster.cs:2967-2979; server-scripts/Database.cs:3339-3346 — credited boss and elite kills increase account-wide Slayer up to 50 kills per target. -->
        <li class="grid grid-cols-[1.5rem_1fr] gap-3 py-3">
          <span class="tabular-nums text-muted-foreground">2</span>
          <div>
            <p class="font-medium">Defeat different bosses and elites.</p>
            <p class="mt-0.5 text-muted-foreground">
              Their credited kills add to account-wide Slayer. More than 50
              kills of one target add no mastery.
            </p>
          </div>
        </li>
      </ol>
      <!-- Source: server-scripts/Combat.cs:781-788 — Slayer reduces boss and elite damage to players and owned pets once mastery reaches 10%. -->
      <ul class="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>
          At 10% Slayer, a 100-damage boss or elite hit deals 99 before armor
          and resistance. At 100%, it deals 90.
        </li>
      </ul>
    </Card.Content>
  </Card.Root>

  <section id="payoff" class="space-y-4">
    <h2 class="text-xl font-semibold">Damage reduction</h2>
    <p class="max-w-2xl text-balance text-sm text-muted-foreground">
      Below 10% Slayer, boss and elite hits deal full damage. At 10% Slayer, a
      100-damage hit loses 1 damage. At 100%, it loses 10. Armor and elemental
      resistance reduce the remaining damage.
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
            At 10% Slayer, a boss or elite hit loses 1% of its damage, rounded
            up. Each additional 10 percentage points of Slayer adds another 1%
            reduction, up to 10%. Even a 10-damage hit loses 1 damage.
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
        A mercenary or summon that draws the most attention gives kill credit to
        its owner. In a party, each nearby member gets the same credit.
      </p>
      <p>
        The Bestiary count stays with one character. Slayer mastery is the total
        for the account, and every race starts at 0%. A kill after the 50-kill
        limit still increases the Bestiary count, but not Slayer mastery.
      </p>
    </div>
  </section>
</div>

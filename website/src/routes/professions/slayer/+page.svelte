<script lang="ts">
  import { formatPercent } from "$lib/utils/format";
  import Seo from "$lib/components/Seo.svelte";
  import { detailTitle } from "$lib/seo/title";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import MasteryCurve from "$lib/components/professions/MasteryCurve.svelte";
  import ProfessionHeader from "$lib/components/professions/ProfessionHeader.svelte";
  import MonsterTypeIcon from "$lib/components/MonsterTypeIcon.svelte";
  import EntityLink from "$lib/components/EntityLink.svelte";
  import MapLink from "$lib/components/MapLink.svelte";
  import MechanicsLink from "$lib/components/MechanicsLink.svelte";
  import Requirements from "$lib/components/acquisition/Requirements.svelte";
  import Calculation from "$lib/components/Calculation.svelte";
  import { slayerMasteryCalculation } from "$lib/calculation/slayer";
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
      zone_ids: target.zone_id ? [target.zone_id] : [],
      requirement: requirementText(target),
    })),
  );

  type TargetRow = (typeof dataWithVirtual)[number];

  const uniqueZones = $derived(
    Array.from(
      new Map(
        data.targets
          .filter((target) => target.zone_id !== null)
          .map((target) => [target.zone_id, target]),
      ).values(),
    ).sort((a, b) => a.zone_name.localeCompare(b.zone_name)),
  );

  function requirementText(target: SlayerTarget): string {
    if (target.altar)
      return `${target.altar.name}${target.altar.wave === null ? "" : `, wave ${target.altar.wave + 1}`}`;
    if (target.parent) {
      const chance =
        target.parent.probability !== null && target.parent.probability < 1
          ? ` (${formatPercent(target.parent.probability, { decimals: 0, trailingZeros: true })} chance)`
          : "";
      return `Appears near ${target.parent.name} after it is killed${chance}`;
    }
    if (target.spawn_type === "summon") {
      const names = target.guards.map((guard) =>
        guard.withheld ? "an unpublished guard" : (guard.name ?? "a guard"),
      );
      return names.length
        ? `Cannot spawn until the relevant group is dead: ${names.join(", ")}`
        : "Requires the current summon event to be ready";
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
      nameClass="whitespace-normal break-words"
    />
  {:else if cell.column.id === "level_min"}
    {@const hasVariance = target.level_min !== target.level_max}
    <span class="ml-auto"
      >{target.level_min}<span class={hasVariance ? "" : "invisible"}>+</span
      ></span
    >
  {:else if cell.column.id === "map"}
    {#if target.position_x !== null && target.position_y !== null}
      <MapLink
        entityId={target.altar?.id ?? target.id}
        entityType={target.altar ? "altar" : "monster"}
        compact
      />
    {:else}
      <span class="text-muted-foreground">-</span>
    {/if}
  {:else if cell.column.id === "zones"}
    {#if target.zone_id}
      <a
        href="/zones/{target.zone_id}"
        class="block truncate text-blue-600 hover:underline dark:text-blue-400"
        title={target.zone_name}>{target.zone_name}</a
      >
    {:else}
      <span class="text-muted-foreground">{target.zone_name}</span>
    {/if}
  {:else if cell.column.id === "requirement"}
    <div class="space-y-1">
      {#if target.altar}
        <a
          href="/altars/{target.altar.id}"
          class="text-blue-600 hover:underline dark:text-blue-400"
          >{target.altar.name}</a
        >{#if target.altar.wave !== null}, wave {target.altar.wave + 1}{/if}
      {:else if target.parent}
        Appears near <a
          href="/monsters/{target.parent.id}"
          class="text-blue-600 hover:underline dark:text-blue-400"
          >{target.parent.name}</a
        >
        after it is killed{#if target.parent.probability !== null && target.parent.probability < 1}
          ({formatPercent(target.parent.probability, {
            decimals: 0,
            trailingZeros: true,
          })} chance){/if}
      {:else if target.spawn_type === "summon"}
        {@const guardGroups = [
          ...Map.groupBy(
            target.guards,
            (guard) => guard.monsterId ?? guard.name,
          ).values(),
        ]}
        <span>
          The event must be ready. These guards must be dead in the current
          world:
        </span>
        <ul class="list-inside list-disc">
          {#each guardGroups as guards (guards[0].id)}
            {@const guard = guards[0]}
            <li>
              {#if guard.monsterId}<a
                  href="/monsters/{guard.monsterId}"
                  class="text-blue-600 hover:underline dark:text-blue-400"
                  >{guard.name}</a
                >{:else}Unpublished guard{/if}{#if guards.length > 1}
                ×{guards.length}{/if}
            </li>
          {/each}
        </ul>
      {/if}
      {#if target.spawn_type !== "summon"}
        <Requirements
          roots={target.requirements}
          names={data.acquisitionNames}
        />
      {/if}
      {#if target.altarVariants.length > 1}
        <details class="pt-2 whitespace-normal">
          <summary class="cursor-pointer text-sm">Altar tiers</summary>
          <p class="mt-2 text-sm text-muted-foreground">
            Activating player's level plus total veteran points:
          </p>
          <ul class="mt-2 space-y-1 text-sm">
            {#each target.altarVariants as method (method.methodId)}
              {@const tierRoot = method.requirements.find(
                (root) =>
                  root.expression.kind === "predicate" &&
                  root.expression.predicate.kind === "altar_tier",
              )}
              {#if tierRoot?.expression.kind === "predicate" && tierRoot.expression.predicate.kind === "altar_tier"}
                {@const tier = tierRoot.expression.predicate}
                <li>
                  Tier {tier.tier + 1}: {tier.maximumScore === null
                    ? `${tier.minimumScore} or more`
                    : `${tier.minimumScore} to ${tier.maximumScore}`}
                </li>
              {/if}
            {/each}
          </ul>
          <a
            href="/monsters/{target.id}"
            class="mt-2 block text-sm text-blue-600 hover:underline dark:text-blue-400"
            >Full loot</a
          >
        </details>
      {/if}
      {#if !target.requirement && !target.requirements.length}<span
          class="text-muted-foreground">-</span
        >{/if}
    </div>
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
      options={uniqueZones.flatMap((zone) =>
        zone.zone_id ? [{ label: zone.zone_name, value: zone.zone_id }] : [],
      )}
    />
  {/if}
  {#if levelCol}
    <DataTableRangeFilter column={levelCol} title="Level" />
  {/if}
{/snippet}

<Seo
  title={detailTitle(data.profession.name, { family: "Profession" })}
  description={`Slayer reduces the damage that bosses and elites deal to you, up to 10% at full mastery. All ${new Set(data.targets.map((target) => target.id)).size} Slayer targets with levels, zones, spawn requirements, and respawn times.`}
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
            Approach any target listed below to add it to your Bestiary.
          </p>
          <!-- Source: server-scripts/Player.cs:UserCode_TargetRpcBossEliteApproach__NetworkIdentity; server-scripts/Player.cs:13992-13999; server-scripts/UIBestiaryDetail.cs:150-154 — approach discovery and loot discovery are separate records. -->
          <p class="mt-0.5 text-pretty text-sm text-muted-foreground">
            Finding a target does not reveal its drops. Each drop appears in the
            Bestiary once a corpse holding it is looted.
          </p>
        </div>
      </li>
      <!-- Source: server-scripts/Monster.cs:OnDeath -->
      <li class="grid grid-cols-[1.5rem_1fr] gap-3 py-3">
        <span class="text-sm tabular-nums text-muted-foreground">2</span>
        <div>
          <p class="font-medium">Kill the target.</p>
          <p class="mt-0.5 text-pretty text-sm text-muted-foreground">
            The player with the most threat on the monster gets kill credit. In
            a party, each member within 40 yd of that player also gets
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
          <p class="font-medium">Gain Slayer mastery.</p>
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
            Bosses and elites deal <a
              href="#payoff"
              class="text-blue-600 hover:underline dark:text-blue-400"
              >less damage</a
            > to you, your mercenaries and your summons.
          </p>
        </div>
      </li>
    </ol>
  </section>

  <section id="payoff" class="space-y-4">
    <h2 class="text-xl font-semibold">Damage reduction</h2>
    <p class="max-w-2xl text-balance text-sm text-muted-foreground">
      Slayer reduction applies before
      <MechanicsLink section="combat#damage"
        >Armor Class or the matching resist</MechanicsLink
      >.
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
            >{formatPercent(damageReduction, {
              decimals: 1,
              trailingZeros: true,
            })} less damage</strong
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
            Damage reduction rounds up, so even a 10-damage hit loses 1 damage.
          </p>
          <p>Your mercenary or summon uses your Slayer mastery.</p>
        </div>
      </details>
    </div>
  </section>

  <section id="mastery" class="space-y-4">
    <h2 class="text-xl font-semibold">Account-wide mastery</h2>
    <!-- Source: server-scripts/Database.cs:CalculateSlayerLevelForAccount -->
    <p class="max-w-2xl text-pretty text-sm text-muted-foreground">
      Slayer mastery is shared by every character on your account. Only the
      first 50 kills of each target count toward the 100% cap.
    </p>

    <!-- Source: server-scripts/Database.cs:3428-3436 — each target adds 0.02% per account kill up to 50 kills, and the total stops at 100%. -->
    <Calculation calculation={slayerMasteryCalculation()} />

    <div class="max-w-2xl space-y-3 text-pretty text-sm text-muted-foreground">
      <!-- Source: server-scripts/Monster.cs:OnDeath -->
      <!-- Source: server-scripts/Player.cs:UserCode_TargetRpcUpdateKillsBestiary__String -->
      <p>Threat from your mercenary or summon counts for you.</p>
      <p>
        Bestiary counts belong to each character and keep increasing after the
        account's 50-kill mastery limit. New characters share your Slayer
        mastery. No race has a starting Slayer bonus.
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

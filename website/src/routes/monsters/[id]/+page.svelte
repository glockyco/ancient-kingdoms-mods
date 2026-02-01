<script lang="ts">
  import {
    DataTable,
    type ColumnDef,
    type Cell,
    type Row,
    type Header,
  } from "$lib/components/ui/data-table";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import MapLink from "$lib/components/MapLink.svelte";
  import QuestTypeBadge from "$lib/components/QuestTypeBadge.svelte";
  import QuestFlagBadges from "$lib/components/QuestFlagBadges.svelte";
  import type {
    MonsterDrop,
    MonsterSpawnZone,
    MonsterQuest,
  } from "$lib/types/monsters";
  import { formatPercent, formatDuration } from "$lib/utils/format";
  import Sword from "@lucide/svelte/icons/sword";
  import Gem from "@lucide/svelte/icons/gem";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import Scroll from "@lucide/svelte/icons/scroll";
  import BookOpen from "@lucide/svelte/icons/book-open";
  import Star from "@lucide/svelte/icons/star";

  let { data } = $props();

  const respawnTime = $derived(data.monster.respawn_time);

  // Check which spawn columns to show
  const showRespawnColumn = $derived(respawnTime > 0);
  const showChanceColumn = $derived(data.monster.respawn_probability < 1);
  const showActiveColumn = $derived(
    data.monster.spawn_time_start !== 0 || data.monster.spawn_time_end !== 0,
  );
  const hasSpawnsOnDeath = $derived(
    data.monster.placeholder_monster_id !== null,
  );

  // Check if any spawn info exists
  const hasAnySpawns = $derived(
    data.spawns.regular.length > 0 ||
      data.spawns.summon.length > 0 ||
      data.spawns.altar.length > 0 ||
      data.spawns.placeholder !== null ||
      data.summons.length > 0 ||
      hasSpawnsOnDeath,
  );

  // Combine regular and summon spawns for the table
  const allSpawnZones = $derived([
    ...data.spawns.regular,
    ...data.spawns.summon.map((s) => ({
      zone_id: s.zone_id,
      zone_name: s.zone_name,
      level_min: data.monster.level,
      level_max: data.monster.level,
      spawn_count: 1,
      spawn_type: "summon" as const,
      sub_zone_name: s.sub_zone_name,
    })),
  ]);

  // Does this monster have level variance from world spawns?
  const hasLevelVariance = $derived(
    data.monster.level_min !== data.monster.level_max,
  );

  // Monster level slider (for monsters with level variance)
  // Capture initial value only - user controls the slider after mount
  let monsterLevelInput = $state((() => data.monster.level_min)());

  // Clamp input to valid range
  const displayLevel = $derived(
    Math.min(
      data.monster.level_max,
      Math.max(data.monster.level_min, monsterLevelInput),
    ),
  );

  // Calculate scaled stats using LinearInt formula: base + per_level * (level - 1)
  function calculateStat(
    base: number,
    perLevel: number,
    level: number,
  ): number {
    return base + perLevel * (level - 1);
  }

  const displayHealth = $derived(
    calculateStat(
      data.monster.health_base,
      data.monster.health_per_level,
      displayLevel,
    ),
  );
  const displayDamage = $derived(
    calculateStat(
      data.monster.damage_base,
      data.monster.damage_per_level,
      displayLevel,
    ),
  );
  const displayMagicDamage = $derived(
    calculateStat(
      data.monster.magic_damage_base,
      data.monster.magic_damage_per_level,
      displayLevel,
    ),
  );
  const displayDefense = $derived(
    calculateStat(
      data.monster.defense_base,
      data.monster.defense_per_level,
      displayLevel,
    ),
  );
  const displayMagicResist = $derived(
    calculateStat(
      data.monster.magic_resist_base,
      data.monster.magic_resist_per_level,
      displayLevel,
    ),
  );
  const displayPoisonResist = $derived(
    calculateStat(
      data.monster.poison_resist_base,
      data.monster.poison_resist_per_level,
      displayLevel,
    ),
  );
  const displayFireResist = $derived(
    calculateStat(
      data.monster.fire_resist_base,
      data.monster.fire_resist_per_level,
      displayLevel,
    ),
  );
  const displayColdResist = $derived(
    calculateStat(
      data.monster.cold_resist_base,
      data.monster.cold_resist_per_level,
      displayLevel,
    ),
  );
  const displayDiseaseResist = $derived(
    calculateStat(
      data.monster.disease_resist_base,
      data.monster.disease_resist_per_level,
      displayLevel,
    ),
  );

  // Special combat abilities
  const abilities = $derived(
    [
      { flag: data.monster.see_invisibility, label: "Sees Invisibility" },
      { flag: data.monster.is_immune_debuffs, label: "Immune to Debuffs" },
      { flag: data.monster.yell_friends, label: "Calls for Help" },
      { flag: data.monster.flee_on_low_hp, label: "Flees on Low HP" },
      { flag: data.monster.has_aura, label: "Has Aura" },
      { flag: data.monster.no_aggro_monster, label: "Non-Aggressive" },
    ].filter((a) => a.flag),
  );

  // Check for any non-zero resistances (always use display values now)
  const resistances = $derived(
    [
      { name: "Magic", value: displayMagicResist },
      { name: "Poison", value: displayPoisonResist },
      { name: "Fire", value: displayFireResist },
      { name: "Cold", value: displayColdResist },
      { name: "Disease", value: displayDiseaseResist },
    ].filter((r) => r.value !== 0),
  );

  // Check if any drop has a note
  const hasDropNotes = $derived(data.drops.some((d) => d.note));

  // Drop columns (bestiary column only for bosses/elites, note column if any drops have notes)
  const dropColumns = $derived.by(() => {
    const cols: ColumnDef<MonsterDrop>[] = [];

    if (data.monster.is_boss || data.monster.is_elite) {
      cols.push({
        accessorKey: "is_bestiary",
        header: "",
        size: 50,
        enableSorting: true,
      });
    }

    cols.push({
      accessorKey: "item_name",
      header: "Item",
      minSize: 350,
    });

    if (hasDropNotes) {
      cols.push({
        accessorKey: "note",
        header: "Note",
        size: 230,
      });
    }

    cols.push(
      {
        accessorKey: "rate",
        header: "Drop Rate",
        size: 140,
      },
      {
        accessorKey: "quality",
        header: "Quality",
        enableHiding: false,
      },
    );

    return cols;
  });

  // Check if we should show the level column (when there's level variance)
  const showLevelColumn = $derived(
    data.monster.level_min !== data.monster.level_max,
  );

  // Spawn location columns (dynamic based on monster properties)
  const spawnColumns = $derived.by(() => {
    const cols: ColumnDef<MonsterSpawnZone>[] = [
      {
        accessorKey: "zone_name",
        header: "Zone",
        minSize: 180,
      },
    ];

    if (showLevelColumn) {
      cols.push(
        {
          accessorKey: "level_min",
          header: "Min Lv",
          size: 120,
        },
        {
          accessorKey: "level_max",
          header: "Max Lv",
          size: 120,
        },
      );
    }

    if (showRespawnColumn) {
      cols.push({
        id: "respawn",
        header: "Respawn",
        size: 120,
      });
    }

    if (showChanceColumn) {
      cols.push({
        id: "chance",
        header: "Chance",
        size: 120,
      });
    }

    if (showActiveColumn) {
      cols.push({
        id: "active",
        header: "Active",
        size: 150,
      });
    }

    cols.push({
      accessorKey: "spawn_count",
      header: "Spawns",
      size: 120,
    });

    return cols;
  });

  // Check if any quests have flags (for conditional column)
  const hasQuestFlags = $derived(
    data.quests.some(
      (q) =>
        q.is_main_quest ||
        q.is_epic_quest ||
        q.is_adventurer_quest ||
        q.is_repeatable,
    ),
  );

  // Quest columns: Type > Flags > Name > Level > Objective
  const questColumns = $derived.by(() => {
    const cols: ColumnDef<MonsterQuest>[] = [
      {
        id: "type",
        header: "Type",
        size: 100,
        accessorFn: (row) => row.display_type,
      },
    ];

    if (hasQuestFlags) {
      cols.push({
        id: "flags",
        header: "Flags",
        size: 130,
        enableSorting: false,
        accessorFn: (row) => {
          const flags: string[] = [];
          if (row.is_main_quest) flags.push("Main");
          if (row.is_epic_quest) flags.push("Epic");
          if (row.is_adventurer_quest) flags.push("Daily");
          if (row.is_repeatable) flags.push("Repeatable");
          return flags.join(" ");
        },
      });
    }

    cols.push(
      {
        accessorKey: "name",
        header: "Name",
        minSize: 220,
      },
      {
        accessorKey: "level_recommended",
        header: "Level",
        size: 100,
      },
      {
        id: "objective",
        header: "Objective",
        minSize: 220,
        accessorFn: (row) => row.amount,
      },
    );

    return cols;
  });
</script>

{#snippet renderDropCell({
  cell,
  row,
}: {
  cell: Cell<MonsterDrop, unknown>;
  row: Row<MonsterDrop>;
})}
  {#if cell.column.id === "is_bestiary"}
    {#if row.original.is_bestiary}
      <BookOpen class="h-4 w-4 text-amber-500" />
    {/if}
  {:else if cell.column.id === "item_name"}
    <ItemLink
      itemId={row.original.item_id}
      itemName={row.original.item_name}
      tooltipHtml={row.original.tooltip_html}
    />
  {:else if cell.column.id === "note"}
    <span class="text-muted-foreground">{row.original.note ?? ""}</span>
  {:else if cell.column.id === "rate"}
    <span class="ml-auto">{formatPercent(row.original.rate)}</span>
  {:else if cell.column.id === "quality"}
    <!-- Hidden column used for sorting -->
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderDropHeader({
  header,
}: {
  header: Header<MonsterDrop, unknown>;
})}
  {#if header.id === "rate"}
    <span class="ml-auto">{header.column.columnDef.header}</span>
  {:else}
    {header.column.columnDef.header}
  {/if}
{/snippet}

{#snippet renderSpawnCell({
  cell,
  row,
}: {
  cell: Cell<MonsterSpawnZone, unknown>;
  row: Row<MonsterSpawnZone>;
})}
  {#if cell.column.id === "zone_name"}
    <a
      href="/zones/{row.original.zone_id}"
      class="text-blue-600 dark:text-blue-400 hover:underline"
    >
      {row.original.zone_name}
    </a>{#if row.original.sub_zone_name}<span class="text-muted-foreground"
        >&nbsp;({row.original.sub_zone_name})</span
      >{/if}
  {:else if cell.column.id === "level_min"}
    <span class="ml-auto">{row.original.level_min}</span>
  {:else if cell.column.id === "level_max"}
    <span class="ml-auto">{row.original.level_max}</span>
  {:else if cell.column.id === "respawn"}
    <span class="ml-auto">{formatDuration(respawnTime)}</span>
  {:else if cell.column.id === "chance"}
    <span class="ml-auto"
      >{formatPercent(data.monster.respawn_probability)}</span
    >
  {:else if cell.column.id === "active"}
    <span class="ml-auto">
      {data.monster.spawn_time_start}:00-{data.monster.spawn_time_end}:00
    </span>
  {:else if cell.column.id === "spawn_count"}
    <span class="ml-auto">{row.original.spawn_count}</span>
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderSpawnHeader({
  header,
}: {
  header: Header<MonsterSpawnZone, unknown>;
})}
  {#if header.id === "level_min" || header.id === "level_max" || header.id === "respawn" || header.id === "chance" || header.id === "active" || header.id === "spawn_count"}
    <span class="ml-auto">{header.column.columnDef.header}</span>
  {:else}
    {header.column.columnDef.header}
  {/if}
{/snippet}

{#snippet renderQuestCell({
  cell,
  row,
}: {
  cell: Cell<MonsterQuest, unknown>;
  row: Row<MonsterQuest>;
})}
  {#if cell.column.id === "type"}
    <QuestTypeBadge type={row.original.display_type} />
  {:else if cell.column.id === "flags"}
    <QuestFlagBadges quest={row.original} />
  {:else if cell.column.id === "name"}
    <a
      href="/quests/{row.original.id}"
      class="text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
    >
      {row.original.name}
    </a>
  {:else if cell.column.id === "level_recommended"}
    <span class="ml-auto">{row.original.level_recommended}</span>
  {:else if cell.column.id === "objective"}
    {#if row.original.display_type === "Kill"}
      <span
        >Kill{#if row.original.amount > 0}&nbsp;×{row.original
            .amount}{/if}</span
      >
    {:else if row.original.item_id && row.original.item_name}
      <span
        ><ItemLink
          itemId={row.original.item_id}
          itemName={row.original.item_name}
        />{#if row.original.amount > 0}&nbsp;×{row.original.amount}{/if}</span
      >
    {:else if row.original.amount > 0}
      <span>×{row.original.amount}</span>
    {/if}
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderQuestHeader({
  header,
}: {
  header: Header<MonsterQuest, unknown>;
})}
  {#if header.id === "level_recommended"}
    <span class="ml-auto">{header.column.columnDef.header}</span>
  {:else}
    {header.column.columnDef.header}
  {/if}
{/snippet}

<svelte:head>
  <title>{data.monster.name} - Ancient Kingdoms Compendium</title>
  <meta name="description" content={data.description} />
</svelte:head>

<div class="container mx-auto p-8 space-y-6 max-w-5xl">
  <!-- Breadcrumb -->
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Monsters", href: "/monsters" },
      { label: data.monster.name },
    ]}
  />

  <!-- Header -->
  <div>
    <div class="flex items-center gap-3 flex-wrap">
      <h1 class="text-3xl font-bold">{data.monster.name}</h1>
      <MapLink entityId={data.monster.id} entityType="monster" />
      {#if data.monster.is_fabled}
        <span
          class="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
        >
          <Star class="mr-1 h-3 w-3" />
          Fabled
        </span>
      {/if}
      {#if data.monster.is_world_boss}
        <span
          class="inline-flex items-center rounded-full bg-cyan-100 px-2.5 py-0.5 text-xs font-medium text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200"
        >
          World Boss
        </span>
      {:else if data.monster.is_boss}
        <span
          class="inline-flex items-center rounded-full bg-cyan-100 px-2.5 py-0.5 text-xs font-medium text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200"
        >
          Boss
        </span>
      {/if}
      {#if data.monster.is_elite}
        <span
          class="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900 dark:text-purple-200"
        >
          Elite
        </span>
      {/if}
      {#if data.monster.is_hunt}
        <span
          class="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900 dark:text-orange-200"
        >
          Hunt
        </span>
      {/if}
      {#if data.monster.type_name}
        <span
          class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200"
        >
          {data.monster.type_name}
        </span>
      {/if}
    </div>

    <div class="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
      <span
        >Level {data.monster.level_min === data.monster.level_max
          ? data.monster.level_min
          : `${data.monster.level_min}-${data.monster.level_max}`}</span
      >
      {#if data.monster.class_name && data.monster.class_name !== data.monster.type_name}
        <span>Class: {data.monster.class_name}</span>
      {/if}
      {#if data.monster.base_exp > 0}
        <span>Base XP: {data.monster.base_exp.toLocaleString()}</span>
      {/if}
      {#if data.monster.improve_faction.length > 0 || data.monster.decrease_faction.length > 0}
        <span>
          On Kill:
          {#each data.monster.improve_faction as faction, i (faction)}
            {#if i > 0},
            {/if}<span class="text-green-600 dark:text-green-400"
              >+{faction}</span
            >
          {/each}
          {#each data.monster.decrease_faction as faction, i (faction)}
            {#if i > 0 || data.monster.improve_faction.length > 0},
            {/if}<span class="text-red-600 dark:text-red-400">-{faction}</span>
          {/each}
        </span>
      {/if}
    </div>
  </div>

  <!-- Spawns Section -->
  {#if hasAnySpawns}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <MapPin class="h-5 w-5 text-emerald-500" />
        Spawns
      </h2>

      <div class="space-y-4">
        <!-- World Spawns (regular + summon zones combined) -->
        {#if allSpawnZones.length > 0}
          <DataTable
            data={allSpawnZones}
            columns={spawnColumns}
            renderCell={renderSpawnCell}
            renderHeader={renderSpawnHeader}
            initialSorting={[{ id: "spawn_count", desc: true }]}
            urlKey="monster-{data.monster.id}-spawns"
            pageSize={10}
            zebraStripe={true}
            class="bg-muted/30"
          />
        {/if}

        <!-- Altar Events -->
        {#if data.spawns.altar.length > 0}
          <div class="space-y-2">
            {#each data.spawns.altar as altar (altar.altar_id)}
              <div class="bg-muted/30 rounded-md border p-3">
                <div>
                  <span class="font-medium">{altar.altar_name}</span>
                  <span class="text-muted-foreground"> in </span>
                  <a
                    href="/zones/{altar.zone_id}"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {altar.zone_name}
                  </a>
                </div>
                {#if altar.waves.length > 0}
                  <div class="text-sm text-muted-foreground mt-1">
                    {altar.waves.length === 1 ? "Wave" : "Waves"}: {altar.waves
                      .map((w) => w + 1)
                      .join(", ")}
                  </div>
                {/if}
                {#if altar.activation_item_id && altar.activation_item_name}
                  <div class="text-sm mt-1">
                    <span class="text-muted-foreground">Requires: </span>
                    <a
                      href="/items/{altar.activation_item_id}"
                      class="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {altar.activation_item_name}
                    </a>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}

        <!-- Blocked Spawning (what blocks this monster from respawning) -->
        {#if data.spawns.summon.length > 0}
          <div class="space-y-2">
            {#each data.spawns.summon as summon (summon.zone_id)}
              <div class="bg-muted/30 rounded-md border p-3">
                <span
                  >Blocked from respawning while {summon.kill_count > 1
                    ? `${summon.kill_count} `
                    : ""}</span
                >
                <a
                  href="/monsters/{summon.kill_monster_id}"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                  >{summon.kill_monster_name}{summon.kill_count > 1
                    ? "s"
                    : ""}</a
                >
                <span>{summon.kill_count > 1 ? " are" : " is"} alive in </span>
                <a
                  href="/zones/{summon.zone_id}"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {summon.zone_name}
                </a>{#if summon.sub_zone_name && summon.sub_zone_name.toLowerCase() !== summon.zone_name.toLowerCase()}<span
                    class="text-muted-foreground"
                    >&nbsp;({summon.sub_zone_name})</span
                  >{/if}
              </div>
            {/each}
          </div>
        {/if}

        <!-- Blocks Spawning (what this monster being alive blocks) -->
        {#if data.summons.length > 0}
          <div class="space-y-2">
            {#each data.summons as summon (summon.summoned_monster_id + summon.zone_id)}
              <div class="bg-muted/30 rounded-md border p-3">
                <span>Blocks </span>
                <a
                  href="/monsters/{summon.summoned_monster_id}"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {summon.summoned_monster_name}
                </a>
                <span>
                  from respawning while {summon.kill_count > 1
                    ? `${summon.kill_count} are`
                    : "1 is"} alive in
                </span>
                <a
                  href="/zones/{summon.zone_id}"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {summon.zone_name}
                </a>{#if summon.sub_zone_name && summon.sub_zone_name.toLowerCase() !== summon.zone_name.toLowerCase()}<span
                    class="text-muted-foreground"
                    >&nbsp;({summon.sub_zone_name})</span
                  >{/if}
              </div>
            {/each}
          </div>
        {/if}

        <!-- Spawned On Death (how this monster spawns) -->
        {#if data.spawns.placeholder}
          <div class="bg-muted/30 rounded-md border p-3">
            <span>Appears after killing </span>
            <a
              href="/monsters/{data.spawns.placeholder.source_monster_id}"
              class="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {data.spawns.placeholder.source_monster_name}
            </a>
            <span class="text-muted-foreground"> in </span>
            <a
              href="/zones/{data.spawns.placeholder.zone_id}"
              class="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {data.spawns.placeholder.zone_name}
            </a>
            {#if data.spawns.placeholder.spawn_probability < 1}
              <span class="text-muted-foreground">
                ({formatPercent(data.spawns.placeholder.spawn_probability)} chance)
              </span>
            {/if}
          </div>
        {/if}

        <!-- On Death Spawns (what spawns when this monster dies) -->
        {#if hasSpawnsOnDeath}
          <div class="bg-muted/30 rounded-md border p-3">
            <span>Killing this spawns </span>
            <a
              href="/monsters/{data.monster.placeholder_monster_id}"
              class="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {data.monster.placeholder_monster_name ||
                data.monster.placeholder_monster_id}
            </a>
            {#if data.monster.placeholder_spawn_probability > 0 && data.monster.placeholder_spawn_probability < 1}
              <span class="text-muted-foreground">
                ({formatPercent(data.monster.placeholder_spawn_probability)} chance)
              </span>
            {/if}
          </div>
        {/if}

        <!-- Renewal Sages (for world bosses) -->
        {#if data.renewalSages.length > 0}
          <div class="space-y-2">
            {#each data.renewalSages as sage (sage.id)}
              <div class="bg-muted/30 rounded-md border p-3">
                <span>Reset by </span>
                <a
                  href="/npcs/{sage.id}"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {sage.name}
                </a>
                {#if sage.zoneName}
                  <span> in </span>
                  <a
                    href="/zones/{sage.zoneId}"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {sage.zoneName}
                  </a>
                {/if}
                {#if sage.cost > 0}
                  <span> for </span>
                  <span class="text-yellow-600 dark:text-yellow-400"
                    >{sage.cost.toLocaleString()}</span
                  >
                  <a
                    href="/items/adventurers_essence"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Adventurer's Essence
                  </a>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </section>
  {/if}

  <!-- Combat Stats Section -->
  <section>
    <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
      <Sword class="h-5 w-5 text-red-500" />
      Combat Stats
    </h2>
    {#if hasLevelVariance}
      <div class="mb-4 bg-muted/30 rounded-md border p-4 js-only">
        <div class="flex flex-wrap items-center gap-4">
          <label for="monster-level" class="text-sm text-muted-foreground">
            Monster Level
          </label>
          <input
            id="monster-level"
            type="range"
            min={data.monster.level_min}
            max={data.monster.level_max}
            bind:value={monsterLevelInput}
            class="flex-1 max-w-xs"
          />
          <span class="text-sm font-medium w-8">{displayLevel}</span>
        </div>
      </div>
    {/if}
    <div class="bg-muted/30 rounded-md border p-4">
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div>
          <div class="text-sm text-muted-foreground">Health</div>
          <div class="font-medium">
            {displayHealth.toLocaleString()}
          </div>
        </div>
        <div>
          <div class="text-sm text-muted-foreground">Damage</div>
          <div class="font-medium">
            {displayDamage}
          </div>
        </div>
        <div>
          <div class="text-sm text-muted-foreground">Magic Damage</div>
          <div class="font-medium">
            {displayMagicDamage}
          </div>
        </div>
        <div>
          <div class="text-sm text-muted-foreground">Defense</div>
          <div class="font-medium">
            {displayDefense}
          </div>
        </div>
        {#if data.monster.block_chance > 0}
          <div>
            <div class="text-sm text-muted-foreground">Block Chance</div>
            <div class="font-medium">
              {formatPercent(data.monster.block_chance)}
            </div>
          </div>
        {/if}
        {#if data.monster.critical_chance > 0}
          <div>
            <div class="text-sm text-muted-foreground">Critical Chance</div>
            <div class="font-medium">
              {formatPercent(data.monster.critical_chance)}
            </div>
          </div>
        {/if}
      </div>

      {#if resistances.length > 0 || abilities.length > 0}
        <div class="mt-4 pt-4 border-t flex flex-col md:flex-row gap-4">
          {#if resistances.length > 0}
            <div class="md:w-[500px] shrink-0">
              <div class="text-sm text-muted-foreground mb-2">Resistances</div>
              <div class="flex flex-wrap gap-2">
                {#each resistances as resist (resist.name)}
                  <span
                    class="inline-flex items-center rounded-md px-2 py-1 text-sm
                      {resist.value > 0
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}"
                  >
                    {resist.name}: {resist.value}
                  </span>
                {/each}
              </div>
            </div>
          {/if}
          {#if abilities.length > 0}
            <div class="flex-1">
              <div class="text-sm text-muted-foreground mb-2">Special</div>
              <div class="flex flex-wrap gap-2">
                {#each abilities as ability (ability.label)}
                  <span
                    class="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {ability.label}
                  </span>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </section>

  <!-- Loot Section -->
  {#if (data.monster.gold_min !== null && data.monster.gold_max !== null && data.monster.gold_max > 0) || data.drops.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Gem class="h-5 w-5 text-amber-500" />
        Loot
      </h2>

      {#if data.monster.gold_min !== null && data.monster.gold_max !== null && data.monster.gold_max > 0}
        <div class="mb-4 bg-muted/30 rounded-md border p-4">
          <div class="font-medium text-yellow-600 dark:text-yellow-400">
            {data.monster.gold_min.toLocaleString()} - {data.monster.gold_max.toLocaleString()}
            gold
            {#if data.monster.probability_drop_gold < 1}
              <span class="text-muted-foreground font-normal">
                ({formatPercent(data.monster.probability_drop_gold)} chance)
              </span>
            {/if}
          </div>
        </div>
      {/if}

      {#if data.drops.length > 0}
        <DataTable
          data={data.drops}
          columns={dropColumns}
          renderCell={renderDropCell}
          renderHeader={renderDropHeader}
          initialSorting={data.monster.is_boss || data.monster.is_elite
            ? [
                { id: "is_bestiary", desc: true },
                { id: "rate", desc: true },
                { id: "quality", desc: true },
                { id: "item_name", desc: false },
              ]
            : [
                { id: "rate", desc: true },
                { id: "quality", desc: true },
                { id: "item_name", desc: false },
              ]}
          urlKey="monster-{data.monster.id}-drops"
          pageSize={10}
          zebraStripe={true}
          class="bg-muted/30"
          initialColumnVisibility={{ quality: false }}
        />
      {/if}
    </section>
  {/if}

  <!-- Related Quests Section -->
  {#if data.quests.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Scroll class="h-5 w-5 text-orange-500" />
        Related Quests ({data.quests.length})
      </h2>
      <DataTable
        data={data.quests}
        columns={questColumns}
        renderCell={renderQuestCell}
        renderHeader={renderQuestHeader}
        initialSorting={[
          { id: "level_recommended", desc: false },
          { id: "name", desc: false },
        ]}
        urlKey="monster-{data.monster.id}-quests"
        pageSize={10}
        zebraStripe={true}
        class="bg-muted/30"
      />
    </section>
  {/if}

  <!-- Lore Section -->
  {#if data.monster.lore_boss || data.monster.aggro_messages.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <BookOpen class="h-5 w-5 text-cyan-500" />
        Lore
      </h2>
      <div class="bg-muted/30 rounded-md border p-4 space-y-4">
        {#if data.monster.lore_boss}
          <p class="whitespace-pre-wrap">{data.monster.lore_boss}</p>
        {/if}
        {#if data.monster.aggro_messages.length > 0}
          <div class="space-y-1">
            {#each data.monster.aggro_messages as message, i (i)}
              <div class="italic text-muted-foreground">"{message}"</div>
            {/each}
          </div>
        {/if}
      </div>
    </section>
  {/if}
</div>

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
  import type {
    MonsterDrop,
    MonsterSpawnZone,
    MonsterQuest,
  } from "$lib/types/monsters";
  import Sword from "@lucide/svelte/icons/sword";
  import Gem from "@lucide/svelte/icons/gem";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import Scroll from "@lucide/svelte/icons/scroll";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import BookOpen from "@lucide/svelte/icons/book-open";

  let { data } = $props();

  // Total respawn time = corpse duration + respawn delay
  const totalRespawnTime = $derived(
    data.monster.death_time + data.monster.respawn_time,
  );

  // Check which spawn columns to show
  const showRespawnColumn = $derived(totalRespawnTime > 0);
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
      data.spawns.placeholder !== null,
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

  // Check for any non-zero resistances
  const resistances = $derived(
    [
      { name: "Poison", value: data.monster.poison_resist },
      { name: "Fire", value: data.monster.fire_resist },
      { name: "Cold", value: data.monster.cold_resist },
      { name: "Disease", value: data.monster.disease_resist },
    ].filter((r) => r.value !== 0),
  );

  // Drop columns (bestiary column only for bosses/elites)
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

    cols.push(
      {
        accessorKey: "item_name",
        header: "Item",
        minSize: 220,
      },
      {
        accessorKey: "rate",
        header: "Drop Rate",
        size: 140,
      },
    );

    return cols;
  });

  // Spawn location columns (dynamic based on monster properties)
  const spawnColumns = $derived.by(() => {
    const cols: ColumnDef<MonsterSpawnZone>[] = [
      {
        accessorKey: "zone_name",
        header: "Zone",
        minSize: 180,
      },
    ];

    if (showRespawnColumn) {
      cols.push({
        id: "respawn",
        header: "Respawn",
        size: 90,
      });
    }

    if (showChanceColumn) {
      cols.push({
        id: "chance",
        header: "Chance",
        size: 80,
      });
    }

    if (showActiveColumn) {
      cols.push({
        id: "active",
        header: "Active",
        size: 110,
      });
    }

    cols.push({
      accessorKey: "spawn_count",
      header: "Spawns",
      size: 80,
    });

    return cols;
  });

  // Quest columns
  const questColumns: ColumnDef<MonsterQuest>[] = [
    {
      accessorKey: "name",
      header: "Quest",
      minSize: 220,
    },
    {
      accessorKey: "level_recommended",
      header: "Level",
      size: 100,
    },
    {
      accessorKey: "kill_amount",
      header: "Kill",
      size: 80,
    },
  ];

  function formatPercent(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
  }

  function formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
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
  {:else if cell.column.id === "rate"}
    <span class="ml-auto">{formatPercent(row.original.rate)}</span>
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
    </a>
  {:else if cell.column.id === "respawn"}
    <span class="ml-auto">{formatTime(totalRespawnTime)}</span>
  {:else if cell.column.id === "chance"}
    <span class="ml-auto">
      {formatPercent(data.monster.respawn_probability)}
    </span>
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
  {#if header.id === "respawn" || header.id === "chance" || header.id === "active" || header.id === "spawn_count"}
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
  {#if cell.column.id === "name"}
    <a
      href="/quests/{row.original.id}"
      class="text-blue-600 dark:text-blue-400 hover:underline"
    >
      {row.original.name}
    </a>
  {:else if cell.column.id === "level_recommended"}
    <span class="ml-auto">{row.original.level_recommended}</span>
  {:else if cell.column.id === "kill_amount"}
    <span class="ml-auto">{row.original.kill_amount}</span>
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderQuestHeader({
  header,
}: {
  header: Header<MonsterQuest, unknown>;
})}
  {#if header.id === "level_recommended" || header.id === "kill_amount"}
    <span class="ml-auto">{header.column.columnDef.header}</span>
  {:else}
    {header.column.columnDef.header}
  {/if}
{/snippet}

<svelte:head>
  <title>{data.monster.name} - Ancient Kingdoms Compendium</title>
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
      {#if data.monster.is_boss}
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
      <span>Level {data.monster.level}</span>
      {#if data.monster.class_name && data.monster.class_name !== data.monster.type_name}
        <span>Class: {data.monster.class_name}</span>
      {/if}
      {#if data.monster.exp_multiplier !== 1}
        <span>XP: {data.monster.exp_multiplier}x</span>
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

  <!-- Combat Stats Section -->
  <section>
    <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
      <Sword class="h-5 w-5 text-red-500" />
      Combat Stats
    </h2>
    <div class="bg-muted/30 rounded-md border p-4">
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div>
          <div class="text-sm text-muted-foreground">Health</div>
          <div class="font-medium">{data.monster.health.toLocaleString()}</div>
        </div>
        <div>
          <div class="text-sm text-muted-foreground">Damage</div>
          <div class="font-medium">{data.monster.damage}</div>
        </div>
        <div>
          <div class="text-sm text-muted-foreground">Magic Damage</div>
          <div class="font-medium">{data.monster.magic_damage}</div>
        </div>
        <div>
          <div class="text-sm text-muted-foreground">Defense</div>
          <div class="font-medium">{data.monster.defense}</div>
        </div>
        <div>
          <div class="text-sm text-muted-foreground">Magic Resist</div>
          <div class="font-medium">{data.monster.magic_resist}</div>
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
        <div class="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
          {#if resistances.length > 0}
            <div>
              <div class="text-sm text-muted-foreground mb-2">Resistances</div>
              <div class="flex flex-wrap gap-2">
                {#each resistances as resist (resist.name)}
                  <span
                    class="inline-flex items-center rounded-md px-2 py-1 text-sm
                      {resist.value > 0
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}"
                  >
                    {resist.name}: {resist.value > 0 ? "+" : ""}{resist.value}
                  </span>
                {/each}
              </div>
            </div>
          {/if}
          {#if abilities.length > 0}
            <div>
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
                { id: "item_name", desc: false },
              ]
            : [
                { id: "rate", desc: true },
                { id: "item_name", desc: false },
              ]}
          urlKey="monster-{data.monster.id}-drops"
          pageSize={10}
          zebraStripe={true}
          class="bg-muted/30"
        />
      {/if}
    </section>
  {/if}

  <!-- Spawn Locations Section -->
  {#if hasAnySpawns}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <MapPin class="h-5 w-5 text-emerald-500" />
        Spawn Locations
      </h2>

      <div class="space-y-4">
        <!-- World Spawns (regular) -->
        {#if data.spawns.regular.length > 0}
          <DataTable
            data={data.spawns.regular}
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

        <!-- Summoned By Killing -->
        {#if data.spawns.summon.length > 0}
          <div class="space-y-2">
            {#each data.spawns.summon as summon (summon.zone_id)}
              <div class="bg-muted/30 rounded-md border p-3">
                <span>Kill {summon.kill_count} </span>
                <a
                  href="/monsters/{summon.kill_monster_id}"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {summon.kill_monster_name}s
                </a>
                <span class="text-muted-foreground"> in </span>
                <a
                  href="/zones/{summon.zone_id}"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {summon.zone_name}
                </a>
                <span class="text-muted-foreground"> to summon</span>
              </div>
            {/each}
          </div>
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
                    Waves: {altar.waves.map((w) => w + 1).join(", ")}
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
      </div>
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
        initialSorting={[{ id: "level_recommended", desc: false }]}
        urlKey="monster-{data.monster.id}-quests"
        pageSize={10}
        zebraStripe={true}
        class="bg-muted/30"
      />
    </section>
  {/if}

  <!-- Summons Section (what killing this monster summons) -->
  {#if data.summons.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Sparkles class="h-5 w-5 text-purple-500" />
        Summons
      </h2>
      <div class="space-y-2">
        {#each data.summons as summon (summon.summoned_monster_id + summon.zone_id)}
          <div class="bg-muted/30 rounded-md border p-3">
            <span>Kill {summon.kill_count}</span>
            <span class="text-muted-foreground"> in </span>
            <a
              href="/zones/{summon.zone_id}"
              class="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {summon.zone_name}
            </a>
            <span class="text-muted-foreground"> to summon </span>
            <a
              href="/monsters/{summon.summoned_monster_id}"
              class="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {summon.summoned_monster_name}
            </a>
          </div>
        {/each}
      </div>
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

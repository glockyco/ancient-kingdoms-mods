<script lang="ts">
  import type { ZoneNpc, ZoneMonster, ZoneAltar } from "$lib/types/zones";
  import {
    createRespawnColumns,
    isRespawnColumn,
    RespawnCells,
  } from "$lib/components/monster-table";
  import {
    DataTable,
    DataTableFacetedFilter,
    type ColumnDef,
    type Cell,
    type Row,
    type Header,
  } from "$lib/components/ui/data-table";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import Crown from "@lucide/svelte/icons/crown";
  import Shield from "@lucide/svelte/icons/shield";
  import Sword from "@lucide/svelte/icons/sword";
  import PawPrint from "@lucide/svelte/icons/paw-print";
  import Users from "@lucide/svelte/icons/users";
  import Leaf from "@lucide/svelte/icons/leaf";
  import Gem from "@lucide/svelte/icons/gem";
  import Pickaxe from "@lucide/svelte/icons/pickaxe";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import Scroll from "@lucide/svelte/icons/scroll";
  import Flame from "@lucide/svelte/icons/flame";
  import Layers from "@lucide/svelte/icons/layers";
  import Castle from "@lucide/svelte/icons/castle";
  import Trees from "@lucide/svelte/icons/trees";
  import RefreshCw from "@lucide/svelte/icons/refresh-cw";

  let { data } = $props();

  // Split monsters by type
  function isCritter(m: ZoneMonster): boolean {
    return (
      m.type_name === "Critter" ||
      (m.level === 1 && m.gold_min === 0 && m.gold_max === 0)
    );
  }

  const bosses = $derived(data.monsters.filter((m) => m.is_boss));
  const elites = $derived(
    data.monsters.filter((m) => m.is_elite && !m.is_boss),
  );
  const critters = $derived(
    data.monsters.filter((m) => !m.is_boss && !m.is_elite && isCritter(m)),
  );
  const creatures = $derived(
    data.monsters.filter((m) => !m.is_boss && !m.is_elite && !isCritter(m)),
  );

  // Monster column definitions
  const monsterColumns: ColumnDef<ZoneMonster>[] = [
    {
      accessorKey: "name",
      header: "Name",
      minSize: 220,
    },
    {
      accessorKey: "level",
      header: "Level",
      size: 100,
    },
    {
      accessorKey: "health",
      header: "Health",
      size: 120,
    },
    {
      accessorKey: "spawn_count",
      header: "Spawns",
      size: 110,
    },
    ...createRespawnColumns<ZoneMonster>(),
  ];

  // Altar column definitions
  const altarColumns: ColumnDef<ZoneAltar>[] = [
    {
      accessorKey: "name",
      header: "Name",
      size: 220,
    },
    {
      accessorKey: "required_activation_item_name",
      header: "Activation Item",
      minSize: 220,
    },
    {
      accessorKey: "min_level_required",
      header: "Level",
      size: 150,
    },
    {
      accessorKey: "total_waves",
      header: "Waves",
      size: 150,
    },
  ];

  // NPC column definitions
  const npcColumns: ColumnDef<ZoneNpc>[] = [
    {
      accessorKey: "name",
      header: "Name",
      size: 220,
    },
    {
      id: "roles",
      header: "Roles",
      accessorFn: (row) => getNpcRoles(row),
      enableSorting: false,
      minSize: 220,
      filterFn: (row, columnId, filterValue: string[]) => {
        const roles = row.getValue(columnId) as string[];
        return filterValue.some((v) => roles.includes(v));
      },
    },
  ];

  function getNpcRoles(npc: ZoneNpc): string[] {
    const roles: string[] = [];
    if (npc.roles.is_merchant) roles.push("Merchant");
    if (npc.roles.is_quest_giver) roles.push("Quest Giver");
    if (npc.roles.can_repair_equipment) roles.push("Repairs");
    if (npc.roles.is_bank) roles.push("Banker");
    if (npc.roles.is_skill_master) roles.push("Skill Master");
    if (npc.roles.is_veteran_master) roles.push("Veteran Master");
    if (npc.roles.is_reset_attributes) roles.push("Respec");
    if (npc.roles.is_soul_binder) roles.push("Soul Binder");
    if (npc.roles.is_inkeeper) roles.push("Innkeeper");
    if (npc.roles.is_taskgiver_adventurer) roles.push("Tasks");
    if (npc.roles.is_merchant_adventurer) roles.push("Adventurer Merchant");
    if (npc.roles.is_recruiter_mercenaries) roles.push("Mercenary Recruiter");
    if (npc.roles.is_guard) roles.push("Guard");
    if (npc.roles.is_faction_vendor) roles.push("Faction Vendor");
    if (npc.roles.is_essence_trader) roles.push("Essence Trader");
    if (npc.roles.is_priestess) roles.push("Priestess");
    if (npc.roles.is_augmenter) roles.push("Augmenter");
    if (npc.roles.is_renewal_sage) roles.push("Renewal Sage");
    return roles;
  }

  // Derive unique roles from the NPCs in this zone
  const roleOptions = $derived.by(() => {
    const allRoles: string[] = [];
    for (const npc of data.npcs) {
      for (const role of getNpcRoles(npc)) {
        if (!allRoles.includes(role)) {
          allRoles.push(role);
        }
      }
    }
    return allRoles.sort().map((role) => ({ value: role, label: role }));
  });

  // Group gathering resources by type
  const plants = $derived(data.gatherResources.filter((r) => r.is_plant));
  const minerals = $derived(data.gatherResources.filter((r) => r.is_mineral));
  const radiantSparks = $derived(
    data.gatherResources.filter((r) => r.is_radiant_spark),
  );
  const otherResources = $derived(
    data.gatherResources.filter(
      (r) => !r.is_plant && !r.is_mineral && !r.is_radiant_spark,
    ),
  );
</script>

{#snippet renderMonsterCell({
  cell,
  row,
}: {
  cell: Cell<ZoneMonster, unknown>;
  row: Row<ZoneMonster>;
})}
  {#if cell.column.id === "name"}
    <a
      href="/monsters/{row.original.id}"
      class="text-blue-600 dark:text-blue-400 hover:underline"
    >
      {row.original.name}
    </a>
  {:else if cell.column.id === "level"}
    <span class="ml-auto">{row.original.level}</span>
  {:else if cell.column.id === "health"}
    <span class="ml-auto tabular-nums">
      {row.original.health.toLocaleString()}
    </span>
  {:else if cell.column.id === "spawn_count"}
    <span class="ml-auto">{row.original.spawn_count}</span>
  {:else if isRespawnColumn(cell.column.id)}
    <RespawnCells columnId={cell.column.id} row={row.original} />
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderMonsterHeader({
  header,
}: {
  header: Header<ZoneMonster, unknown>;
})}
  {#if header.id === "level" || header.id === "health" || header.id === "spawn_count" || header.id === "respawn_time" || header.id === "respawn_chance" || header.id === "special"}
    <span class="ml-auto">{header.column.columnDef.header}</span>
  {:else}
    {header.column.columnDef.header}
  {/if}
{/snippet}

{#snippet renderAltarCell({
  cell,
  row,
}: {
  cell: Cell<ZoneAltar, unknown>;
  row: Row<ZoneAltar>;
})}
  {#if cell.column.id === "name"}
    {row.original.name}
  {:else if cell.column.id === "required_activation_item_name"}
    {#if row.original.required_activation_item_id}
      <a
        href="/items/{row.original.required_activation_item_id}"
        class="text-blue-600 dark:text-blue-400 hover:underline"
      >
        {row.original.required_activation_item_name}
      </a>
    {:else}
      <span class="text-muted-foreground">-</span>
    {/if}
  {:else if cell.column.id === "min_level_required"}
    <span class="ml-auto">
      {#if row.original.min_level_required > 1}
        {row.original.min_level_required}
      {:else}
        <span class="text-muted-foreground">-</span>
      {/if}
    </span>
  {:else if cell.column.id === "total_waves"}
    <span class="ml-auto">{row.original.total_waves}</span>
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderAltarHeader({ header }: { header: Header<ZoneAltar, unknown> })}
  {#if header.id === "min_level_required" || header.id === "total_waves"}
    <span class="ml-auto">{header.column.columnDef.header}</span>
  {:else}
    {header.column.columnDef.header}
  {/if}
{/snippet}

{#snippet renderNpcCell({
  cell,
  row,
}: {
  cell: Cell<ZoneNpc, unknown>;
  row: Row<ZoneNpc>;
})}
  {#if cell.column.id === "name"}
    <a
      href="/npcs/{row.original.id}"
      class="text-blue-600 dark:text-blue-400 hover:underline"
    >
      {row.original.name}
    </a>
  {:else if cell.column.id === "roles"}
    {@const roles = cell.getValue() as string[]}
    {#if roles.length > 0}
      <div class="flex flex-wrap gap-1">
        {#each roles as role (role)}
          <span
            class="inline-flex min-w-[90px] items-center justify-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200"
          >
            {role}
          </span>
        {/each}
      </div>
    {:else}
      <span class="text-muted-foreground">-</span>
    {/if}
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderNpcHeader({ header }: { header: Header<ZoneNpc, unknown> })}
  {#if header.column.id === "roles" && roleOptions.length > 0}
    <DataTableFacetedFilter
      column={header.column}
      title="Roles"
      options={roleOptions}
    />
  {:else}
    {header.column.columnDef.header}
  {/if}
{/snippet}

<svelte:head>
  <title>{data.zone.name} - Ancient Kingdoms Compendium</title>
</svelte:head>

<div class="container mx-auto p-8 space-y-6 max-w-5xl">
  <!-- Breadcrumb -->
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Zones", href: "/zones" },
      { label: data.zone.name },
    ]}
  />

  <!-- Header -->
  <div>
    <div class="flex items-center gap-3">
      <h1 class="text-3xl font-bold">{data.zone.name}</h1>
      {#if data.zone.is_dungeon}
        <span
          class="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900 dark:text-purple-200"
        >
          Dungeon
        </span>
      {:else}
        <span
          class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200"
        >
          Overworld
        </span>
      {/if}
    </div>

    <div class="mt-2 flex gap-4 text-sm text-muted-foreground">
      {#if data.zone.level_min !== null || data.zone.level_max !== null}
        <span>
          Level: {#if data.zone.level_min === data.zone.level_max}
            {data.zone.level_min}
          {:else}
            {data.zone.level_min ?? "?"} - {data.zone.level_max ?? "?"}
          {/if}
        </span>
      {/if}
      {#if data.zone.discovery_exp > 0}
        <span>Discovery XP: {data.zone.discovery_exp}</span>
      {/if}
      {#if data.zone.weather_type}
        <span>Weather: {data.zone.weather_type}</span>
      {/if}
    </div>
  </div>

  <!-- Bosses Section -->
  {#if bosses.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Crown class="h-5 w-5 text-cyan-500" />
        Bosses ({bosses.length})
      </h2>
      <DataTable
        data={bosses}
        columns={monsterColumns}
        renderCell={renderMonsterCell}
        renderHeader={renderMonsterHeader}
        initialSorting={[
          { id: "level", desc: true },
          { id: "health", desc: true },
          { id: "name", desc: false },
        ]}
        urlKey="zone-{data.zone.id}-bosses"
        pageSize={10}
        zebraStripe={true}
        class="bg-muted/30"
      />
    </section>
  {/if}

  <!-- Elites Section -->
  {#if elites.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Shield class="h-5 w-5 text-purple-500" />
        Elites ({elites.length})
      </h2>
      <DataTable
        data={elites}
        columns={monsterColumns}
        renderCell={renderMonsterCell}
        renderHeader={renderMonsterHeader}
        initialSorting={[
          { id: "level", desc: true },
          { id: "health", desc: true },
          { id: "name", desc: false },
        ]}
        urlKey="zone-{data.zone.id}-elites"
        pageSize={10}
        zebraStripe={true}
        class="bg-muted/30"
      />
    </section>
  {/if}

  <!-- Creatures Section -->
  {#if creatures.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Sword class="h-5 w-5 text-red-500" />
        Creatures ({creatures.length})
      </h2>
      <DataTable
        data={creatures}
        columns={monsterColumns}
        renderCell={renderMonsterCell}
        renderHeader={renderMonsterHeader}
        initialSorting={[
          { id: "level", desc: true },
          { id: "health", desc: true },
          { id: "name", desc: false },
        ]}
        urlKey="zone-{data.zone.id}-creatures"
        pageSize={10}
        zebraStripe={true}
        class="bg-muted/30"
      />
    </section>
  {/if}

  <!-- Altars Section -->
  {#if data.altars.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Flame class="h-5 w-5 text-orange-500" />
        Altars ({data.altars.length})
      </h2>
      <DataTable
        data={data.altars}
        columns={altarColumns}
        renderCell={renderAltarCell}
        renderHeader={renderAltarHeader}
        urlKey="zone-{data.zone.id}-altars"
        pageSize={10}
        zebraStripe={true}
        class="bg-muted/30"
      />
    </section>
  {/if}

  <!-- Renewal Sage Section -->
  {#if data.renewalSage}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <RefreshCw class="h-5 w-5 text-emerald-500" />
        Renewal Sage
      </h2>
      <div class="bg-muted/30 rounded-md border p-4">
        <p>
          <a
            href="/npcs/{data.renewalSage.id}"
            class="text-blue-600 dark:text-blue-400 hover:underline"
          >
            {data.renewalSage.name}
          </a>
          in
          <a
            href="/zones/{data.renewalSage.zone_id}"
            class="text-blue-600 dark:text-blue-400 hover:underline"
          >
            {data.renewalSage.zone_name}
          </a>
          can reset all spawns in this dungeon{#if data.renewalSage.gold_cost > 0}&nbsp;for
            <span class="text-yellow-600 dark:text-yellow-400"
              >{data.renewalSage.gold_cost.toLocaleString()} gold</span
            >{/if}.
        </p>
      </div>
    </section>
  {/if}

  <!-- Critters Section -->
  {#if critters.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <PawPrint class="h-5 w-5 text-green-500" />
        Critters ({critters.length})
      </h2>
      <DataTable
        data={critters}
        columns={monsterColumns}
        renderCell={renderMonsterCell}
        renderHeader={renderMonsterHeader}
        initialSorting={[
          { id: "level", desc: true },
          { id: "health", desc: true },
          { id: "name", desc: false },
        ]}
        urlKey="zone-{data.zone.id}-critters"
        pageSize={10}
        zebraStripe={true}
        class="bg-muted/30"
      />
    </section>
  {/if}

  <!-- NPCs Section -->
  {#if data.npcs.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Users class="h-5 w-5 text-blue-500" />
        NPCs ({data.npcs.length})
      </h2>
      <DataTable
        data={data.npcs}
        columns={npcColumns}
        renderCell={renderNpcCell}
        renderHeader={renderNpcHeader}
        initialSorting={[{ id: "name", desc: false }]}
        urlKey="zone-{data.zone.id}-npcs"
        pageSize={10}
        zebraStripe={true}
        class="bg-muted/30"
      />
    </section>
  {/if}

  <!-- Gathering Resources Section -->
  {#if data.gatherResources.length > 0}
    <section class="mb-8">
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Gem class="h-5 w-5 text-amber-500" />
        Resources ({data.gatherResources.length})
      </h2>

      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {#if plants.length > 0}
          <div class="rounded-md border bg-muted/30 p-4">
            <h3
              class="mb-3 font-medium text-green-600 dark:text-green-400 flex items-center gap-2"
            >
              <Leaf class="h-4 w-4" />
              Plants ({plants.length})
            </h3>
            <ul class="space-y-1">
              {#each plants as resource (resource.id)}
                <li class="flex justify-between">
                  <a
                    href="/gather-items/{resource.id}"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {resource.name}
                  </a>
                  <span class="text-muted-foreground">
                    x{resource.spawn_count}
                  </span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        {#if minerals.length > 0}
          <div class="rounded-md border bg-muted/30 p-4">
            <h3
              class="mb-3 font-medium text-amber-600 dark:text-amber-400 flex items-center gap-2"
            >
              <Pickaxe class="h-4 w-4" />
              Minerals ({minerals.length})
            </h3>
            <ul class="space-y-1">
              {#each minerals as resource (resource.id)}
                <li class="flex justify-between">
                  <a
                    href="/gather-items/{resource.id}"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {resource.name}
                  </a>
                  <span class="text-muted-foreground">
                    x{resource.spawn_count}
                  </span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        {#if radiantSparks.length > 0}
          <div class="rounded-md border bg-muted/30 p-4">
            <h3
              class="mb-3 font-medium text-purple-600 dark:text-purple-400 flex items-center gap-2"
            >
              <Sparkles class="h-4 w-4" />
              Radiant Sparks ({radiantSparks.length})
            </h3>
            <ul class="space-y-1">
              {#each radiantSparks as resource (resource.id)}
                <li class="flex justify-between">
                  <a
                    href="/gather-items/{resource.id}"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {resource.name}
                  </a>
                  <span class="text-muted-foreground">
                    x{resource.spawn_count}
                  </span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        {#if otherResources.length > 0}
          <div class="rounded-md border bg-muted/30 p-4">
            <h3
              class="mb-3 font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2"
            >
              <Scroll class="h-4 w-4" />
              Other ({otherResources.length})
            </h3>
            <ul class="space-y-1">
              {#each otherResources as resource (resource.id)}
                <li class="flex justify-between">
                  <a
                    href="/gather-items/{resource.id}"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {resource.name}
                  </a>
                  <span class="text-muted-foreground">
                    x{resource.spawn_count}
                  </span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>
    </section>
  {/if}

  <!-- Sub-Zones Section -->
  {#if data.subZones.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Layers class="h-5 w-5 text-slate-500" />
        Areas ({data.subZones.length})
      </h2>
      <div class="flex flex-wrap gap-2">
        {#each data.subZones as subZone (subZone.id)}
          <span
            class="inline-flex items-center gap-1.5 rounded-md border bg-muted/30 px-3 py-1.5 text-sm"
          >
            {#if subZone.is_outdoor}
              <Trees class="h-3.5 w-3.5 text-green-500" />
            {:else}
              <Castle class="h-3.5 w-3.5 text-purple-500" />
            {/if}
            {subZone.name}
          </span>
        {/each}
      </div>
    </section>
  {/if}

  <!-- Zone Connections Section -->
  {#if data.connectedZones.length > 0}
    <section class="mb-8">
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <MapPin class="h-5 w-5 text-emerald-500" />
        Connected Zones ({data.connectedZones.length})
      </h2>
      <div class="flex flex-wrap gap-2">
        {#each data.connectedZones as zone (zone.id)}
          <a
            href="/zones/{zone.id}"
            class="inline-flex items-center gap-1.5 rounded-md border bg-muted/50 px-3 py-1.5 text-sm transition-colors hover:bg-muted"
          >
            {#if zone.is_dungeon}
              <Castle class="h-3.5 w-3.5 text-purple-500" />
            {:else}
              <Trees class="h-3.5 w-3.5 text-green-500" />
            {/if}
            {zone.name}
          </a>
        {/each}
      </div>
    </section>
  {/if}
</div>

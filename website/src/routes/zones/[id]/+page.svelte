<script lang="ts">
  import MethodList from "$lib/components/acquisition/MethodList.svelte";
  import Requirements from "$lib/components/acquisition/Requirements.svelte";
  import {
    minimumGoldQuantity,
    quantityText,
  } from "$lib/components/acquisition/display";
  import { SvelteMap } from "svelte/reactivity";
  import type {
    ZoneNpc,
    ZoneMonster,
    ZoneAltar,
    ZoneChest,
    ZoneTrap,
  } from "$lib/types/zones";
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
  import MapLink from "$lib/components/MapLink.svelte";
  import EntityIcon from "$lib/components/EntityIcon.svelte";
  import EntityLink from "$lib/components/EntityLink.svelte";
  import MechanicsLink from "$lib/components/MechanicsLink.svelte";
  import RoleBadges from "$lib/components/RoleBadges.svelte";
  import { ROLE_CONFIG, getActiveRoles } from "$lib/utils/roles";
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
  import Fish from "@lucide/svelte/icons/fish";
  import Scroll from "@lucide/svelte/icons/scroll";
  import Flame from "@lucide/svelte/icons/flame";
  import Layers from "@lucide/svelte/icons/layers";
  import Castle from "@lucide/svelte/icons/castle";
  import Trees from "@lucide/svelte/icons/trees";
  import RefreshCw from "@lucide/svelte/icons/refresh-cw";
  import Box from "@lucide/svelte/icons/box";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import BookOpen from "@lucide/svelte/icons/book-open";
  import {
    formatDuration,
    formatPercent,
    formatNumber,
  } from "$lib/utils/format";
  import { statName, formatStat } from "$lib/stats";
  import { base } from "$app/paths";
  import Seo from "$lib/components/Seo.svelte";
  import { detailTitle } from "$lib/seo/title";
  import TrapMechanics from "$lib/components/TrapMechanics.svelte";
  import TrapEffect from "$lib/components/TrapEffect.svelte";
  import { fishingSpotBaseId } from "../../../../scripts/gathering-resource-ids.mjs";

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

  const weatherNames: Record<string, string> = {
    Rain: "Rain",
    Snow: "Snow",
    Ashes: "Falling ash",
    SandStorm: "Sandstorm",
    FireEmber: "Fire embers",
  };
  const weather = $derived(weatherNames[data.zone.weather_type ?? ""]);

  type TrapRow = ZoneTrap & { count: number };
  const trapRows = $derived.by(() => {
    const groups = new SvelteMap<string, TrapRow>();
    for (const trap of data.traps) {
      // Teleports may land at different positions within the same zone.
      const key = trap.teleport_zone_id
        ? trap.id
        : JSON.stringify([
            trap.name,
            trap.type,
            trap.effect_skill_id,
            trap.fire_interval,
          ]);
      const group = groups.get(key);
      if (group) group.count++;
      else groups.set(key, { ...trap, count: 1 });
    }
    return [...groups.values()];
  });

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
      size: 150,
    },
    {
      accessorKey: "health",
      header: statName("health"),
      size: 210,
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
      accessorFn: (row) => getActiveRoles(row.roles).map((r) => r.key),
      enableSorting: false,
      minSize: 220,
      filterFn: (row, columnId, filterValue: string[]) => {
        const roleKeys = row.getValue(columnId) as string[];
        return filterValue.some((v) => roleKeys.includes(v));
      },
    },
  ];

  // Chest column definitions
  const chestColumns: ColumnDef<ZoneChest>[] = [
    {
      id: "name",
      header: "Chest",
      size: 80,
    },
    {
      id: "key",
      header: "Key",
      minSize: 200,
      accessorFn: (row) =>
        row.requiredKeys
          .map((key) =>
            key.withheld
              ? "Unpublished key"
              : (key.itemName ?? key.itemId ?? ""),
          )
          .join(" or "),
      sortingFn: (rowA, rowB) => {
        const a = rowA.getValue<string>("key");
        const b = rowB.getValue<string>("key");
        if (!a && !b) return 0;
        if (!a) return 1;
        if (!b) return -1;
        return a.localeCompare(b);
      },
    },
    {
      id: "item",
      header: "Item",
      minSize: 150,
      accessorFn: (row) =>
        row.primaryRewards
          .filter((reward) => reward.resourceKind === "item")
          .map((reward) =>
            reward.withheld
              ? "Unpublished item"
              : (reward.itemName ?? reward.itemId ?? ""),
          )
          .join(", "),
    },
    {
      id: "chance",
      header: "Item or gold chance",
      size: 170,
      accessorFn: (row) => {
        let minimum = Infinity;
        for (const chance of row.rewardProbabilities) {
          if (chance === null) return undefined;
          minimum = Math.min(minimum, chance);
        }
        return minimum === Infinity ? undefined : minimum;
      },
      sortingFn: "basic",
      sortUndefined: "last",
    },
    {
      id: "drops",
      header: "Random Drops",
      size: 170,
      accessorFn: (row) => row.drop_count,
    },
    {
      id: "gold",
      header: "Gold",
      size: 140,
      accessorFn: (row) => minimumGoldQuantity(row.primaryRewards),
      sortingFn: "basic",
      sortUndefined: "last",
    },
    {
      id: "location",
      header: "Location",
      size: 100,
      enableSorting: false,
    },
    {
      accessorKey: "respawn_time",
      header: "Respawn",
      size: 100,
    },
  ];

  const trapColumns: ColumnDef<TrapRow>[] = [
    {
      id: "effect",
      header: "Effect",
      size: 360,
      accessorFn: (row) =>
        row.effect_skill_name ?? row.teleport_zone_name ?? "Unknown effect",
    },
    {
      id: "mechanics",
      header: "Mechanics",
      minSize: 280,
      accessorFn: (row) => row.name,
    },
    { accessorKey: "count", header: "Traps", size: 100 },
  ];

  // Derive unique roles from the NPCs in this zone for filtering
  const roleOptions = $derived.by(() => {
    const allRoleKeys: string[] = [];
    for (const npc of data.npcs) {
      for (const role of getActiveRoles(npc.roles)) {
        if (!allRoleKeys.includes(role.key)) {
          allRoleKeys.push(role.key);
        }
      }
    }
    return ROLE_CONFIG.filter((r) => allRoleKeys.includes(r.key))
      .map((r) => ({ value: r.key, label: r.label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  // Group gathering resources by type
  const plants = $derived(data.gatherResources.filter((r) => r.is_plant));
  const minerals = $derived(data.gatherResources.filter((r) => r.is_mineral));
  const radiantSparks = $derived(
    data.gatherResources.filter((r) => r.is_radiant_spark),
  );
  const fishingSpots = $derived.by(() => {
    const groups = new SvelteMap<
      string,
      {
        id: string;
        name: string;
        spawn_count: number;
        variants: number;
      }
    >();
    for (const resource of data.gatherResources) {
      if (!resource.is_fishing_spot) continue;
      const id = fishingSpotBaseId(resource.id);
      const group = groups.get(id);
      if (group) {
        group.spawn_count += resource.spawn_count;
        group.variants++;
      } else {
        groups.set(id, {
          id,
          name: resource.name,
          spawn_count: resource.spawn_count,
          variants: 1,
        });
      }
    }
    return [...groups.values()];
  });
  const otherResources = $derived(
    data.gatherResources.filter(
      (r) =>
        !r.is_plant &&
        !r.is_mineral &&
        !r.is_radiant_spark &&
        !r.is_fishing_spot,
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
  {@const hasVariance = row.original.level_min !== row.original.level_max}
  {#if cell.column.id === "name"}
    <EntityLink
      href="/monsters/{row.original.id}"
      name={row.original.name}
      domain="monster"
      entityId={row.original.id}
      imageKind="primary"
      imageAvailable={row.original.visual_public_path}
      variant={row.original.visual_public_path ? "reference" : "text"}
      size={32}
      title={row.original.name}
      class="min-w-0 max-w-full"
      nameClass="truncate"
    />
  {:else if cell.column.id === "level"}
    <span class="ml-auto">
      {row.original.level_min}{#if hasVariance}
        to {row.original.level_max}{/if}
    </span>
  {:else if cell.column.id === "health"}
    {@const minHealth =
      row.original.health_base +
      row.original.health_per_level * (row.original.level_min - 1)}
    {@const maxHealth =
      row.original.health_base +
      row.original.health_per_level * (row.original.level_max - 1)}
    <span class="ml-auto">
      {formatStat("health", minHealth)}{#if hasVariance}
        to {formatStat("health", maxHealth)}
      {/if}
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
    <span>{row.original.name}</span>
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
    <EntityLink
      href="/npcs/{row.original.id}"
      name={row.original.name}
      domain="npc"
      entityId={row.original.id}
      imageKind="primary"
      imageAvailable={row.original.visual_public_path}
      variant={row.original.visual_public_path ? "reference" : "text"}
      size={32}
      title={row.original.name}
      class="min-w-0 max-w-full"
      nameClass="truncate"
    />
  {:else if cell.column.id === "roles"}
    <RoleBadges roles={row.original.roles} />
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

{#snippet renderChestCell({
  cell,
  row,
}: {
  cell: Cell<ZoneChest, unknown>;
  row: Row<ZoneChest>;
})}
  {#if cell.column.id === "name"}
    <a
      href="/chests/{row.original.id}"
      aria-label={`Chest in ${data.zone.name}`}
      title={`Chest in ${data.zone.name}`}
      class="inline-flex"
    >
      <EntityIcon
        src={row.original.visual_public_path
          ? `${base}/${row.original.visual_public_path}`
          : null}
        alt=""
        fallback={Box}
        size={32}
      />
    </a>
  {:else if cell.column.id === "key"}
    {#each row.original.requiredKeys as key, index (JSON.stringify( [key.itemId, key.withheld] ))}
      <div>
        {#if index > 0}<span class="text-muted-foreground">or </span>{/if}
        {#if key.withheld}
          <span class="text-muted-foreground">Unpublished key</span>
        {:else if key.itemId}
          <a
            href="/items/{key.itemId}"
            class="text-blue-600 dark:text-blue-400 hover:underline"
          >
            {key.itemName ?? key.itemId}
          </a>
        {/if}
      </div>
    {:else}
      <span class="text-muted-foreground">-</span>
    {/each}
  {:else if cell.column.id === "item"}
    {#each row.original.primaryRewards.filter((reward) => reward.resourceKind === "item") as reward (JSON.stringify( [reward.resourceKind, reward.itemId, reward.delivery, reward.withheld] ))}
      <div>
        {#if reward.withheld}
          <span class="text-muted-foreground">Unpublished item</span>
        {:else if reward.itemId}
          <a
            href="/items/{reward.itemId}"
            class="text-blue-600 dark:text-blue-400 hover:underline"
          >
            {reward.itemName ?? reward.itemId}
          </a>
        {/if}
        <span class="text-muted-foreground"
          >&nbsp;{quantityText(reward.quantity)}</span
        >
        {#if reward.delivery !== "inventory"}
          <span class="text-muted-foreground">
            ({reward.delivery.replaceAll("_", " ")})</span
          >
        {/if}
      </div>
    {:else}
      <span class="text-muted-foreground">-</span>
    {/each}
  {:else if cell.column.id === "chance"}
    {#each row.original.rewardProbabilities as chance (chance)}
      <div>
        {chance === null
          ? "Unknown"
          : formatPercent(chance, {
              decimals: 1,
              trailingZeros: true,
            })}
      </div>
    {/each}
  {:else if cell.column.id === "drops"}
    {#if row.original.drop_count > 0}
      <span class="text-muted-foreground">{row.original.drop_count} items</span>
    {:else}
      <span class="text-muted-foreground">-</span>
    {/if}
  {:else if cell.column.id === "gold"}
    {#each row.original.primaryRewards.filter((reward) => reward.resourceKind === "gold") as reward (JSON.stringify( [reward.resourceKind, reward.itemId, reward.delivery, reward.withheld] ))}
      <div>
        {quantityText(reward.quantity)}
        {#if reward.delivery !== "inventory"}
          <span class="text-muted-foreground">
            ({reward.delivery.replaceAll("_", " ")})</span
          >
        {/if}
      </div>
    {:else}
      <span class="text-muted-foreground">-</span>
    {/each}
  {:else if cell.column.id === "location"}
    <MapLink entityId={row.original.id} entityType="chest" compact />
  {:else if cell.column.id === "respawn_time"}
    <span class="ml-auto">{formatDuration(row.original.respawn_time)}</span>
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderChestHeader({ header }: { header: Header<ZoneChest, unknown> })}
  {#if header.id === "respawn_time"}
    <span class="ml-auto">{header.column.columnDef.header}</span>
  {:else}
    {header.column.columnDef.header}
  {/if}
{/snippet}

{#snippet renderTrapCell({
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
  {:else if cell.column.id === "mechanics"}
    <TrapMechanics
      type={row.original.type}
      fireInterval={row.original.fire_interval}
    />
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderTrapHeader({ header }: { header: Header<TrapRow, unknown> })}
  {header.column.columnDef.header}
{/snippet}

<Seo
  title={detailTitle(data.zone.name, {
    family: data.zone.is_dungeon ? "Dungeon" : "Zone",
  })}
  description={data.description}
  path={`/zones/${data.zone.id}`}
/>

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
    <div class="flex items-center gap-3 flex-wrap">
      <h1 class="text-3xl font-bold">{data.zone.name}</h1>
      {#if data.zone.has_map_bounds}
        <MapLink entityId={data.zone.id} entityType="zone" />
      {/if}
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
          Monster levels: {#if data.zone.level_min === data.zone.level_max}
            {data.zone.level_min}
          {:else}
            {data.zone.level_min ?? "?"} to {data.zone.level_max ?? "?"}
            {#if data.zone.level_median !== null}
              (median {data.zone.level_median})
            {/if}
          {/if}
        </span>
      {/if}
      {#if data.zone.discovery_exp > 0}
        <span
          >Discovery XP: <MechanicsLink section="experience"
            >{formatNumber(data.zone.discovery_exp)}</MechanicsLink
          ></span
        >
      {/if}
      {#if weather}
        <span>Weather: {weather}</span>
      {/if}
    </div>
  </div>
  <!-- Source: server-scripts/UIMap.cs:Update. Temple of Valaark replaces the live map with an illustration. -->
  {#if !data.zone.has_map_bounds}
    <p class="rounded-md border bg-muted/30 p-4 text-muted-foreground">
      The game shows no live map inside {data.zone.name}, so nothing in this
      zone appears on the map.
    </p>
  {/if}

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
        <!-- Source: server-scripts/Npc.cs:1738-1744; server-scripts/Player.cs:14585-14612 — renewal uses gold when priced and resets respawn timers for monsters that can return. -->
        <!-- Source: server-scripts/UINpcTrading.cs:870-878 — Charisma can reduce the ordinary dungeon fee by up to 25%. -->
        <p class="flex flex-wrap items-center gap-x-1 gap-y-2">
          <EntityLink
            href="/npcs/{data.renewalSage.id}"
            name={data.renewalSage.name}
            domain="npc"
            entityId={data.renewalSage.id}
            imageKind="primary"
            imageAvailable={data.renewalSage.visual_public_path}
            variant={data.renewalSage.visual_public_path ? "reference" : "text"}
            size={32}
          />
          <span>in</span>
          <a
            href="/zones/{data.renewalSage.zone_id}"
            class="text-blue-600 dark:text-blue-400 hover:underline"
          >
            {data.renewalSage.zone_name}
          </a>
          <span>
            makes this dungeon's dead monsters ready to respawn.
            {#if data.renewalSage.gold_cost > 0}
              The fee is <span
                class="whitespace-nowrap text-yellow-600 dark:text-yellow-400"
                >{formatNumber(data.renewalSage.gold_cost)} gold</span
              >, less your Charisma discount of up to 25%.
            {/if}
          </span>
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

  <!-- Chests Section -->
  {#if data.chests.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Box class="h-5 w-5 text-sky-500" />
        Chests ({data.chests.length})
      </h2>
      <DataTable
        data={data.chests}
        columns={chestColumns}
        renderCell={renderChestCell}
        renderHeader={renderChestHeader}
        initialSorting={[{ id: "key", desc: false }]}
        urlKey="zone-{data.zone.id}-chests"
        pageSize={10}
        zebraStripe={true}
        class="bg-muted/30"
      />
      <details class="mt-4 rounded-md border bg-muted/30 p-4">
        <summary class="cursor-pointer font-medium"
          >Chest requirements, costs and outcomes</summary
        >
        <div class="mt-4">
          <MethodList
            methods={data.chests.flatMap((chest) => chest.methods)}
            items={data.acquisitionItems}
            names={data.acquisitionNames}
          />
        </div>
      </details>
    </section>
  {/if}

  <!-- Traps Section -->
  {#if data.traps.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <TriangleAlert class="h-5 w-5 text-rose-600" />
        Traps ({data.traps.length})
      </h2>
      <DataTable
        data={trapRows}
        columns={trapColumns}
        renderCell={renderTrapCell}
        renderHeader={renderTrapHeader}
        initialSorting={[{ id: "effect", desc: false }]}
        urlKey="zone-{data.zone.id}-traps"
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
        Resources ({plants.length +
          minerals.length +
          radiantSparks.length +
          fishingSpots.length +
          otherResources.length})
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
                    {resource.spawn_count}
                    {resource.spawn_count === 1 ? "spawn" : "spawns"}
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
                    {resource.spawn_count}
                    {resource.spawn_count === 1 ? "spawn" : "spawns"}
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
                    {resource.spawn_count}
                    {resource.spawn_count === 1 ? "spawn" : "spawns"}
                  </span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        {#if fishingSpots.length > 0}
          <div class="rounded-md border bg-muted/30 p-4">
            <h3
              class="mb-3 font-medium text-cyan-600 dark:text-cyan-400 flex items-center gap-2"
            >
              <Fish class="h-4 w-4" />
              Fishing Spots ({fishingSpots.length})
            </h3>
            <ul class="space-y-1">
              {#each fishingSpots as resource (resource.id)}
                <li class="flex justify-between gap-3">
                  <a
                    href="/gather-items/{resource.id}"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {resource.name}
                  </a>
                  <span class="text-muted-foreground">
                    {resource.spawn_count}
                    {resource.spawn_count === 1 ? "spawn" : "spawns"}
                    {#if resource.variants > 1}
                      across {resource.variants} variants
                    {/if}
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
                    {resource.spawn_count}
                    {resource.spawn_count === 1 ? "spawn" : "spawns"}
                  </span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>
    </section>
  {/if}

  <!-- Lore Section -->
  {#if data.zone.description}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <BookOpen class="h-5 w-5 text-cyan-500" />
        Lore
      </h2>
      <div class="bg-muted/30 rounded-md border p-4">
        <p class="whitespace-pre-wrap">{data.zone.description}</p>
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
            class="inline-flex items-center gap-1.5 rounded-md bg-muted/40 px-3 py-1.5 text-sm"
            title={subZone.is_outdoor ? "Outdoor" : "Indoor"}
          >
            {#if subZone.is_outdoor}
              <Trees
                class="h-3.5 w-3.5 text-green-500"
                role="img"
                aria-label="Outdoor"
                aria-hidden="false"
              />
            {:else}
              <Castle
                class="h-3.5 w-3.5 text-purple-500"
                role="img"
                aria-label="Indoor"
                aria-hidden="false"
              />
            {/if}
            {subZone.name}
          </span>
        {/each}
      </div>
    </section>
  {/if}

  <!-- Zone Connections Section -->
  {#if data.connectedZones.length > 0 || data.portals.length > 0}
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
            title={zone.is_dungeon ? "Dungeon" : "Overworld"}
          >
            {#if zone.is_dungeon}
              <Castle
                class="h-3.5 w-3.5 text-purple-500"
                role="img"
                aria-label="Dungeon"
                aria-hidden="false"
              />
            {:else}
              <Trees
                class="h-3.5 w-3.5 text-green-500"
                role="img"
                aria-label="Overworld"
                aria-hidden="false"
              />
            {/if}
            {zone.name}
          </a>
        {/each}
      </div>
      {#if data.portals.length > 0}
        <div class="mt-4 space-y-3">
          {#each data.portals as portal (portal.id)}
            <div class="rounded-md border bg-muted/30 p-4 space-y-2">
              <div class="flex items-center gap-2">
                {#if portal.to_zone_id && portal.name}<a
                    href="/zones/{portal.to_zone_id}"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                    >{portal.name}</a
                  >{:else}<span
                    >{portal.destination_withheld
                      ? "Unpublished destination"
                      : "Portal"}</span
                  >{/if}
                {#if portal.is_closed}<span
                    class="text-sm text-muted-foreground">Closed</span
                  >{/if}
              </div>
              <Requirements
                roots={portal.requirements}
                names={data.acquisitionNames}
              />
            </div>
          {/each}
        </div>
      {/if}
    </section>
  {/if}
</div>

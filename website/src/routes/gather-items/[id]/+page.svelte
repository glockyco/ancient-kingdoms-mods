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
  import ObtainabilityTree from "$lib/components/ObtainabilityTree.svelte";
  import type {
    GatheringResourceDrop,
    GatheringResourceSpawn,
  } from "$lib/types/gather-items";
  import { formatPercent, formatDuration } from "$lib/utils/format";
  import Key from "@lucide/svelte/icons/key";
  import ListTree from "@lucide/svelte/icons/list-tree";
  import Gem from "@lucide/svelte/icons/gem";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import Calculator from "@lucide/svelte/icons/calculator";
  import BookOpen from "@lucide/svelte/icons/book-open";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  // Roman numerals for tier display
  const romanNumerals = ["I", "II", "III", "IV", "V"];

  // Type colors for badges
  const typeColors: Record<string, string> = {
    Plant: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    Mineral:
      "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    "Radiant Spark":
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  };

  // Quality names for pickaxe
  const qualityNames = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];

  // Get type string from resource flags
  function getResourceType(resource: {
    is_plant: boolean;
    is_mineral: boolean;
    is_radiant_spark: boolean;
  }): string {
    if (resource.is_plant) return "Plant";
    if (resource.is_mineral) return "Mineral";
    if (resource.is_radiant_spark) return "Radiant Spark";
    return "Resource";
  }

  // Derive display values
  const resourceType = $derived(getResourceType(data.resource));

  // Skill level state (0-100%)
  let skillLevel = $state(0);
  let pickaxeQuality = $state(0);

  // Herbalism success chance formula from game code
  function getHerbalismSuccessChance(resourceLevel: number): number {
    const skill = skillLevel / 100;
    switch (resourceLevel) {
      case 0:
        return 100;
      case 1:
        return Math.min(100, (0.5 + skill * 2.5) * 100);
      case 2:
        return Math.min(100, (0.25 + skill) * 100);
      case 3:
        return Math.min(100, skill * 95);
      default:
        return Math.min(100, skill * 85);
    }
  }

  // Mining success chance formula from game code
  function getMiningSuccessChance(resourceLevel: number): number {
    const skill = skillLevel / 100;
    switch (resourceLevel) {
      case 0:
        return Math.min(100, (0.8 + pickaxeQuality + skill) * 100);
      case 1:
        return Math.min(100, (0.1 + pickaxeQuality * 0.2 + skill) * 100);
      case 2:
        return Math.min(100, (pickaxeQuality * 0.15 + skill * 0.6) * 100);
      case 3:
        return Math.min(100, (pickaxeQuality * 0.1 + skill * 0.4) * 100);
      default:
        return Math.min(100, (pickaxeQuality * 0.05 + skill * 0.2) * 100);
    }
  }

  function getSuccessChanceColor(chance: number): string {
    if (chance >= 100) return "text-green-500";
    if (chance >= 75) return "text-lime-500";
    if (chance >= 50) return "text-yellow-500";
    if (chance >= 25) return "text-orange-500";
    return "text-red-500";
  }

  // Skill gain chance: 70% at 0 skill, down to 20% at 100% skill
  function getSkillGainChance(): number {
    const skill = skillLevel / 100;
    return Math.max(0, (0.7 - skill / 2) * 100);
  }

  // Skill gain amount: Random(1-3) / (successChance * 1000)
  function getSkillGainAmount(successChance: number): [number, number] {
    if (successChance <= 0) return [0, 0];
    const successFraction = successChance / 100;
    const min = (1 / (successFraction * 1000)) * 100;
    const max = (3 / (successFraction * 1000)) * 100;
    return [min, max];
  }

  // Effortless thresholds
  function isEffortless(resourceLevel: number): boolean {
    const skill = skillLevel / 100;
    switch (resourceLevel) {
      case 0:
        return skill >= 0.25;
      case 1:
        return skill >= 0.5;
      case 2:
        return skill >= 0.75;
      default:
        return false;
    }
  }

  // Radiant Aether drop chance: radiantSeekerLevel * 5%
  function getRadiantAetherChance(): number {
    const skill = skillLevel / 100;
    return skill * 5;
  }

  // Computed success chance based on resource type
  const successChance = $derived.by(() => {
    const resource = data.resource;
    if (resource.is_plant) {
      return getHerbalismSuccessChance(resource.level);
    } else if (resource.is_mineral) {
      return getMiningSuccessChance(resource.level);
    }
    return 0;
  });

  const effortless = $derived.by(() => {
    // Radiant sparks are never effortless (always grant skill)
    if (data.resource.is_radiant_spark) return false;
    return isEffortless(data.resource.level);
  });

  // Skill gain amount for plants and minerals (radiant sparks have fixed 0.10%-0.30%)
  const skillGain = $derived(getSkillGainAmount(successChance));

  // Drop table columns
  const dropColumns: ColumnDef<GatheringResourceDrop>[] = [
    {
      accessorKey: "item_name",
      header: "Item",
      minSize: 300,
    },
    {
      accessorKey: "drop_rate",
      header: "Drop Rate",
      size: 140,
    },
  ];

  // Spawn location columns
  const spawnColumns: ColumnDef<GatheringResourceSpawn>[] = [
    {
      accessorKey: "zone_name",
      header: "Zone",
      minSize: 200,
    },
    {
      accessorKey: "spawn_count",
      header: "Spawns",
      size: 120,
    },
  ];
</script>

{#snippet renderDropCell({
  cell,
  row,
}: {
  cell: Cell<GatheringResourceDrop, unknown>;
  row: Row<GatheringResourceDrop>;
})}
  {#if cell.column.id === "item_name"}
    <ItemLink itemId={row.original.item_id} itemName={row.original.item_name} />
  {:else if cell.column.id === "drop_rate"}
    <span class="ml-auto">
      {#if row.original.actual_drop_chance != null}
        {formatPercent(row.original.actual_drop_chance)}
      {:else}
        {formatPercent(row.original.drop_rate)}
      {/if}
    </span>
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderDropHeader({
  header,
}: {
  header: Header<GatheringResourceDrop, unknown>;
})}
  {#if header.id === "drop_rate"}
    <span class="ml-auto">{header.column.columnDef.header}</span>
  {:else}
    {header.column.columnDef.header}
  {/if}
{/snippet}

{#snippet renderSpawnCell({
  cell,
  row,
}: {
  cell: Cell<GatheringResourceSpawn, unknown>;
  row: Row<GatheringResourceSpawn>;
})}
  {#if cell.column.id === "zone_name"}
    <a
      href="/zones/{row.original.zone_id}"
      class="text-blue-600 dark:text-blue-400 hover:underline"
    >
      {row.original.zone_name}
    </a>
  {:else if cell.column.id === "spawn_count"}
    <span class="ml-auto">{row.original.spawn_count}</span>
  {:else}
    {cell.getValue()}
  {/if}
{/snippet}

{#snippet renderSpawnHeader({
  header,
}: {
  header: Header<GatheringResourceSpawn, unknown>;
})}
  {#if header.id === "spawn_count"}
    <span class="ml-auto">{header.column.columnDef.header}</span>
  {:else}
    {header.column.columnDef.header}
  {/if}
{/snippet}

<svelte:head>
  <title>{data.resource.name} - Ancient Kingdoms Compendium</title>
</svelte:head>

<div class="container mx-auto p-8 space-y-6 max-w-5xl">
  <!-- Breadcrumb -->
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Gathering Resources", href: "/gather-items" },
      { label: data.resource.name },
    ]}
  />

  <!-- Header -->
  <div>
    <div class="flex items-center gap-3 flex-wrap">
      <h1 class="text-3xl font-bold">{data.resource.name}</h1>
      <span
        class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {typeColors[
          resourceType
        ] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'}"
      >
        {resourceType}
      </span>
    </div>

    <div class="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
      {#if data.resource.level >= 0 && data.resource.level < romanNumerals.length}
        <span>Tier {romanNumerals[data.resource.level]}</span>
      {:else if data.resource.level > 0}
        <span>Tier {data.resource.level}</span>
      {/if}
      {#if data.resource.is_radiant_spark}
        <span>Respawn: 1m40s – 1h (random)</span>
      {:else if data.resource.is_mineral && data.resource.respawn_time > 0}
        <span>
          Respawn: {formatDuration(Math.floor(data.resource.respawn_time / 2))} –
          {formatDuration(data.resource.respawn_time)}
        </span>
      {:else if data.resource.respawn_time > 0}
        <span>Respawn: {formatDuration(data.resource.respawn_time)}</span>
      {/if}
      {#if data.resource.gathering_exp && data.resource.gathering_exp > 0}
        <span>Gathering XP: {data.resource.gathering_exp}</span>
      {/if}
    </div>
  </div>

  <!-- Spawn Locations -->
  {#if data.spawns.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <MapPin class="h-5 w-5 text-emerald-500" />
        Spawns
      </h2>
      <DataTable
        data={data.spawns}
        columns={spawnColumns}
        renderCell={renderSpawnCell}
        renderHeader={renderSpawnHeader}
        initialSorting={[{ id: "spawn_count", desc: true }]}
        urlKey="gather-{data.resource.id}-spawns"
        pageSize={10}
        zebraStripe={true}
        class="bg-muted/30"
      />
    </section>
  {/if}

  <!-- Gather Chance Calculator (for plants, minerals, and radiant sparks) -->
  {#if data.resource.is_plant || data.resource.is_mineral || data.resource.is_radiant_spark}
    {@const skillName = data.resource.is_plant
      ? "Herbalism"
      : data.resource.is_mineral
        ? "Mining"
        : "Radiant Seeker"}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Calculator class="h-5 w-5 text-cyan-500" />
        Gather Chance
      </h2>
      <div class="bg-muted/30 rounded-md border p-4 space-y-4">
        <div class="space-y-3">
          <div class="flex items-center gap-4">
            <label for="skill-slider" class="w-40 shrink-0">
              {skillName} Skill:
            </label>
            <input
              id="skill-slider"
              type="range"
              min="0"
              max="100"
              step="1"
              bind:value={skillLevel}
              class="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <span class="font-mono w-24 text-right">{skillLevel}%</span>
          </div>

          {#if data.resource.is_mineral}
            <div class="flex items-center gap-4">
              <label for="pickaxe-slider" class="w-40 shrink-0">
                Pickaxe Quality:
              </label>
              <input
                id="pickaxe-slider"
                type="range"
                min="0"
                max="4"
                step="1"
                bind:value={pickaxeQuality}
                class="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span class="font-mono w-24 text-right">
                {qualityNames[pickaxeQuality]}
              </span>
            </div>
          {/if}
        </div>

        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
          {#if data.resource.is_radiant_spark}
            <div>
              <div class="text-sm text-muted-foreground">
                Radiant Aether Chance
              </div>
              <div
                class="font-mono font-medium {getSuccessChanceColor(
                  getRadiantAetherChance(),
                )}"
              >
                {getRadiantAetherChance().toFixed(1)}%
              </div>
            </div>
          {:else}
            <div>
              <div class="text-sm text-muted-foreground">Success Chance</div>
              <div
                class="font-mono font-medium {getSuccessChanceColor(
                  successChance,
                )}"
              >
                {successChance.toFixed(0)}%
              </div>
            </div>
          {/if}
          <div>
            <div class="text-sm text-muted-foreground">Skill Gain Chance</div>
            <div class="font-mono font-medium">
              {getSkillGainChance().toFixed(0)}%
            </div>
          </div>
          <div>
            <div class="text-sm text-muted-foreground">Skill Gain Amount</div>
            <div class="font-mono">
              {#if effortless}
                <span class="text-muted-foreground italic">Effortless</span>
              {:else if data.resource.is_radiant_spark}
                0.10% – 0.30%
                <span class="text-muted-foreground text-xs">(fixed)</span>
              {:else if successChance > 0}
                {skillGain[0].toFixed(2)}% – {skillGain[1].toFixed(2)}%
              {:else}
                <span class="text-muted-foreground">—</span>
              {/if}
            </div>
          </div>
        </div>
      </div>
    </section>
  {/if}

  <!-- Requirements -->
  {#if data.resource.tool_required_id}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Key class="h-5 w-5 text-yellow-500" />
        Key
      </h2>
      <div class="bg-muted/30 rounded-md border p-4">
        <a
          href="/items/{data.resource.tool_required_id}"
          class="text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          {data.resource.tool_required_name}
        </a>
      </div>
    </section>

    <!-- How to Obtain Key -->
    {#if data.toolObtainabilityTree}
      <section>
        <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
          <ListTree class="h-5 w-5 text-muted-foreground" />
          How to Obtain Key
        </h2>
        <div class="bg-muted/30 rounded-md border p-4">
          <div class="bg-background rounded-md p-4 border overflow-x-auto">
            <div class="w-fit pr-2">
              <ObtainabilityTree
                node={data.toolObtainabilityTree}
                hideRootLink={true}
              />
            </div>
          </div>
        </div>
      </section>
    {/if}
  {/if}

  <!-- Rewards -->
  {#if data.resource.item_reward_id || data.drops.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Gem class="h-5 w-5 text-amber-500" />
        Rewards
      </h2>

      {#if data.resource.item_reward_id}
        <div class="mb-4 bg-muted/30 rounded-md border p-4">
          <a
            href="/items/{data.resource.item_reward_id}"
            class="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            {data.resource.item_reward_name}
          </a>
          {#if data.resource.item_reward_amount > 1}
            <span class="text-muted-foreground">
              ×1–{data.resource.item_reward_amount}
            </span>
          {:else}
            <span class="text-muted-foreground"> ×1 </span>
          {/if}
        </div>
      {/if}

      {#if data.drops.length > 0}
        <DataTable
          data={data.drops}
          columns={dropColumns}
          renderCell={renderDropCell}
          renderHeader={renderDropHeader}
          initialSorting={[{ id: "drop_rate", desc: true }]}
          urlKey="gather-{data.resource.id}-drops"
          pageSize={10}
          zebraStripe={true}
          class="bg-muted/30"
        />
      {/if}
    </section>
  {/if}

  <!-- Lore -->
  {#if data.resource.description}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <BookOpen class="h-5 w-5 text-indigo-500" />
        Lore
      </h2>
      <div class="bg-muted/30 rounded-md border p-4">
        <p class="whitespace-pre-wrap italic text-muted-foreground">
          {data.resource.description}
        </p>
      </div>
    </section>
  {/if}
</div>

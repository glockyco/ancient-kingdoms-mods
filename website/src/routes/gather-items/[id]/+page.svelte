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
  import Seo from "$lib/components/Seo.svelte";
  import MechanicsLink from "$lib/components/MechanicsLink.svelte";
  import ObtainabilityTree from "$lib/components/ObtainabilityTree.svelte";
  import type {
    GatheringResourceDrop,
    GatheringResourceSpawn,
  } from "$lib/types/gather-items";
  import { formatPercent, formatDuration } from "$lib/utils/format";
  import {
    fishDropChancePerCast,
    fishTrashChancePerHook,
    fishingMasteryGainChance,
    fishingMasteryGainRange,
    fishingSpotSuccessChance,
  } from "$lib/utils/fishing";
  import Key from "@lucide/svelte/icons/key";
  import ListTree from "@lucide/svelte/icons/list-tree";
  import Gem from "@lucide/svelte/icons/gem";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import Calculator from "@lucide/svelte/icons/calculator";
  import FishIcon from "@lucide/svelte/icons/fish";
  import BookOpen from "@lucide/svelte/icons/book-open";
  import { SvelteMap, SvelteSet } from "svelte/reactivity";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
  let selectedFishingSpotVariantIndex = $state(
    data.selectedFishingSpotVariantIndex ?? 0,
  );
  const selectedFishingSpotVariant = $derived(
    data.fishingSpotVariants[selectedFishingSpotVariantIndex],
  );
  const resource = $derived(
    selectedFishingSpotVariant?.resource ?? data.resource,
  );
  const drops = $derived(selectedFishingSpotVariant?.drops ?? data.drops);
  const spawns = $derived(selectedFishingSpotVariant?.spawns ?? data.spawns);
  const displaySpawns = $derived.by(() => {
    if (!resource.is_fishing_spot || data.fishingSpotVariants.length === 0) {
      return spawns;
    }

    const spawnsByZone = new SvelteMap<string, GatheringResourceSpawn>();
    for (const variant of data.fishingSpotVariants) {
      for (const spawn of variant.spawns) {
        const existing = spawnsByZone.get(spawn.zone_id);
        if (existing) {
          existing.spawn_count += spawn.spawn_count;
        } else {
          spawnsByZone.set(spawn.zone_id, { ...spawn });
        }
      }
    }

    return Array.from(spawnsByZone.values()).sort(
      (a, b) =>
        b.spawn_count - a.spawn_count || a.zone_name.localeCompare(b.zone_name),
    );
  });

  // Roman numerals for tier display
  const romanNumerals = ["I", "II", "III", "IV", "V"];

  type FishingSpotVariant = PageData["fishingSpotVariants"][number];

  function formatZoneList(spawns: GatheringResourceSpawn[]): string {
    return spawns.map((spawn) => spawn.zone_name).join(", ");
  }

  function formatFishingSpotVariant(
    variant: FishingSpotVariant,
    index: number,
  ): string {
    const spawnCount = variant.spawns.reduce(
      (total, spawn) => total + spawn.spawn_count,
      0,
    );
    return `Spot ${index + 1}: ${variant.resource.name} (Tier ${
      romanNumerals[variant.resource.level] ?? variant.resource.level
    }), ${spawnCount} ${spawnCount === 1 ? "spot" : "spots"} — ${formatZoneList(
      variant.spawns,
    )}`;
  }
  // Type colors for badges

  function selectFishingSpotVariant(index: number): void {
    selectedFishingSpotVariantIndex = Math.min(
      data.fishingSpotVariants.length - 1,
      Math.max(0, index),
    );
  }

  function selectPreviousFishingSpotVariant(): void {
    selectFishingSpotVariant(selectedFishingSpotVariantIndex - 1);
  }

  function selectNextFishingSpotVariant(): void {
    selectFishingSpotVariant(selectedFishingSpotVariantIndex + 1);
  }
  const typeBadgeBase =
    "inline-flex items-center rounded-md border px-2.5 py-1 text-sm font-medium";
  const typeColors: Record<string, string> = {
    "Fishing Spot":
      "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
    Plant:
      "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300",
    Mineral:
      "border-gray-500/30 bg-gray-500/10 text-gray-700 dark:text-gray-300",
    "Radiant Spark":
      "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300",
    Resource:
      "border-gray-500/30 bg-gray-500/10 text-gray-700 dark:text-gray-300",
  };

  import { QUALITY_NAMES } from "$lib/constants/quality";

  // Get type string from resource flags
  function getResourceType(resource: {
    is_plant: boolean;
    is_fishing_spot: boolean;
    is_mineral: boolean;
    is_radiant_spark: boolean;
  }): string {
    if (resource.is_fishing_spot) return "Fishing Spot";
    if (resource.is_plant) return "Plant";
    if (resource.is_mineral) return "Mineral";
    if (resource.is_radiant_spark) return "Radiant Spark";
    return "Resource";
  }

  // Derive display values
  const resourceType = $derived(getResourceType(resource));

  let skillLevel = $state(0);
  let pickaxeQuality = $state(0);
  let selectedCostumeIds = new SvelteSet<string>();

  const fishermanCostumePieces = $derived(selectedCostumeIds.size);
  const fishermanSetPieces = [
    { itemId: "fishermans_hat", itemName: "Fisherman's Hat" },
    { itemId: "fishermans_garb", itemName: "Fisherman's Garb" },
    { itemId: "fishermans_trousers", itemName: "Fisherman's Trousers" },
  ];

  // Source: server-scripts/Utils.cs:491-501 — GetSuccessProbHerbalism
  function getHerbalismSuccessChance(resourceLevel: number): number {
    const skill = skillLevel / 100;
    switch (resourceLevel) {
      case 0:
        return 100;
      case 1:
        return Math.min(100, (0.3 + skill * 2) * 100);
      case 2:
        return Math.min(100, (0.15 + skill) * 100);
      case 3:
        return Math.min(100, skill * 95);
      default:
        return Math.min(100, skill * 85);
    }
  }

  // Source: server-scripts/Utils.cs:515-530 — GetSuccessProbMining
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

  // Source: server-scripts/GatherItem.cs:381 — 0.05 + radiantSekeerLevel * 0.25
  function getRadiantAetherChance(): number {
    const skill = skillLevel / 100;
    return (0.05 + skill * 0.25) * 100;
  }

  const successChance = $derived.by(() => {
    if (resource.is_plant) {
      return getHerbalismSuccessChance(resource.level);
    } else if (resource.is_mineral) {
      return getMiningSuccessChance(resource.level);
    } else if (resource.is_fishing_spot) {
      return (
        fishingSpotSuccessChance({
          rodQuality: 0,
          fishingPercent: skillLevel,
          spotTier: resource.level,
        }) * 100
      );
    }
    return 0;
  });

  const effortless = $derived.by(() => {
    // Radiant sparks are never effortless (always grant skill)
    if (resource.is_radiant_spark) return false;
    return isEffortless(resource.level);
  });

  const fishingMasteryProcChance = $derived(
    resource.is_fishing_spot
      ? fishingSpotSuccessChance({
          rodQuality: 0,
          fishingPercent: skillLevel,
          spotTier: resource.level,
        }) *
          fishingMasteryGainChance({
            fishingPercent: skillLevel,
            spotTier: resource.level,
          }) *
          100
      : 0,
  );

  const fishingMasteryGain = $derived(
    fishingMasteryGainRange(successChance / 100),
  );

  const skillGain = $derived(
    resource.is_fishing_spot
      ? [fishingMasteryGain.min, fishingMasteryGain.max]
      : getSkillGainAmount(successChance),
  );

  const nonTrashDrops = $derived(
    drops.filter((item: GatheringResourceDrop) => !item.is_fishing_trash),
  );
  const trashDropCount = $derived(
    drops.filter((item: GatheringResourceDrop) => item.is_fishing_trash).length,
  );

  function getDisplayedDropChance(drop: GatheringResourceDrop): number {
    if (!resource.is_fishing_spot) {
      return drop.actual_drop_chance ?? drop.drop_rate;
    }

    if (drop.is_fishing_trash) {
      if (trashDropCount === 0) return 0;
      return (
        (fishingSpotSuccessChance({
          rodQuality: 0,
          fishingPercent: skillLevel,
          spotTier: resource.level,
        }) *
          fishTrashChancePerHook({
            spotDrops: nonTrashDrops.map((item: GatheringResourceDrop) => ({
              probability: item.drop_rate,
            })),
            fishingPercent: skillLevel,
            fishermanCostumePieces,
          })) /
        trashDropCount
      );
    }

    return fishDropChancePerCast({
      configuredDropRate: drop.drop_rate,
      fishCountAtSpot: nonTrashDrops.length,
      fishingPercent: skillLevel,
      fishermanCostumePieces,
      rodQuality: 0,
      spotTier: resource.level,
    });
  }

  const dropColumns = $derived([
    {
      accessorKey: "item_name",
      header: "Item",
      minSize: 300,
    },
    {
      accessorKey: "drop_rate",
      header: resource.is_fishing_spot ? "Chance / Cast" : "Drop Rate",
      size: 140,
    },
  ] satisfies ColumnDef<GatheringResourceDrop>[]);

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

  function toggleCostume(itemId: string, checked: boolean) {
    if (checked) selectedCostumeIds.add(itemId);
    else selectedCostumeIds.delete(itemId);
  }
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
      {formatPercent(getDisplayedDropChance(row.original))}
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

<Seo
  title={`${resource.name} - Ancient Kingdoms`}
  description={data.description}
  path={`/gather-items/${resource.id}`}
/>

<div class="container mx-auto p-8 space-y-6 max-w-5xl">
  <!-- Breadcrumb -->
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Gathering Resources", href: "/gather-items" },
      { label: resource.name },
    ]}
  />

  <!-- Header -->
  <div>
    <div class="flex items-center gap-3 flex-wrap">
      <h1 class="text-3xl font-bold">{resource.name}</h1>
      <MapLink entityId={resource.id} entityType="resource" />
      <span
        class="{typeBadgeBase} {typeColors[resourceType] ??
          'border-gray-500/30 bg-gray-500/10 text-gray-700 dark:text-gray-300'}"
      >
        {resourceType}
      </span>
      {#if resource.is_fishing_spot}
        <a
          href="/professions/fishing"
          class="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-sm font-medium text-cyan-700 transition-colors hover:bg-cyan-500/20 dark:text-cyan-300"
        >
          <FishIcon class="h-4 w-4" />
          Fishing
        </a>
      {/if}
    </div>

    <div class="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
      {#if resource.level >= 0 && resource.level < romanNumerals.length}
        <span>Tier {romanNumerals[resource.level]}</span>
      {:else if resource.level > 0}
        <span>Tier {resource.level}</span>
      {/if}
      {#if resource.is_radiant_spark}
        <span>Respawn: 1m40s – 1h (random)</span>
      {:else if resource.is_mineral && resource.respawn_time > 0}
        <span>
          Respawn: {formatDuration(Math.floor(resource.respawn_time / 2))} –
          {formatDuration(resource.respawn_time)}
        </span>
      {:else if resource.respawn_time > 0}
        <span>Respawn: {formatDuration(resource.respawn_time)}</span>
      {/if}
      {#if resource.gathering_exp && resource.gathering_exp > 0}
        <span
          >Gathering XP: <MechanicsLink section="experience"
            >{resource.gathering_exp}</MechanicsLink
          ></span
        >
      {/if}
    </div>
  </div>

  <!-- Spawn Locations -->
  {#if displaySpawns.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <MapPin class="h-5 w-5 text-emerald-500" />
        Spawns
      </h2>
      <DataTable
        data={displaySpawns}
        columns={spawnColumns}
        renderCell={renderSpawnCell}
        renderHeader={renderSpawnHeader}
        initialSorting={[{ id: "spawn_count", desc: true }]}
        urlKey="gather-{resource.id}-spawns"
        pageSize={10}
        zebraStripe={true}
        class="bg-muted/30"
      />
    </section>
  {/if}

  <!-- Gather Chance Calculator (for plants, minerals, fishing spots, and radiant sparks) -->
  {#if resource.is_plant || resource.is_mineral || resource.is_fishing_spot || resource.is_radiant_spark}
    {@const skillName = resource.is_plant
      ? "Herbalism"
      : resource.is_mineral
        ? "Mining"
        : resource.is_fishing_spot
          ? "Fishing"
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

          {#if resource.is_mineral}
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
                {QUALITY_NAMES[pickaxeQuality]}
              </span>
            </div>
          {/if}
        </div>

        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
          {#if resource.is_radiant_spark}
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
            <div class="text-sm text-muted-foreground">
              {resource.is_fishing_spot
                ? "Mastery Proc / Cast"
                : "Skill Gain Chance"}
            </div>
            <div class="font-mono font-medium">
              {resource.is_fishing_spot
                ? fishingMasteryProcChance.toFixed(0)
                : getSkillGainChance().toFixed(0)}%
            </div>
          </div>
          <div>
            <div class="text-sm text-muted-foreground">
              {resource.is_fishing_spot
                ? "Mastery Gain / Proc"
                : "Skill Gain Amount"}
            </div>
            <div class="font-mono">
              {#if effortless}
                <span class="text-muted-foreground">—</span>
              {:else if resource.is_radiant_spark}
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
  {#if resource.tool_required_id || resource.is_fishing_spot}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Key class="h-5 w-5 text-yellow-500" />
        {resource.is_fishing_spot ? "Fishing Rod" : "Key"}
      </h2>
      <div class="bg-muted/30 rounded-md border p-4">
        {#if resource.is_fishing_spot}
          <a
            href="/items/rusty_fishing_rod"
            class="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Rusty Fishing Rod
          </a>
        {:else if resource.tool_required_id}
          <a
            href="/items/{resource.tool_required_id}"
            class="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            {resource.tool_required_name}
          </a>
        {/if}
      </div>
    </section>

    <!-- How to Obtain Requirement -->
    {#if resource.tool_required_id && data.toolObtainabilityTree}
      <section>
        <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
          <ListTree class="h-5 w-5 text-muted-foreground" />
          How to Obtain {resource.is_fishing_spot ? "Fishing Rod" : "Key"}
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
  {#if resource.item_reward_id || drops.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Gem class="h-5 w-5 text-amber-500" />
        Rewards
      </h2>

      {#if data.fishingSpotVariants.length > 1}
        <div class="mb-4 rounded-md border bg-muted/30 p-4">
          <div class="mb-3 flex items-center justify-between gap-3">
            <label for="fishing-spot-variant" class="text-sm font-medium">
              Fishing Spot
            </label>
            <div
              class="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
            >
              {selectedFishingSpotVariantIndex + 1} of {data.fishingSpotVariants
                .length}
            </div>
          </div>
          <div
            class="grid grid-cols-2 gap-2 sm:grid-cols-[4.5rem_minmax(0,1fr)_4.5rem]"
          >
            <div class="relative col-span-2 min-w-0 sm:order-2 sm:col-span-1">
              <select
                id="fishing-spot-variant"
                bind:value={selectedFishingSpotVariantIndex}
                class="h-11 w-full rounded-md border bg-background px-3 text-sm"
              >
                {#each data.fishingSpotVariants as variant, index (variant.resource.id)}
                  <option value={index}>
                    {formatFishingSpotVariant(variant, index)}
                  </option>
                {/each}
              </select>
            </div>
            <button
              type="button"
              class="inline-flex h-11 items-center justify-center rounded-md border bg-background px-3 text-sm font-medium outline-none transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 sm:order-1"
              disabled={selectedFishingSpotVariantIndex === 0}
              onclick={selectPreviousFishingSpotVariant}
              aria-label="Previous fishing spot"
            >
              Prev
            </button>
            <button
              type="button"
              class="inline-flex h-11 items-center justify-center rounded-md border bg-background px-3 text-sm font-medium outline-none transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 sm:order-3"
              disabled={selectedFishingSpotVariantIndex ===
                data.fishingSpotVariants.length - 1}
              onclick={selectNextFishingSpotVariant}
              aria-label="Next fishing spot"
            >
              Next
            </button>
          </div>
          <div class="mt-4 space-y-2">
            <div class="text-sm font-medium">Fisherman set</div>
            <div class="grid gap-2 sm:grid-cols-3">
              {#each fishermanSetPieces as piece (piece.itemId)}
                <label
                  class="flex items-center gap-2 rounded-md border bg-background p-2"
                >
                  <input
                    type="checkbox"
                    checked={selectedCostumeIds.has(piece.itemId)}
                    onchange={(event) =>
                      toggleCostume(
                        piece.itemId,
                        (event.currentTarget as HTMLInputElement).checked,
                      )}
                    class="h-4 w-4 rounded border-border accent-primary"
                  />
                  <a
                    href="/items/{piece.itemId}"
                    class="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {piece.itemName}
                  </a>
                </label>
              {/each}
            </div>
          </div>
        </div>
      {/if}
      {#if resource.item_reward_id}
        <div class="mb-4 bg-muted/30 rounded-md border p-4">
          <a
            href="/items/{resource.item_reward_id}"
            class="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            {resource.item_reward_name}
          </a>
          {#if resource.item_reward_amount > 1}
            <span class="text-muted-foreground">
              ×1–{resource.item_reward_amount}
            </span>
          {:else}
            <span class="text-muted-foreground"> ×1 </span>
          {/if}
        </div>
      {/if}

      {#if drops.length > 0}
        <DataTable
          data={drops}
          columns={dropColumns}
          renderCell={renderDropCell}
          renderHeader={renderDropHeader}
          initialSorting={[{ id: "drop_rate", desc: true }]}
          urlKey="gather-{resource.id}-drops"
          pageSize={10}
          zebraStripe={true}
          class="bg-muted/30"
        />
      {/if}
    </section>
  {/if}

  <!-- Lore -->
  {#if resource.description}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <BookOpen class="h-5 w-5 text-indigo-500" />
        Lore
      </h2>
      <div class="bg-muted/30 rounded-md border p-4">
        <p class="whitespace-pre-wrap italic text-muted-foreground">
          {resource.description}
        </p>
      </div>
    </section>
  {/if}
</div>

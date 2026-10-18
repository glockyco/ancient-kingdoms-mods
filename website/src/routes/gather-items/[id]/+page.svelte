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
  import { detailTitle } from "$lib/seo/title";
  import MechanicsLink from "$lib/components/MechanicsLink.svelte";
  import LazyObtainabilityTree from "$lib/components/LazyObtainabilityTree.svelte";
  import DeferredDetails from "$lib/components/DeferredDetails.svelte";
  import MethodList from "$lib/components/acquisition/MethodList.svelte";
  import PrimaryRewards from "$lib/components/acquisition/PrimaryRewards.svelte";
  import ScrollRegion from "$lib/components/acquisition/ScrollRegion.svelte";
  import { commonItemProbability } from "$lib/utils/primary-rewards";
  import type {
    GatheringResourceDrop,
    GatheringResourceSpawn,
  } from "$lib/types/gather-items";
  import {
    formatPercent,
    formatDuration,
    formatNumber,
    getQualityTextColorClass,
  } from "$lib/utils/format";
  import {
    fishFallbackPoolForSpotTier,
    fishingMasteryGainChance,
    fishingMasteryGainRange,
    fishingSpotSuccessChance,
    type FishPoolItem,
  } from "$lib/utils/fishing";
  import {
    PROFESSION_MECHANICS,
    isEffortlessAtTier,
    linearProcChance,
    skillGainChance,
  } from "$lib/data/professions/mechanics";
  import {
    professionAttempt,
    calculateMethodProbabilities,
  } from "$lib/acquisition/rules";
  import Key from "@lucide/svelte/icons/key";
  import ListTree from "@lucide/svelte/icons/list-tree";
  import Gem from "@lucide/svelte/icons/gem";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import Calculator from "@lucide/svelte/icons/calculator";
  import FishIcon from "@lucide/svelte/icons/fish";
  import BookOpen from "@lucide/svelte/icons/book-open";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import { untrack } from "svelte";
  import { SvelteMap, SvelteSet } from "svelte/reactivity";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
  let selectedFishingSpotVariantIndex = $state(
    untrack(() => data.selectedFishingSpotVariantIndex ?? 0),
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

  function formatFishingSpotVariant(variant: FishingSpotVariant): string {
    const zone = formatZoneList(variant.spawns);
    const sameZone = data.fishingSpotVariants.filter(
      (candidate) => formatZoneList(candidate.spawns) === zone,
    );
    const position = sameZone.indexOf(variant) + 1;
    return sameZone.length > 1
      ? `${zone} (${position} of ${sameZone.length})`
      : zone;
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
    Other: "border-gray-500/30 bg-gray-500/10 text-gray-700 dark:text-gray-300",
  };

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
    return "Other";
  }

  // Derive display values
  const resourceType = $derived(getResourceType(resource));

  let skillLevel = $state(0);
  let pickaxeQuality = $state(0);
  let selectedCostumeIds = new SvelteSet<string>();
  let selectedRodId = $state(untrack(() => data.rods[0]?.item_id ?? ""));
  const selectedRod = $derived(
    data.rods.find((rod) => rod.item_id === selectedRodId) ?? data.rods[0],
  );
  const selectedRodQuality = $derived(selectedRod?.quality ?? 0);
  const selectedRodIndex = $derived(
    Math.max(
      0,
      data.rods.findIndex((rod) => rod.item_id === selectedRodId),
    ),
  );

  function selectRod(index: number): void {
    const clamped = Math.min(data.rods.length - 1, Math.max(0, index));
    selectedRodId = data.rods[clamped]?.item_id ?? selectedRodId;
  }

  function selectPreviousRod(): void {
    selectRod(selectedRodIndex - 1);
  }

  function selectNextRod(): void {
    selectRod(selectedRodIndex + 1);
  }

  const fishermanCostumePieces = $derived(selectedCostumeIds.size);
  const fishermanSetPieces = [
    { itemId: "fishermans_hat", itemName: "Fisherman's Hat" },
    { itemId: "fishermans_garb", itemName: "Fisherman's Garb" },
    { itemId: "fishermans_trousers", itemName: "Fisherman's Trousers" },
  ];

  function getSuccessChanceColor(chance: number): string {
    if (chance >= 100) return "text-green-500";
    if (chance >= 75) return "text-lime-500";
    if (chance >= 50) return "text-yellow-500";
    if (chance >= 25) return "text-orange-500";
    return "text-red-500";
  }

  const attemptScenario = $derived(
    resource.is_plant
      ? professionAttempt("herbalism", resource.level, skillLevel / 100, null)
      : resource.is_mineral
        ? professionAttempt(
            "mining",
            resource.level,
            skillLevel / 100,
            pickaxeQuality,
          )
        : resource.is_fishing_spot
          ? professionAttempt(
              "fishing",
              resource.level,
              skillLevel / 100,
              selectedRod ? selectedRodQuality : null,
            )
          : null,
  );
  const successChance = $derived((attemptScenario?.raw ?? 0) * 100);

  // Source: server-scripts/GatherItem.cs:343-365,698-705 — the game refuses attempts below these success floors.
  const attemptFloor = $derived(
    resource.is_plant
      ? PROFESSION_MECHANICS.herbalism.success.floor
      : resource.is_mineral
        ? PROFESSION_MECHANICS.mining.success.floor
        : resource.is_fishing_spot
          ? PROFESSION_MECHANICS.fishing.success.floor
          : 0,
  );
  const canAttempt = $derived(attemptScenario?.qualified ?? true);

  const effortless = $derived.by(() => {
    if (resource.is_radiant_spark) return false;
    const thresholds = resource.is_plant
      ? PROFESSION_MECHANICS.herbalism.effortless
      : resource.is_mineral
        ? PROFESSION_MECHANICS.mining.effortless
        : PROFESSION_MECHANICS.fishing.effortless;
    return isEffortlessAtTier(thresholds, resource.level, skillLevel);
  });

  const gatheringSkillGainRule = $derived(
    resource.is_plant
      ? PROFESSION_MECHANICS.herbalism.skillGain
      : resource.is_mineral
        ? PROFESSION_MECHANICS.mining.skillGain
        : PROFESSION_MECHANICS.radiant_seeker.skillGain,
  );
  const gatheringSkillGainChance = $derived(
    !canAttempt || skillLevel >= 100 || effortless
      ? 0
      : skillGainChance(gatheringSkillGainRule, skillLevel) * 100,
  );
  const radiantAetherChance = $derived(
    linearProcChance(
      PROFESSION_MECHANICS.radiant_seeker.procChance,
      skillLevel,
    ) * 100,
  );

  const fishingMasteryProcChance = $derived(
    resource.is_fishing_spot
      ? fishingSpotSuccessChance({
          rodQuality: selectedRodQuality,
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

  const skillGain = $derived.by(() => {
    if (!canAttempt) return [0, 0];
    if (resource.is_fishing_spot) {
      return [fishingMasteryGain.min, fishingMasteryGain.max];
    }
    const success = resource.is_radiant_spark ? 1 : successChance / 100;
    if (success <= 0) return [0, 0];
    const { range, divisor } = gatheringSkillGainRule;
    return [
      (range[0] / (success * divisor)) * 100,
      (range[1] / (success * divisor)) * 100,
    ];
  });

  const nonTrashDrops = $derived(
    drops.filter((item: GatheringResourceDrop) => !item.is_fishing_trash),
  );

  const fishPoolsByQuality = $derived.by(() => {
    const pools: Record<number, FishPoolItem[]> = {};
    for (const [quality, fish] of Object.entries(data.fishPoolsByQuality)) {
      pools[Number(quality)] = fish.map((entry) => ({
        itemId: entry.item_id,
        itemName: entry.item_name,
        quality: entry.quality,
        tooltipHtml: entry.tooltip_html,
      }));
    }
    return pools;
  });

  const fallbackFish = $derived(
    resource.is_fishing_spot
      ? fishFallbackPoolForSpotTier(resource.level, fishPoolsByQuality)
      : [],
  );

  const enteredAcquisitionMethods = $derived(
    data.acquisitionMethods
      .filter((method) => method.detail.resource_id === resource.id)
      .map((method) => {
        const definition = data.acquisitionRows.methods.find(
          (row) => row.id === method.methodId,
        )!;
        return {
          ...method,
          probabilityResults: calculateMethodProbabilities(
            data.acquisitionRows,
            definition,
            method.detail,
            {
              assumptions: {
                scenario: "entered",
                questNeed: "none",
                fatecharm: false,
                treasureHunter: 0,
                professionFraction: skillLevel / 100,
                toolQuality: resource.is_fishing_spot
                  ? selectedRod
                    ? selectedRodQuality
                    : null
                  : resource.is_mineral
                    ? pickaxeQuality
                    : null,
                costumePieces: fishermanCostumePieces,
              },
            },
          ),
        };
      }),
  );

  const enteredItemChances = $derived.by(() => {
    const chances: Record<string, number | null> = Object.create(null);
    const itemIds = new Set(
      enteredAcquisitionMethods.flatMap((method) =>
        method.probabilityResults.flatMap((result) =>
          result.target.kind === "item" ? [result.target.itemId] : [],
        ),
      ),
    );
    for (const itemId of itemIds) {
      chances[itemId] = commonItemProbability(
        enteredAcquisitionMethods,
        itemId,
        resource.is_fishing_spot ? "cast" : "attempt",
      );
    }
    return chances;
  });

  // Canonical per-item chances include every primary and fallback membership.
  const rewardDrops = $derived.by(() => {
    if (!resource.is_fishing_spot || fallbackFish.length === 0) return drops;
    const fallbackRows: GatheringResourceDrop[] = fallbackFish
      .filter(
        (fish) => !nonTrashDrops.some((drop) => drop.item_id === fish.itemId),
      )
      .sort((a, b) => b.quality - a.quality)
      .map((fish) => ({
        item_id: fish.itemId,
        item_name: fish.itemName,
        quality: fish.quality,
        actual_drop_chance: null,
        is_fishing_trash: false,
        is_fallback_fish: true,
      }));
    return [
      ...nonTrashDrops,
      ...fallbackRows,
      ...drops.filter((item: GatheringResourceDrop) => item.is_fishing_trash),
    ];
  });

  function getDisplayedDropChance(drop: GatheringResourceDrop): number | null {
    return enteredItemChances[drop.item_id] ?? null;
  }

  const dropColumns = $derived([
    {
      accessorKey: "item_name",
      header: "Item",
      minSize: 300,
    },
    {
      id: "drop_rate",
      accessorFn: (drop) => getDisplayedDropChance(drop),
      header: resource.is_fishing_spot
        ? "Chance per cast"
        : "Chance per attempt",
      size: 160,
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
    <ItemLink
      itemId={row.original.item_id}
      itemName={row.original.item_name}
      colorClass={getQualityTextColorClass(row.original.quality ?? 0)}
    />
  {:else if cell.column.id === "drop_rate"}
    {@const chance = getDisplayedDropChance(row.original)}
    <span class="ml-auto">
      {#if chance === null}
        Unknown
      {:else}
        {formatPercent(chance, { decimals: 1, trailingZeros: true })}
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
    <span class="order-1 ml-auto whitespace-normal text-right leading-tight"
      >{header.column.columnDef.header}</span
    >
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
    <span class="order-1 ml-auto">{header.column.columnDef.header}</span>
  {:else}
    {header.column.columnDef.header}
  {/if}
{/snippet}

<Seo
  title={detailTitle(resource.name, {
    family: "Gathering",
    zone:
      data.fishingSpotVariants.length === 0 && data.spawns.length === 1
        ? data.spawns[0].zone_name
        : null,
    source: resource.is_fishing_spot
      ? data.drops.find((drop) => !drop.is_fishing_trash)?.item_name
      : null,
  })}
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
        <span>Respawn: 1m 40s to 1h (random)</span>
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
            >{formatNumber(resource.gathering_exp)}</MechanicsLink
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
          <div
            class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 sm:flex sm:gap-4"
          >
            <label for="skill-slider" class="sm:w-40 sm:shrink-0">
              {skillName}:
            </label>
            <input
              id="skill-slider"
              type="range"
              min="0"
              max="100"
              step="1"
              bind:value={skillLevel}
              class="col-span-2 row-start-2 min-w-0 w-full sm:w-auto sm:flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <span class="col-start-2 row-start-1 font-mono text-right sm:w-24"
              >{skillLevel}%</span
            >
          </div>

          {#if resource.is_mineral}
            <div
              class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 sm:flex sm:gap-4"
            >
              <label for="pickaxe-slider" class="sm:w-40 sm:shrink-0">
                Pickaxe:
              </label>
              <input
                id="pickaxe-slider"
                type="range"
                min="0"
                max="4"
                step="1"
                bind:value={pickaxeQuality}
                class="col-span-2 row-start-2 min-w-0 w-full sm:w-auto sm:flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span class="col-start-2 row-start-1 text-right sm:w-40">
                {[
                  "Rusty Pickaxe",
                  "Steel Pickaxe",
                  "Gold Pickaxe",
                  "Beryllium Pickaxe",
                  "Draconium Pickaxe",
                ][pickaxeQuality]}
              </span>
            </div>
          {/if}
          {#if resource.is_fishing_spot}
            {#if data.rods.length > 0}
              <label for="fishing-rod">Fishing rod:</label>
              <div
                class="grid grid-cols-2 gap-2 sm:grid-cols-[4.5rem_minmax(0,1fr)_4.5rem]"
              >
                <div
                  class="relative col-span-2 min-w-0 sm:order-2 sm:col-span-1"
                >
                  <select
                    id="fishing-rod"
                    bind:value={selectedRodId}
                    aria-label="Fishing rod"
                    class="h-11 w-full appearance-none rounded-md border bg-background px-3 pr-10 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    {#each data.rods as rod (rod.item_id)}
                      <option value={rod.item_id}>{rod.item_name}</option>
                    {/each}
                  </select>
                  <ChevronDown
                    class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>
                <button
                  type="button"
                  class="inline-flex h-11 items-center justify-center rounded-md border bg-background px-3 text-sm font-medium outline-none transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 sm:order-1"
                  disabled={selectedRodIndex === 0}
                  onclick={selectPreviousRod}
                  aria-label="Previous fishing rod"
                >
                  Prev
                </button>
                <button
                  type="button"
                  class="inline-flex h-11 items-center justify-center rounded-md border bg-background px-3 text-sm font-medium outline-none transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 sm:order-3"
                  disabled={selectedRodIndex === data.rods.length - 1}
                  onclick={selectNextRod}
                  aria-label="Next fishing rod"
                >
                  Next
                </button>
              </div>
            {/if}

            <p>Fisherman's costume pieces worn:</p>
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
          {/if}
        </div>

        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
          {#if resource.is_radiant_spark}
            <div>
              <div class="text-sm text-muted-foreground">
                Radiant Aether chance
              </div>
              <div
                class="font-mono font-medium {getSuccessChanceColor(
                  radiantAetherChance,
                )}"
              >
                {formatPercent(radiantAetherChance / 100, {
                  decimals: 1,
                  trailingZeros: true,
                })}
              </div>
            </div>
          {:else}
            <div>
              <!-- Source: server-scripts/GatherItem.cs:OnInteractFishServer — the initial roll is a bite, not a guaranteed fish. -->
              <div class="text-sm text-muted-foreground">
                {resource.is_fishing_spot
                  ? "Bite chance per cast"
                  : "Success chance"}
              </div>
              <div
                class="font-mono font-medium {getSuccessChanceColor(
                  successChance,
                )}"
              >
                {#if canAttempt}
                  {formatPercent(successChance / 100, {
                    decimals: 0,
                    trailingZeros: true,
                  })}
                {:else}
                  <span class="text-sm">
                    Too low to {resource.is_fishing_spot
                      ? "fish here"
                      : resource.is_mineral
                        ? "mine"
                        : "gather"}. You need at least a {formatPercent(
                      attemptFloor,
                      { decimals: 0, trailingZeros: false },
                    )}
                    {resource.is_fishing_spot ? "bite" : "success"} chance.
                  </span>
                {/if}
              </div>
            </div>
          {/if}
          <div>
            <div class="text-sm text-muted-foreground">
              {resource.is_fishing_spot
                ? "Fishing gain chance per cast"
                : `${skillName} gain chance per successful gather`}
            </div>
            <div class="font-mono font-medium">
              {formatPercent(
                (resource.is_fishing_spot
                  ? fishingMasteryProcChance
                  : gatheringSkillGainChance) / 100,
                { decimals: 0, trailingZeros: true },
              )}
            </div>
          </div>
          <div>
            <div class="text-sm text-muted-foreground">
              {resource.is_fishing_spot
                ? "Fishing gain per increase"
                : `${skillName} gain per increase`}
            </div>
            <div class="font-mono">
              {#if !canAttempt || effortless || skillLevel >= 100}
                <span class="text-muted-foreground">—</span>
              {:else if resource.is_radiant_spark}
                {formatPercent(skillGain[0] / 100, {
                  decimals: 2,
                  trailingZeros: true,
                })} – {formatPercent(skillGain[1] / 100, {
                  decimals: 2,
                  trailingZeros: true,
                })}
              {:else if successChance > 0}
                {formatPercent(skillGain[0] / 100, {
                  decimals: 2,
                  trailingZeros: true,
                })} – {formatPercent(skillGain[1] / 100, {
                  decimals: 2,
                  trailingZeros: true,
                })}
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
  {#if resource.tool_required_id}
    {@const requiredItemId = resource.tool_required_id}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Key class="h-5 w-5 text-yellow-500" />
        Key
      </h2>
      <div class="bg-muted/30 rounded-md border p-4">
        <a
          href="/items/{resource.tool_required_id}"
          class="text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          {resource.tool_required_name}
        </a>
      </div>
    </section>

    <section class="space-y-4">
      <h2 class="text-xl font-semibold">Gathering and rewards</h2>
      <MethodList
        methods={enteredAcquisitionMethods}
        items={data.acquisitionItems}
        names={data.acquisitionNames}
      />
    </section>

    <!-- How to Obtain Requirement -->
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <ListTree class="h-5 w-5 text-muted-foreground" />
        How to Obtain Key
      </h2>
      <DeferredDetails
        summary="Show sources"
        className="bg-muted/30 rounded-md border p-4"
      >
        <ScrollRegion
          label="Required item sources"
          className="mt-4 max-h-[32rem] overflow-auto overscroll-contain pr-2"
        >
          <LazyObtainabilityTree itemId={requiredItemId} hideRootLink={true} />
        </ScrollRegion>
      </DeferredDetails>
    </section>
  {/if}

  <!-- Rewards -->
  {#if resource.primaryRewards.length || drops.length > 0}
    <section>
      <h2 class="mb-4 text-xl font-semibold flex items-center gap-2">
        <Gem class="h-5 w-5 text-amber-500" />
        Rewards
      </h2>

      {#if resource.is_fishing_spot}
        <div class="mb-4 space-y-3 rounded-md border bg-muted/30 p-4">
          <div class="flex items-center gap-3">
            <label for="fishing-spot-variant">Fishing spot:</label>
            <MapLink entityId={resource.id} entityType="resource" compact />
          </div>
          {#if data.fishingSpotVariants.length > 1}
            <div
              class="grid grid-cols-2 gap-2 sm:grid-cols-[4.5rem_minmax(0,1fr)_4.5rem]"
            >
              <div class="relative col-span-2 min-w-0 sm:order-2 sm:col-span-1">
                <select
                  id="fishing-spot-variant"
                  bind:value={selectedFishingSpotVariantIndex}
                  aria-label="Fishing spot"
                  class="h-11 w-full appearance-none rounded-md border bg-background px-3 pr-10 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  {#each data.fishingSpotVariants as variant, index (variant.resource.id)}
                    <option value={index}>
                      {formatFishingSpotVariant(variant)}
                    </option>
                  {/each}
                </select>
                <ChevronDown
                  class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
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
          {/if}
        </div>
      {/if}
      {#if resource.primaryRewards.length}
        <div class="mb-4 bg-muted/30 rounded-md border p-4 space-y-2">
          <PrimaryRewards rewards={resource.primaryRewards} />
          {#if resource.is_radiant_spark}
            <p class="text-muted-foreground">
              {formatPercent(radiantAetherChance / 100, {
                decimals: 1,
                trailingZeros: false,
              })} chance at the selected skill level
            </p>
          {/if}
        </div>
      {/if}

      {#if rewardDrops.length > 0}
        <DataTable
          data={rewardDrops}
          columns={dropColumns}
          renderCell={renderDropCell}
          renderHeader={renderDropHeader}
          initialSorting={resource.is_fishing_spot
            ? []
            : [{ id: "drop_rate", desc: true }]}
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

<script lang="ts">
  import { base } from "$app/paths";
  import PopupCard from "$lib/components/map/PopupCard.svelte";
  import MapEntityLink from "$lib/components/map/MapEntityLink.svelte";
  import { buildEntityUrl } from "$lib/map/url-state";
  import {
    toRomanNumeral,
    formatDuration,
    formatPercent,
    formatSpawnTimeWindow,
    formatGatheringRespawn,
    formatNumber,
  } from "$lib/utils/format";
  import { statName, formatStat } from "$lib/stats";
  import { hasNpcRole, getNpcRoles } from "$lib/utils/tooltip";
  import { formatTrapArea } from "$lib/utils/trapArea";
  import { scheduleDeferredTask } from "$lib/utils/defer";
  import {
    type AnyMapEntity,
    type MonsterMapEntity,
    type NpcMapEntity,
    type PortalMapEntity,
    type ChestMapEntity,
    type AltarMapEntity,
    type TrapMapEntity,
    type GatheringMapEntity,
    type CraftingMapEntity,
    type HouseMapEntity,
  } from "$lib/types/map";
  import {
    loadMonsterPopupDetails,
    loadNpcPopupDetails,
    loadChestPopupDetails,
    loadGatheringPopupDetails,
    loadAltarPopupDetails,
    loadAltarBasicInfo,
    loadProviderPopupDetails,
    loadRequirementPopupDetails,
    type PopupAcquisition,
    type MonsterPopupDetails,
    type NpcPopupDetails,
    type ChestPopupDetails,
    type GatheringPopupDetails,
    type AltarPopupDetails,
  } from "$lib/queries/popup";
  import AcquisitionMethods from "./AcquisitionMethods.svelte";
  import Requirements from "$lib/components/acquisition/Requirements.svelte";
  import type { LocationRef } from "$lib/acquisition/types";
  import { TRAP_TYPE_LABELS } from "$lib/constants/traps";
  import { markerRegistry, resolveMarker } from "$lib/map/marker-registry";
  import {
    reputationTierName,
    type ReputationTier,
  } from "$lib/utils/reputation";
  interface Props {
    entity: AnyMapEntity;
    reputationTiers: ReputationTier[];
    onClose: () => void;
    onFocusClick?: () => void;
    onSelectMonster: (monsterId: string) => void;
    onSelectNpc: (npcId: string) => void;
    onSelectAltar: (altarId: string) => void;
    onSelectItem: (itemId: string) => void;
    onSelectQuest: (questId: string) => void;
    onSelectZone: (zoneId: string) => void;
    onSelectLocation: (provider: LocationRef) => void;
    onHoverMonster?: (monsterId: string | null) => void;
    onHoverNpc?: (npcId: string | null) => void;
    onHoverAltar?: (altarId: string | null) => void;
    onHoverZone?: (zoneId: string | null) => void;
    mode?: "card" | "drawer";
  }

  let {
    entity,
    reputationTiers,
    onClose,
    onFocusClick,
    onSelectMonster,
    onSelectNpc,
    onSelectAltar,
    onSelectItem,
    onSelectQuest,
    onSelectZone,
    onSelectLocation,
    onHoverMonster,
    onHoverNpc,
    onHoverAltar,
    onHoverZone,
    mode = "card",
  }: Props = $props();

  // Lazy-loaded details state
  let monsterDetails = $state<MonsterPopupDetails | null>(null);
  let monsterAltarDetails = $state<
    Array<{
      id: string;
      name: string;
      zoneId: string;
      zoneName: string;
    }>
  >([]);
  let npcDetails = $state<NpcPopupDetails | null>(null);
  let chestDetails = $state<ChestPopupDetails | null>(null);
  let gatheringDetails = $state<GatheringPopupDetails | null>(null);
  let altarDetails = $state<AltarPopupDetails | null>(null);
  let providerDetails = $state<PopupAcquisition | null>(null);
  let loadError = $state<string | null>(null);
  const acquisition = $derived(
    monsterDetails ??
      npcDetails ??
      chestDetails ??
      gatheringDetails ??
      altarDetails ??
      providerDetails,
  );
  let isLoading = $state(false);

  // Load details after the selection shell has had a chance to paint.
  $effect(() => {
    const currentEntity = entity;
    let cancelled = false;

    monsterDetails = null;
    monsterAltarDetails = [];
    npcDetails = null;
    chestDetails = null;
    gatheringDetails = null;
    altarDetails = null;
    providerDetails = null;
    loadError = null;
    isLoading = true;

    async function loadDetails() {
      try {
        if (isMonster(currentEntity)) {
          const details = await loadMonsterPopupDetails(
            currentEntity.monsterId,
            currentEntity.level,
            currentEntity.id,
            currentEntity.isWorldBoss,
          );
          if (cancelled) return;
          monsterDetails = details;

          if (currentEntity.altarIds?.length) {
            const results = await Promise.all(
              currentEntity.altarIds.map(loadAltarBasicInfo),
            );
            if (cancelled) return;
            monsterAltarDetails = results.filter(
              (value): value is NonNullable<typeof value> => value !== null,
            );
          }
        } else if (currentEntity.type === "npc") {
          const npc = currentEntity as NpcMapEntity;
          const details = await loadNpcPopupDetails(
            npc.id,
            npc.isWorldBossReset,
          );
          if (cancelled) return;
          npcDetails = details;
        } else if (currentEntity.type === "chest") {
          const details = await loadChestPopupDetails(currentEntity.id);
          if (cancelled) return;
          chestDetails = details;
        } else if (isGathering(currentEntity)) {
          const details = await loadGatheringPopupDetails(currentEntity.id);
          if (cancelled) return;
          gatheringDetails = details;
        } else if (currentEntity.type === "altar") {
          const details = await loadAltarPopupDetails(currentEntity.id);
          if (cancelled) return;
          altarDetails = details;
        } else if (currentEntity.type === "portal") {
          const details = await loadRequirementPopupDetails(
            "portal",
            currentEntity.id,
          );
          if (cancelled) return;
          providerDetails = details;
        } else if (currentEntity.type === "treasure") {
          const details = await loadProviderPopupDetails({
            kind: "treasure_locations",
            id: currentEntity.id,
          });
          if (cancelled) return;
          providerDetails = details;
        } else if (
          ["crafting_station", "alchemy_table", "scribing_table"].includes(
            currentEntity.type,
          )
        ) {
          const kind =
            currentEntity.type === "alchemy_table"
              ? "alchemy_tables"
              : currentEntity.type === "scribing_table"
                ? "scribing_tables"
                : "crafting_stations";
          const details = await loadProviderPopupDetails({
            kind,
            id: currentEntity.id,
          });
          if (cancelled) return;
          providerDetails = details;
        }
      } catch (error) {
        console.error("Failed to load map entity details", error);
        if (!cancelled)
          loadError = "Could not load details. Refresh the page to try again.";
      } finally {
        if (!cancelled) {
          isLoading = false;
        }
      }
    }

    const cancelDeferredLoad = scheduleDeferredTask(() => {
      void loadDetails();
    });

    return () => {
      cancelled = true;
      cancelDeferredLoad();
    };
  });

  // Get display zone name and ID for altar-only monsters
  let displayZoneName = $derived.by(() => {
    if (monsterAltarDetails.length > 0 && entity.zoneName === "Unknown") {
      return monsterAltarDetails[0].zoneName;
    }
    return entity.zoneName;
  });

  let displayZoneId = $derived.by(() => {
    if (monsterAltarDetails.length > 0 && entity.zoneName === "Unknown") {
      return monsterAltarDetails[0].zoneId;
    }
    return entity.zoneId;
  });

  const monsterVisualAsset = $derived(monsterDetails?.visualAsset ?? null);
  const monsterImageLayout = $derived.by(() => {
    if (!isMonster(entity)) return null;
    return entity.visualAssetLayout ?? monsterVisualAsset;
  });

  const isCompositeMonsterImage = $derived(
    monsterImageLayout?.sourceType === "UnityEngine.SpriteRenderer[]",
  );

  const monsterImageReservedHeight = $derived.by(() => {
    if (!monsterImageLayout) return null;
    const maxHeight = isCompositeMonsterImage ? 96 : 112;
    return Math.min(monsterImageLayout.height, maxHeight);
  });

  function isMonster(e: AnyMapEntity): e is MonsterMapEntity {
    return ["monster", "fabled", "boss", "elite", "hunt"].includes(e.type);
  }

  function isGathering(e: AnyMapEntity): e is GatheringMapEntity {
    return [
      "gathering_plant",
      "gathering_mineral",
      "gathering_spark",
      "gathering_fish",
      "gathering_other",
    ].includes(e.type);
  }

  function getEntityUrl(entity: AnyMapEntity): string | null {
    if (isMonster(entity)) {
      return `/monsters/${entity.monsterId}`;
    }
    if (isGathering(entity)) {
      return `/gather-items/${entity.resourceId}`;
    }
    switch (entity.type) {
      case "npc":
        return `/npcs/${entity.id}`;
      case "chest":
        return `/chests/${entity.id}`;
      case "altar":
        return `/altars/${entity.id}`;
      case "trap":
        return "/traps";
      case "treasure":
        return `/professions/treasure_hunter`;
      case "house":
        return `/mechanics/inventory#house-chests`;
      default:
        return null;
    }
  }

  function getEntityTypeName(entity: AnyMapEntity): string {
    if (entity.type === "boss") {
      return entity.isWorldBoss ? "World Boss" : "Boss";
    }
    if (entity.type === "trap") {
      return TRAP_TYPE_LABELS[entity.trapType];
    }
    const markerId = resolveMarker(entity);
    return markerId ? markerRegistry[markerId].label : "Entity";
  }

  function getDisplayName(entity: AnyMapEntity): string {
    if (entity.type === "alchemy_table") {
      return "Alchemy Table";
    }
    if (entity.type === "scribing_table") {
      return "Scribing Table";
    }
    if (entity.type === "crafting_station") {
      const crafting = entity as CraftingMapEntity;
      return crafting.isCookingOven ? "Cooking Oven" : "Craft Station";
    }
    if (entity.type === "trap") {
      const trap = entity as TrapMapEntity;
      return (
        trap.effectSkillName ??
        (trap.teleportZoneName
          ? `Teleport to ${trap.teleportZoneName}`
          : "Trap")
      );
    }
    return entity.name;
  }

  const url = $derived(getEntityUrl(entity));
</script>

<PopupCard
  title={getDisplayName(entity)}
  subtitle={getEntityTypeName(entity)}
  detailsUrl={url}
  {onClose}
  {onFocusClick}
  {mode}
>
  {#if isMonster(entity) && monsterImageLayout && monsterImageReservedHeight}
    <div class="flex justify-center pb-2">
      <div
        class="flex w-full items-center justify-center"
        style={`height: ${monsterImageReservedHeight}px`}
      >
        {#if monsterVisualAsset}
          <img
            src={`${base}/${monsterVisualAsset.publicPath}`}
            alt={getDisplayName(entity)}
            width={monsterVisualAsset.width}
            height={monsterVisualAsset.height}
            class="h-auto w-auto max-w-full object-contain [image-rendering:pixelated] {isCompositeMonsterImage
              ? 'max-h-24'
              : 'max-h-28'}"
          />
        {/if}
      </div>
    </div>
  {/if}

  {#if entity.type === "npc" && npcDetails?.visualAsset}
    {@const npcVisualAsset = npcDetails.visualAsset}
    <div class="flex justify-center pb-2">
      <img
        src={`${base}/${npcVisualAsset.publicPath}`}
        alt={`${getDisplayName(entity)} NPC portrait`}
        width={npcVisualAsset.width}
        height={npcVisualAsset.height}
        class="h-auto max-h-28 w-auto max-w-full object-contain [image-rendering:pixelated]"
      />
    </div>
  {/if}

  <!-- NPC Roles (shown first, before Zone) -->
  {#if entity.type === "npc"}
    {@const npc = entity as NpcMapEntity}
    {@const roles = getNpcRoles(npc.roleBitmask)}
    {#if roles.length > 0}
      <div class="flex flex-wrap gap-1 border-b pb-2">
        {#each roles as role (role)}
          <span
            class="rounded bg-blue-500/20 px-1.5 py-0.5 text-xs text-blue-400"
            >{role}</span
          >
        {/each}
      </div>
    {/if}
  {/if}

  <div class="flex justify-between">
    <span class="text-muted-foreground">Zone</span>
    {#if displayZoneId}
      <MapEntityLink
        href={buildEntityUrl(displayZoneId, "zone")}
        onSelect={() => onSelectZone(displayZoneId!)}
        onHoverStart={() => onHoverZone?.(displayZoneId!)}
        onHoverEnd={() => onHoverZone?.(null)}
        class="text-blue-400"
      >
        {displayZoneName}
      </MapEntityLink>
    {:else}
      <span>{displayZoneName}</span>
    {/if}
  </div>
  {#if entity.type === "npc" && npcDetails?.subZones.length}
    <div class="flex justify-between gap-2">
      <span class="text-muted-foreground">Area</span>
      <span class="text-right">{npcDetails.subZones.join(", ")}</span>
    </div>
  {/if}

  <!-- House Section -->
  {#if entity.type === "house"}
    {@const house = entity as HouseMapEntity}
    <div class="flex justify-between border-t pt-2">
      <span class="text-muted-foreground">Base price</span>
      <span>{formatNumber(house.basePrice)} gold</span>
    </div>
    {#if house.subZoneName}
      <div class="flex justify-between">
        <span class="text-muted-foreground">Area</span>
        <span>{house.subZoneName}</span>
      </div>
    {/if}
    {#if house.factionId}
      <div class="flex justify-between">
        <span class="text-muted-foreground">Faction</span>
        <span>{house.factionId}</span>
      </div>
    {/if}
    {#if house.factionRequired > 0}
      <div class="flex justify-between">
        <span class="text-muted-foreground">Reputation required</span>
        <span
          >{reputationTierName(reputationTiers, house.factionRequired)} ({formatNumber(
            house.factionRequired,
          )})</span
        >
      </div>
    {/if}
  {/if}

  <!-- Monster Section -->
  {#if isMonster(entity)}
    {@const monster = entity as MonsterMapEntity}

    {#if monster.spawnType !== "placeholder" && monster.spawnType !== "altar" && !(monster.altarIds && monster.altarIds.length > 0)}
      <div class="flex justify-between">
        <span class="text-muted-foreground">Respawn</span>
        <span>{formatDuration(monster.respawnTime)}</span>
      </div>
    {/if}

    <!-- Spawn time window (only if limited) - shown prominently -->
    {@const spawnWindow = formatSpawnTimeWindow(
      monster.spawnTimeStart,
      monster.spawnTimeEnd,
    )}
    {#if spawnWindow}
      <div class="rounded bg-sky-500/20 px-2 py-1 text-sky-300">
        <span class="text-sky-400">Active</span>
        <span class="text-sky-200">{spawnWindow}</span>
        <span class="text-sky-400">game time only</span>
      </div>
    {/if}

    <!-- Rare spawn probability -->
    {#if monster.respawnProbability < 1}
      <div class="rounded bg-amber-500/20 px-2 py-1 text-amber-400">
        Rare spawn: {formatPercent(monster.respawnProbability, {
          decimals: 1,
          trailingZeros: true,
        })} chance when its respawn timer ends
      </div>
    {/if}

    <!-- Combat stats section -->
    <div class="flex justify-between border-t pt-2">
      <span class="text-muted-foreground">Level</span>
      <span>{monster.level}</span>
    </div>

    {#if monsterDetails}
      <div class="flex justify-between">
        <span class="text-muted-foreground">{statName("health")}</span>
        <span>{formatStat("health", monsterDetails.health)}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-muted-foreground">{statName("attack_power")}</span>
        <span>{formatStat("attack_power", monsterDetails.damage)}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-muted-foreground">{statName("spell_power")}</span>
        <span>{formatStat("spell_power", monsterDetails.magicDamage)}</span>
      </div>
    {/if}

    <!-- Special spawn info -->
    {#if monster.spawnType === "summon" && monster.summonKillMonsterName}
      {@const count = monster.summonKillCount ?? 1}
      <div class="rounded bg-purple-500/20 px-2 py-1 text-purple-300">
        <span class="text-purple-400">This monster cannot spawn until</span>
        {#if count > 1}all {count}{:else}its{/if}
        {#if monster.summonKillMonsterId}
          <button
            type="button"
            class="cursor-pointer text-purple-200 underline hover:opacity-80"
            onclick={() => onSelectMonster(monster.summonKillMonsterId!)}
            onmouseenter={() => onHoverMonster?.(monster.summonKillMonsterId!)}
            onmouseleave={() => onHoverMonster?.(null)}
          >
            {monster.summonKillMonsterName}
          </button>
        {:else}
          <span class="text-purple-200">{monster.summonKillMonsterName}</span>
        {/if}
        <span class="text-purple-400"
          >{count > 1
            ? "guards are dead at the same time"
            : "guard is dead"}</span
        >
        <span class="text-purple-400"
          >After this monster dies, kill its guards again. Its respawn timer
          must also finish.</span
        >
      </div>
    {/if}

    {#if monster.spawnType === "placeholder" && monster.sourceMonsterName}
      <div class="rounded bg-cyan-500/20 px-2 py-1 text-cyan-300">
        <span class="text-cyan-400"
          >{#if monster.sourceSpawnProbability != null && monster.sourceSpawnProbability < 1}{formatPercent(
              monster.sourceSpawnProbability,
              { decimals: 1, trailingZeros: true },
            )} chance to spawn when you kill{:else}Spawns when you kill{/if}</span
        >
        {#if monster.sourceMonsterId}
          <button
            type="button"
            class="cursor-pointer text-cyan-200 underline hover:opacity-80"
            onclick={() => onSelectMonster(monster.sourceMonsterId!)}
            onmouseenter={() => onHoverMonster?.(monster.sourceMonsterId!)}
            onmouseleave={() => onHoverMonster?.(null)}
          >
            {monster.sourceMonsterName}
          </button>
        {:else}
          <span class="text-cyan-200">{monster.sourceMonsterName}</span>
        {/if}
      </div>
    {/if}

    <!-- Movement info -->
    {#if monster.isPatrolling && monster.patrolWaypoints?.length}
      <div class="flex items-center gap-2 border-t pt-2">
        <span class="inline-block h-2 w-2 rounded-full bg-yellow-400"></span>
        <span class="text-muted-foreground"
          >Patrols the route shown on the map</span
        >
      </div>
    {:else if monster.moveDistance > 0}
      <div class="flex items-center gap-2 border-t pt-2">
        <span class="inline-block h-2 w-2 rounded-full bg-blue-400"></span>
        <span class="text-muted-foreground"
          >Wanders up to {formatNumber(monster.moveDistance, {
            decimals: 0,
            trailingZeros: true,
            grouping: false,
          })} yd from its spawn point</span
        >
      </div>
    {/if}

    <!-- Altar spawn info (for altar-only bosses) -->
    {#if monsterAltarDetails.length > 0}
      <div class="border-t pt-2">
        <div class="mb-1 text-sm font-medium text-muted-foreground">
          Spawns at
        </div>
        <div class="space-y-0.5">
          {#each monsterAltarDetails as altar (altar.id)}
            <div class="flex items-center justify-between gap-2">
              <MapEntityLink
                href={buildEntityUrl(altar.id, "altar")}
                onSelect={() => onSelectAltar(altar.id)}
                onHoverStart={() => onHoverAltar?.(altar.id)}
                onHoverEnd={() => onHoverAltar?.(null)}
                class="text-amber-400 dark:text-amber-400"
              >
                <span class="truncate">{altar.name}</span>
              </MapEntityLink>
              <MapEntityLink
                href={buildEntityUrl(altar.zoneId, "zone")}
                onSelect={() => onSelectZone(altar.zoneId)}
                onHoverStart={() => onHoverZone?.(altar.zoneId)}
                onHoverEnd={() => onHoverZone?.(null)}
                class="shrink-0 text-xs text-blue-400"
              >
                {altar.zoneName}
              </MapEntityLink>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Renewal Sage for world bosses -->
    {#if monsterDetails && monsterDetails.renewalSages.length > 0}
      <div class="border-t pt-2">
        <div class="mb-1 text-xs font-medium text-muted-foreground">
          Reset by
        </div>
        <div class="space-y-0.5">
          {#each monsterDetails.renewalSages as sage (sage.npcId)}
            <div class="flex justify-between gap-2">
              <MapEntityLink
                href={buildEntityUrl(sage.npcId, "npc")}
                onSelect={() => onSelectNpc(sage.npcId)}
                onHoverStart={() => onHoverNpc?.(sage.npcId)}
                onHoverEnd={() => onHoverNpc?.(null)}
                class="truncate text-blue-400"
              >
                {sage.npcName}
              </MapEntityLink>
              <span class="shrink-0 text-xs">
                {#if sage.cost > 0}
                  <span class="text-muted-foreground"
                    >{formatNumber(sage.cost)} gold</span
                  >
                {:else}
                  <span class="text-muted-foreground">Free</span>
                {/if}
              </span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}

  <!-- NPC Section -->
  {#if entity.type === "npc"}
    {@const npc = entity as NpcMapEntity}

    <!-- Teleport destination -->
    {#if npc.hasTeleport && npc.teleportDestName}
      <div class="flex justify-between">
        <span class="text-muted-foreground">Teleports to</span>
        {#if npc.teleportZoneId}
          <MapEntityLink
            href={buildEntityUrl(npc.teleportZoneId, "zone")}
            onSelect={() => onSelectZone(npc.teleportZoneId!)}
            onHoverStart={() => onHoverZone?.(npc.teleportZoneId!)}
            onHoverEnd={() => onHoverZone?.(null)}
            class="text-blue-400"
          >
            {npc.teleportDestName}
          </MapEntityLink>
        {:else}
          <span>{npc.teleportDestName}</span>
        {/if}
      </div>
      {#if npc.teleportPrice > 0}
        <div class="flex justify-between">
          <span class="text-muted-foreground">Cost</span>
          <span class="text-yellow-500"
            >{formatNumber(npc.teleportPrice)} gold</span
          >
        </div>
      {/if}
    {/if}

    <!-- Renewal Sage dungeon -->
    {#if hasNpcRole(npc.roleBitmask, "isRenewalSage") && npc.renewalDungeonName}
      <div class="flex justify-between">
        <span class="text-muted-foreground">Resets</span>
        {#if npc.renewalDungeonZoneId}
          <MapEntityLink
            href={buildEntityUrl(npc.renewalDungeonZoneId, "zone")}
            onSelect={() => onSelectZone(npc.renewalDungeonZoneId!)}
            onHoverStart={() => onHoverZone?.(npc.renewalDungeonZoneId!)}
            onHoverEnd={() => onHoverZone?.(null)}
            class="text-blue-400"
          >
            {npc.renewalDungeonName}
          </MapEntityLink>
        {:else}
          <span class="text-purple-400">{npc.renewalDungeonName}</span>
        {/if}
      </div>
    {/if}

    <!-- World Bosses (for Renewal Sages with world boss reset) -->
    {#if npcDetails && npcDetails.worldBosses.length > 0}
      <div class="border-t pt-2">
        <div class="mb-1 text-xs font-medium text-muted-foreground">
          World Bosses
        </div>
        <div class="max-h-48 space-y-0.5 overflow-y-auto pr-2">
          {#each npcDetails.worldBosses as boss (boss.id)}
            <div class="flex justify-between gap-2">
              <MapEntityLink
                href={buildEntityUrl(boss.id, "monster")}
                onSelect={() => onSelectMonster(boss.id)}
                onHoverStart={() => onHoverMonster?.(boss.id)}
                onHoverEnd={() => onHoverMonster?.(null)}
                class="truncate text-cyan-400"
              >
                {boss.name}
              </MapEntityLink>
              <span class="shrink-0 text-xs text-muted-foreground"
                >Lv {boss.level}</span
              >
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Movement info -->
    {#if npc.isPatrolling && npc.patrolWaypoints?.length}
      <div class="flex items-center gap-2 border-t pt-2">
        <span class="inline-block h-2 w-2 rounded-full bg-yellow-400"></span>
        <span class="text-muted-foreground"
          >Patrols the route shown on the map</span
        >
      </div>
    {:else if npc.moveDistance > 0}
      <div class="flex items-center gap-2 border-t pt-2">
        <span class="inline-block h-2 w-2 rounded-full bg-blue-400"></span>
        <span class="text-muted-foreground"
          >Wanders up to {formatNumber(npc.moveDistance, {
            decimals: 0,
            trailingZeros: true,
            grouping: false,
          })} yd from its spawn point</span
        >
      </div>
    {/if}

    <!-- Quests (lazy-loaded) -->
    {#if isLoading && npc.questCount > 0}
      <div class="py-2 text-center text-xs text-muted-foreground">
        Loading...
      </div>
    {:else if npcDetails && npcDetails.quests.length > 0}
      <div class="border-t pt-2">
        <div class="mb-1 text-xs font-medium text-muted-foreground">Quests</div>
        <div class="max-h-48 space-y-0.5 overflow-y-auto pr-2">
          {#each npcDetails.quests as quest, i (i)}
            <div class="flex justify-between gap-2">
              <MapEntityLink
                href={buildEntityUrl(quest.id, "quest")}
                onSelect={() => onSelectQuest(quest.id)}
                class="truncate text-blue-400"
              >
                {quest.name}
              </MapEntityLink>
              <span class="shrink-0 text-xs text-muted-foreground"
                >{quest.role === "offer" ? "Start" : "Complete"}, Lv {quest.levelRecommended}</span
              >
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if npcDetails?.skills.length}
      <div class="border-t pt-2">
        <h3 class="font-medium">Skills</h3>
        <div class="max-h-48 space-y-1 overflow-y-auto pr-2 text-sm">
          {#each npcDetails.skills as skill (skill.index)}
            <a href={`/skills/${skill.id}`} class="text-blue-400 underline"
              >{skill.name}</a
            >
          {/each}
        </div>
      </div>
    {/if}
  {/if}

  <!-- Portal Section -->
  {#if entity.type === "portal"}
    {@const portal = entity as PortalMapEntity}
    {#if portal.isClosed}
      <span class="rounded bg-red-500/20 px-1.5 py-0.5 text-red-400"
        >Closed</span
      >
    {:else}
      {#if portal.destinationZoneName}
        <div class="flex justify-between">
          <span class="text-muted-foreground">Destination</span>
          {#if portal.destinationZoneId}
            <MapEntityLink
              href={buildEntityUrl(portal.destinationZoneId, "zone")}
              onSelect={() => onSelectZone(portal.destinationZoneId!)}
              onHoverStart={() => onHoverZone?.(portal.destinationZoneId!)}
              onHoverEnd={() => onHoverZone?.(null)}
              class="text-blue-400"
            >
              {portal.destinationZoneName}
            </MapEntityLink>
          {:else}
            <span>{portal.destinationZoneName}</span>
          {/if}
        </div>
      {/if}

      {#if providerDetails}<Requirements
          roots={providerDetails.requirements}
          names={providerDetails.names}
        />{/if}
    {/if}
  {/if}

  <!-- Chest Section -->
  {#if entity.type === "chest"}
    {@const chest = entity as ChestMapEntity}
    <div class="flex justify-between">
      <span class="text-muted-foreground">Respawn</span>
      <span>{formatDuration(chest.respawnTime)}</span>
    </div>
  {/if}

  <!-- Trap Section -->
  {#if entity.type === "trap"}
    {@const trap = entity as TrapMapEntity}
    {#if trap.effectSkillId && trap.effectSkillName}
      <div class="flex justify-between gap-4">
        <span class="text-muted-foreground">Effect</span>
        <a
          href="/skills/{trap.effectSkillId}"
          class="text-blue-600 dark:text-blue-400 hover:underline text-right"
        >
          {trap.effectSkillName}
        </a>
      </div>
    {/if}
    {#if trap.teleportZoneId && trap.teleportZoneName}
      <div class="flex justify-between gap-4">
        <span class="text-muted-foreground">Teleports to</span>
        <a
          href="/zones/{trap.teleportZoneId}"
          class="text-blue-600 dark:text-blue-400 hover:underline text-right"
        >
          {trap.teleportZoneName}
        </a>
      </div>
    {/if}
    {#if trap.fireInterval != null}
      <div class="flex justify-between">
        <span class="text-muted-foreground">Fires every</span>
        <span>{trap.fireInterval}s</span>
      </div>
    {/if}
    <!-- Area info, matching the outline drawn for the selected trap -->
    {#if trap.areaPaths}
      <div class="flex items-center gap-2 border-t pt-2">
        <span class="inline-block h-2 w-2 rounded-full bg-rose-500"></span>
        <span class="text-muted-foreground"
          >Trap area: {formatTrapArea(trap.areaPaths)}</span
        >
      </div>
    {/if}
  {/if}

  <!-- Altar Section -->
  {#if entity.type === "altar"}
    {@const altar = entity as AltarMapEntity}
    {@const bosses = [
      ...new Map(
        altar.finalBossNames.map((name, index) => {
          const id = altar.finalBossIds[index];
          const key = id || `unpublished:${index}`;
          return [key, { id, name, key }];
        }),
      ).values(),
    ]}
    {#if altar.minLevel > 0}
      <div class="flex justify-between">
        <span class="text-muted-foreground">Level</span>
        <span>{altar.minLevel}+</span>
      </div>
    {/if}
    <div class="flex justify-between">
      <span class="text-muted-foreground">Waves</span>
      <span>{altar.totalWaves}</span>
    </div>

    <!-- Boss names prominently -->
    {#if bosses.length > 0}
      <div class="mt-1 rounded bg-red-500/20 px-2 py-1">
        <span class="text-red-400">Boss: </span>
        {#each bosses as boss, i (boss.key)}
          {#if boss.id}
            <button
              type="button"
              onclick={() => onSelectMonster(boss.id)}
              onmouseenter={() => onHoverMonster?.(boss.id)}
              onmouseleave={() => onHoverMonster?.(null)}
              class="cursor-pointer text-red-200 underline hover:opacity-80"
              >{boss.name}</button
            >
          {:else}
            <span class="text-red-200">{boss.name}</span>
          {/if}
          {#if i < bosses.length - 1},
          {/if}
        {/each}
      </div>
    {/if}

    <!-- Event radius info -->
    {#if altar.radiusEvent > 0}
      <div class="flex items-center gap-2 border-t pt-2">
        <span class="inline-block h-2 w-2 rounded-full bg-amber-400"></span>
        <span class="text-muted-foreground"
          >Event radius {altar.radiusEvent} yd. The event ends if the player who started
          it leaves this area or dies.</span
        >
      </div>
    {/if}
  {/if}

  <!-- Gathering Section -->
  {#if isGathering(entity)}
    {@const gathering = entity as GatheringMapEntity}
    {#if entity.type === "gathering_plant" || entity.type === "gathering_mineral" || entity.type === "gathering_fish"}
      <div class="flex justify-between">
        <span class="text-muted-foreground">Tier</span>
        <span>{toRomanNumeral(gathering.level)}</span>
      </div>
    {/if}
    {#if entity.type !== "gathering_fish"}
      <div class="flex justify-between">
        <span class="text-muted-foreground">Respawn</span>
        <span>{formatGatheringRespawn(entity.type, gathering.respawnTime)}</span
        >
      </div>
    {/if}
  {/if}

  {#if loadError}<p class="text-destructive">{loadError}</p>{/if}
  {#if isLoading}<p class="text-sm text-muted-foreground">
      Loading details...
    </p>{/if}
  {#if acquisition}
    <AcquisitionMethods
      data={acquisition}
      {onSelectItem}
      selectedProviderId={entity.id}
      onSelectProvider={(provider) => onSelectLocation(provider.ref)}
      showRequirements={entity.type !== "portal"}
    />
  {/if}
</PopupCard>

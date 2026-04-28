<script lang="ts">
  import { base } from "$app/paths";
  import PopupCard from "$lib/components/map/PopupCard.svelte";
  import MapItemLink from "$lib/components/map/MapItemLink.svelte";
  import MapEntityLink from "$lib/components/map/MapEntityLink.svelte";
  import { buildEntityUrl } from "$lib/map/url-state";
  import {
    toRomanNumeral,
    formatDuration,
    formatPercent,
    formatSpawnTimeWindow,
    getQualityTextColorClass,
    formatGatheringRespawn,
    formatAltarRewardTier,
  } from "$lib/utils/format";
  import { hasNpcRole, getNpcRoles } from "$lib/utils/tooltip";
  import {
    type AnyMapEntity,
    type MonsterMapEntity,
    type NpcMapEntity,
    type PortalMapEntity,
    type ChestMapEntity,
    type TreasureMapEntity,
    type AltarMapEntity,
    type GatheringMapEntity,
    type CraftingMapEntity,
  } from "$lib/types/map";
  import {
    loadMonsterPopupDetails,
    loadNpcPopupDetails,
    loadChestPopupDetails,
    loadGatheringPopupDetails,
    loadAltarPopupDetails,
    loadAltarBasicInfo,
    type MonsterPopupDetails,
    type NpcPopupDetails,
    type ChestPopupDetails,
    type GatheringPopupDetails,
    type AltarPopupDetails,
  } from "$lib/queries/popup";
  interface Props {
    entity: AnyMapEntity;
    onClose: () => void;
    onFocusClick?: () => void;
    onSelectMonster: (monsterId: string) => void;
    onSelectNpc: (npcId: string) => void;
    onSelectAltar: (altarId: string) => void;
    onSelectItem: (itemId: string) => void;
    onSelectQuest: (questId: string) => void;
    onSelectZone: (zoneId: string) => void;
    onHoverMonster?: (monsterId: string | null) => void;
    onHoverNpc?: (npcId: string | null) => void;
    onHoverAltar?: (altarId: string | null) => void;
    onHoverZone?: (zoneId: string | null) => void;
    mode?: "card" | "drawer";
  }

  let {
    entity,
    onClose,
    onFocusClick,
    onSelectMonster,
    onSelectNpc,
    onSelectAltar,
    onSelectItem,
    onSelectQuest,
    onSelectZone,
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
      details: AltarPopupDetails;
    }>
  >([]);
  let npcDetails = $state<NpcPopupDetails | null>(null);
  let chestDetails = $state<ChestPopupDetails | null>(null);
  let gatheringDetails = $state<GatheringPopupDetails | null>(null);
  let altarDetails = $state<AltarPopupDetails | null>(null);
  let isLoading = $state(false);

  // Load details when entity changes
  $effect(() => {
    const currentEntity = entity;
    monsterDetails = null;
    monsterAltarDetails = [];
    npcDetails = null;
    chestDetails = null;
    gatheringDetails = null;
    altarDetails = null;

    async function loadDetails() {
      isLoading = true;
      try {
        if (isMonster(currentEntity)) {
          const isBossOrElite = currentEntity.isBoss || currentEntity.isElite;
          monsterDetails = await loadMonsterPopupDetails(
            currentEntity.monsterId,
            isBossOrElite,
            currentEntity.isWorldBoss,
          );

          // Load altar info if monster spawns in altars
          if (currentEntity.altarIds && currentEntity.altarIds.length > 0) {
            const altarPromises = currentEntity.altarIds.map(
              async (altarId) => {
                const [info, details] = await Promise.all([
                  loadAltarBasicInfo(altarId),
                  loadAltarPopupDetails(altarId),
                ]);
                if (info) {
                  return {
                    id: info.id,
                    name: info.name,
                    zoneId: info.zoneId,
                    zoneName: info.zoneName,
                    details,
                  };
                }
                return null;
              },
            );
            const results = await Promise.all(altarPromises);
            monsterAltarDetails = results.filter(
              (
                r,
              ): r is {
                id: string;
                name: string;
                zoneId: string;
                zoneName: string;
                details: AltarPopupDetails;
              } => r !== null,
            );
          }
        } else if (currentEntity.type === "npc") {
          const npc = currentEntity as NpcMapEntity;
          npcDetails = await loadNpcPopupDetails(npc.id, npc.isWorldBossReset);
        } else if (currentEntity.type === "chest") {
          chestDetails = await loadChestPopupDetails(currentEntity.id);
        } else if (isGathering(currentEntity)) {
          gatheringDetails = await loadGatheringPopupDetails(currentEntity.id);
        } else if (currentEntity.type === "altar") {
          altarDetails = await loadAltarPopupDetails(currentEntity.id);
        }
      } finally {
        isLoading = false;
      }
    }

    loadDetails();
  });

  // Filter monster drops to exclude items already shown as altar rewards
  let filteredMonsterDrops = $derived.by(() => {
    if (!monsterDetails || monsterAltarDetails.length === 0) {
      return monsterDetails?.drops ?? [];
    }
    const rewardItemIds = new Set(
      monsterAltarDetails.flatMap((altar) =>
        altar.details.rewards.map((r) => r.itemId),
      ),
    );
    return monsterDetails.drops.filter(
      (drop) => !rewardItemIds.has(drop.itemId),
    );
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

  const isCompositeMonsterImage = $derived(
    monsterDetails?.visualAsset?.sourceType === "UnityEngine.SpriteRenderer[]",
  );

  function isMonster(e: AnyMapEntity): e is MonsterMapEntity {
    return ["monster", "fabled", "boss", "elite", "hunt"].includes(e.type);
  }

  function isGathering(e: AnyMapEntity): e is GatheringMapEntity {
    return [
      "gathering_plant",
      "gathering_mineral",
      "gathering_spark",
      "gathering_other",
    ].includes(e.type);
  }

  function getEntityUrl(entity: AnyMapEntity): string | null {
    if (isMonster(entity)) {
      return `/monsters/${entity.monsterId}`;
    }
    if (isGathering(entity)) {
      return `/gather-items/${entity.id}`;
    }
    switch (entity.type) {
      case "npc":
        return `/npcs/${entity.id}`;
      case "chest":
        return `/chests/${entity.id}`;
      case "altar":
        return `/altars/${entity.id}`;
      case "treasure":
        return `/professions/treasure_hunter`;
      default:
        return null;
    }
  }

  function getEntityTypeName(entity: AnyMapEntity): string {
    switch (entity.type) {
      case "monster":
        return "Creature";
      case "fabled":
        return "Fabled";
      case "boss":
        return (entity as MonsterMapEntity).isWorldBoss ? "World Boss" : "Boss";
      case "elite":
        return "Elite";
      case "hunt":
        return "Hunt";
      case "npc":
        return "NPC";
      case "portal":
        return "Portal";
      case "chest":
        return "Chest";
      case "treasure":
        return "Treasure";
      case "altar":
        return "Altar";
      case "gathering_plant":
        return "Plant";
      case "gathering_mineral":
        return "Mineral";
      case "gathering_spark":
        return "Spark";
      case "gathering_other":
        return "Resource";
      case "alchemy_table":
      case "crafting_station":
      case "scribing_table":
        return "Crafting Station";
      default:
        return "Unknown";
    }
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
      return crafting.isCookingOven ? "Cooking Oven" : "Forge";
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
  {#if isMonster(entity) && monsterDetails && monsterDetails.visualAsset}
    <div class="flex justify-center pb-2">
      <img
        src={`${base}/${monsterDetails.visualAsset.publicPath}`}
        alt={`${getDisplayName(entity)} monster sprite`}
        width={monsterDetails.visualAsset.width}
        height={monsterDetails.visualAsset.height}
        class="h-auto w-auto max-w-full object-contain [image-rendering:pixelated] {isCompositeMonsterImage
          ? 'max-h-24'
          : 'max-h-28'}"
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
        <span class="text-sky-400">only</span>
      </div>
    {/if}

    <!-- Rare spawn probability -->
    {#if monster.respawnProbability < 1}
      <div class="rounded bg-amber-500/20 px-2 py-1 text-amber-400">
        Rare spawn ({formatPercent(monster.respawnProbability)} chance)
      </div>
    {/if}

    <!-- Combat stats section -->
    <div class="flex justify-between border-t pt-2">
      <span class="text-muted-foreground">Level</span>
      <span>{monster.level}</span>
    </div>

    {#if monsterDetails}
      <div class="flex justify-between">
        <span class="text-muted-foreground">Health</span>
        <span>{monsterDetails.health.toLocaleString()}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-muted-foreground">Damage</span>
        <span>{monsterDetails.damage.toLocaleString()}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-muted-foreground">Magic Damage</span>
        <span>{monsterDetails.magicDamage.toLocaleString()}</span>
      </div>
    {/if}

    <!-- Special spawn info -->
    {#if monster.spawnType === "summon" && monster.summonKillMonsterName}
      {@const count = monster.summonKillCount ?? 1}
      <div class="rounded bg-purple-500/20 px-2 py-1 text-purple-300">
        <span class="text-purple-400">Blocked from respawning while</span>
        {#if count > 1}{count}x{/if}
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
        <span class="text-purple-400">{count > 1 ? "are" : "is"} alive</span>
      </div>
    {/if}

    {#if monster.spawnType === "placeholder" && monster.sourceMonsterName}
      <div class="rounded bg-cyan-500/20 px-2 py-1 text-cyan-300">
        <span class="text-cyan-400">Spawns after killing</span>
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
        {#if monster.sourceSpawnProbability && monster.sourceSpawnProbability < 1}
          <span class="text-cyan-400"
            >({formatPercent(monster.sourceSpawnProbability)})</span
          >
        {/if}
      </div>
    {/if}

    <!-- Movement info -->
    {#if monster.isPatrolling && monster.patrolWaypoints?.length}
      <div class="flex items-center gap-2 border-t pt-2">
        <span class="inline-block h-2 w-2 rounded-full bg-yellow-400"></span>
        <span class="text-muted-foreground"
          >Patrols {monster.patrolWaypoints.length} waypoints</span
        >
      </div>
    {:else if monster.moveDistance > 0}
      <div class="flex items-center gap-2 border-t pt-2">
        <span class="inline-block h-2 w-2 rounded-full bg-blue-400"></span>
        <span class="text-muted-foreground"
          >Wanders {monster.moveDistance.toFixed(0)} units</span
        >
      </div>
    {/if}

    <!-- Altar spawn info (for altar-only bosses) -->
    {#if monsterAltarDetails.length > 0}
      <div class="border-t pt-2">
        <div class="mb-1 text-xs font-medium text-muted-foreground">
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

      <!-- Altar tier rewards -->
      {#each monsterAltarDetails as altar (altar.id)}
        {#if altar.details.rewards.length > 0}
          <div class="border-t pt-2">
            <div class="mb-1 text-xs font-medium text-muted-foreground">
              {altar.name} Rewards
            </div>
            <div class="space-y-1.5">
              {#each altar.details.rewards as reward (reward.tier)}
                <div>
                  <MapItemLink
                    itemId={reward.itemId}
                    itemName={reward.itemName}
                    tooltipHtml={reward.tooltipHtml}
                    colorClass={getQualityTextColorClass(reward.quality)}
                    class="truncate"
                    onSelect={onSelectItem}
                  />
                  <div class="text-xs text-muted-foreground">
                    {formatAltarRewardTier(reward.tier)}
                    {#if reward.dropRate !== null}
                      · {formatPercent(reward.dropRate)}
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      {/each}
    {/if}

    <!-- Drops (lazy-loaded, excluding altar rewards) -->
    {#if isLoading}
      <div class="py-2 text-center text-xs text-muted-foreground">
        Loading...
      </div>
    {:else if filteredMonsterDrops.length > 0}
      <div class="border-t pt-2">
        <div class="mb-1 text-xs font-medium text-muted-foreground">Drops</div>
        <div class="max-h-48 space-y-0.5 overflow-y-auto pr-2">
          {#each filteredMonsterDrops as drop, i (i)}
            <div class="flex justify-between gap-2">
              <MapItemLink
                itemId={drop.itemId}
                itemName={drop.itemName}
                tooltipHtml={drop.tooltipHtml}
                colorClass={getQualityTextColorClass(drop.quality)}
                class="truncate"
                onSelect={onSelectItem}
              />
              <span class="shrink-0 text-muted-foreground"
                >{formatPercent(drop.dropRate)}</span
              >
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
                    >{sage.cost.toLocaleString()}</span
                  >
                  <button
                    type="button"
                    class="cursor-pointer text-blue-400 hover:underline"
                    onclick={() => onSelectItem("adventurers_essence")}
                  >
                    Adv. Essence
                  </button>
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
            >{npc.teleportPrice.toLocaleString()} gold</span
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
          >Patrols {npc.patrolWaypoints.length} waypoints</span
        >
      </div>
    {:else if npc.moveDistance > 0}
      <div class="flex items-center gap-2 border-t pt-2">
        <span class="inline-block h-2 w-2 rounded-full bg-blue-400"></span>
        <span class="text-muted-foreground"
          >Wanders {npc.moveDistance.toFixed(0)} units</span
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
                >Lv {quest.levelRecommended}</span
              >
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Items sold (lazy-loaded) -->
    {#if isLoading && npc.itemsSoldCount > 0}
      <div class="py-2 text-center text-xs text-muted-foreground">
        Loading...
      </div>
    {:else if npcDetails && npcDetails.itemsSold.length > 0}
      <div class="border-t pt-2">
        <div class="mb-1 text-xs font-medium text-muted-foreground">
          Items for Sale
        </div>
        <div class="max-h-48 space-y-0.5 overflow-y-auto pr-2">
          {#each npcDetails.itemsSold as item, i (i)}
            <div>
              <MapItemLink
                itemId={item.itemId}
                itemName={item.itemName}
                tooltipHtml={item.tooltipHtml}
                colorClass={getQualityTextColorClass(item.quality)}
                class="truncate"
                onSelect={onSelectItem}
              />
            </div>
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

      <!-- Requirements section -->
      {@const hasRequirements =
        portal.requiredLevel > 0 ||
        portal.requiredItemLevel > 0 ||
        portal.requiredItemName ||
        portal.needMonsterDeadName}
      {#if hasRequirements}
        <div class="border-t pt-2">
          <div class="mb-1 text-xs font-medium text-muted-foreground">
            Requirements
          </div>
          <div class="space-y-1">
            {#if portal.requiredLevel > 0}
              <div class="flex justify-between">
                <span class="text-muted-foreground">Level</span>
                <span>{portal.requiredLevel}+</span>
              </div>
            {/if}
            {#if portal.requiredItemLevel > 0}
              <div class="flex justify-between">
                <span class="text-muted-foreground">Item Level</span>
                <span>{portal.requiredItemLevel}+</span>
              </div>
            {/if}
            {#if portal.requiredItemName && portal.requiredItemId}
              <div class="flex justify-between">
                <span class="text-muted-foreground">Key</span>
                <MapItemLink
                  itemId={portal.requiredItemId}
                  itemName={portal.requiredItemName}
                  tooltipHtml={null}
                  onSelect={onSelectItem}
                />
              </div>
            {:else if portal.requiredItemName}
              <div class="flex justify-between">
                <span class="text-muted-foreground">Key</span>
                <span>{portal.requiredItemName}</span>
              </div>
            {/if}
            {#if portal.needMonsterDeadName}
              <div class="rounded bg-red-500/20 px-2 py-1 text-red-300">
                <span class="text-red-400">Kill</span>
                {#if portal.needMonsterDeadId}
                  <button
                    type="button"
                    class="cursor-pointer text-red-200 underline hover:opacity-80"
                    onclick={() => onSelectMonster(portal.needMonsterDeadId!)}
                    onmouseenter={() =>
                      onHoverMonster?.(portal.needMonsterDeadId!)}
                    onmouseleave={() => onHoverMonster?.(null)}
                  >
                    {portal.needMonsterDeadName}
                  </button>
                {:else}
                  <span class="text-red-200">{portal.needMonsterDeadName}</span>
                {/if}
                <span class="text-red-400">to unlock</span>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    {/if}
  {/if}

  <!-- Chest Section -->
  {#if entity.type === "chest"}
    {@const chest = entity as ChestMapEntity}
    {#if chest.keyRequiredName && chest.keyRequiredId}
      <div class="flex justify-between">
        <span class="text-muted-foreground">Key</span>
        <MapItemLink
          itemId={chest.keyRequiredId}
          itemName={chest.keyRequiredName}
          tooltipHtml={null}
          onSelect={onSelectItem}
        />
      </div>
    {:else if chest.keyRequiredName}
      <div class="flex justify-between">
        <span class="text-muted-foreground">Key</span>
        <span>{chest.keyRequiredName}</span>
      </div>
    {/if}
    <div class="flex justify-between">
      <span class="text-muted-foreground">Respawn</span>
      <span>{formatDuration(chest.respawnTime)}</span>
    </div>

    <!-- Drops (lazy-loaded) -->
    {#if isLoading}
      <div class="py-2 text-center text-xs text-muted-foreground">
        Loading...
      </div>
    {:else if chestDetails && chestDetails.drops.length > 0}
      <div class="border-t pt-2">
        <div class="mb-1 text-xs font-medium text-muted-foreground">Drops</div>
        <div class="max-h-48 space-y-0.5 overflow-y-auto pr-2">
          {#each chestDetails.drops as drop, i (i)}
            <div>
              <div class="flex justify-between gap-2">
                <MapItemLink
                  itemId={drop.itemId}
                  itemName={drop.itemName}
                  tooltipHtml={drop.tooltipHtml}
                  colorClass={getQualityTextColorClass(drop.quality)}
                  class="truncate"
                  onSelect={onSelectItem}
                />
                <span class="shrink-0 text-muted-foreground"
                  >{formatPercent(drop.dropRate)}</span
                >
              </div>
              {#if drop.isRandomItem && drop.randomItemOutcomes}
                <div class="ml-2 truncate text-muted-foreground">
                  <span>Can be:</span>
                  {#each drop.randomItemOutcomes.slice(0, 3) as outcome, j (j)}
                    <button
                      type="button"
                      onclick={() => onSelectItem(outcome.itemId)}
                      class="cursor-pointer text-blue-400 underline hover:opacity-80"
                      >{outcome.itemName}{j <
                      Math.min(drop.randomItemOutcomes.length, 3) - 1
                        ? ","
                        : ""}</button
                    >
                  {/each}
                  {#if drop.randomItemOutcomes.length > 3}...{/if}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}

  <!-- Treasure Section -->
  {#if entity.type === "treasure"}
    {@const treasure = entity as TreasureMapEntity}
    <div class="flex justify-between">
      <span class="text-muted-foreground">Map</span>
      <MapItemLink
        itemId={treasure.requiredMapId}
        itemName={treasure.requiredMapName}
        tooltipHtml={treasure.requiredMapTooltipHtml}
        onSelect={onSelectItem}
      />
    </div>
    <div class="flex justify-between">
      <span class="text-muted-foreground">Tool</span>
      <MapItemLink
        itemId="shovel"
        itemName="Shovel"
        tooltipHtml={null}
        onSelect={onSelectItem}
      />
    </div>
    {#if treasure.rewardId && treasure.rewardName}
      <div class="flex justify-between">
        <span class="text-muted-foreground">Reward</span>
        <MapItemLink
          itemId={treasure.rewardId}
          itemName={treasure.rewardName}
          tooltipHtml={treasure.rewardTooltipHtml}
          onSelect={onSelectItem}
        />
      </div>
    {/if}
  {/if}

  <!-- Altar Section -->
  {#if entity.type === "altar"}
    {@const altar = entity as AltarMapEntity}
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
    {#if altar.activationItemName && altar.activationItemId}
      <div class="flex justify-between">
        <span class="text-muted-foreground">Requires</span>
        <MapItemLink
          itemId={altar.activationItemId}
          itemName={altar.activationItemName}
          tooltipHtml={null}
          onSelect={onSelectItem}
        />
      </div>
    {:else if altar.activationItemName}
      <div class="flex justify-between">
        <span class="text-muted-foreground">Requires</span>
        <span>{altar.activationItemName}</span>
      </div>
    {/if}

    <!-- Boss names prominently -->
    {#if altar.finalBossNames.length > 0}
      <div class="mt-1 rounded bg-red-500/20 px-2 py-1">
        <span class="text-red-400">Boss: </span>
        {#each altar.finalBossNames as bossName, i (i)}
          {#if altar.finalBossIds[i]}
            <button
              type="button"
              onclick={() => onSelectMonster(altar.finalBossIds[i])}
              onmouseenter={() => onHoverMonster?.(altar.finalBossIds[i])}
              onmouseleave={() => onHoverMonster?.(null)}
              class="cursor-pointer text-red-200 underline hover:opacity-80"
              >{bossName}</button
            >
          {:else}
            <span class="text-red-200">{bossName}</span>
          {/if}
          {#if i < altar.finalBossNames.length - 1},
          {/if}
        {/each}
      </div>
    {/if}

    <!-- Event radius info -->
    {#if altar.radiusEvent > 0}
      <div class="flex items-center gap-2 border-t pt-2">
        <span class="inline-block h-2 w-2 rounded-full bg-amber-400"></span>
        <span class="text-muted-foreground"
          >Event radius {altar.radiusEvent} units</span
        >
      </div>
    {/if}

    <!-- Rewards by tier (lazy-loaded) -->
    {#if isLoading}
      <div class="py-2 text-center text-xs text-muted-foreground">
        Loading...
      </div>
    {:else if altarDetails && altarDetails.rewards.length > 0}
      <div class="border-t pt-2">
        <div class="mb-1 text-xs font-medium text-muted-foreground">
          Rewards
        </div>
        <div class="space-y-2">
          {#each altarDetails.rewards as reward (reward.tier)}
            <div>
              <MapItemLink
                itemId={reward.itemId}
                itemName={reward.itemName}
                tooltipHtml={reward.tooltipHtml}
                colorClass={getQualityTextColorClass(reward.quality)}
                class="truncate"
                onSelect={onSelectItem}
              />
              <div class="text-xs text-muted-foreground">
                {formatAltarRewardTier(reward.tier)}
                {#if reward.dropRate !== null}
                  · {formatPercent(reward.dropRate)}
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Boss bestiary drops (lazy-loaded) -->
    {#if altarDetails && altarDetails.bossDrops.length > 0}
      {#each altarDetails.bossDrops as bossDrop (bossDrop.monsterId)}
        <div class="border-t pt-2">
          <div class="mb-1 text-xs font-medium text-muted-foreground">
            <button
              type="button"
              onclick={() => onSelectMonster(bossDrop.monsterId)}
              onmouseenter={() => onHoverMonster?.(bossDrop.monsterId)}
              onmouseleave={() => onHoverMonster?.(null)}
              class="cursor-pointer underline hover:opacity-80"
            >
              {bossDrop.monsterName}
            </button>
            Drops
          </div>
          <div class="max-h-48 space-y-0.5 overflow-y-auto pr-2">
            {#each bossDrop.drops as drop, i (i)}
              <div class="flex justify-between gap-2">
                <MapItemLink
                  itemId={drop.itemId}
                  itemName={drop.itemName}
                  tooltipHtml={drop.tooltipHtml}
                  colorClass={getQualityTextColorClass(drop.quality)}
                  class="truncate"
                  onSelect={onSelectItem}
                />
                <span class="shrink-0 text-muted-foreground"
                  >{formatPercent(drop.dropRate)}</span
                >
              </div>
            {/each}
          </div>
        </div>
      {/each}
    {/if}
  {/if}

  <!-- Gathering Section -->
  {#if isGathering(entity)}
    {@const gathering = entity as GatheringMapEntity}
    {#if entity.type === "gathering_plant" || entity.type === "gathering_mineral"}
      <div class="flex justify-between">
        <span class="text-muted-foreground">Tier</span>
        <span>{toRomanNumeral(gathering.level)}</span>
      </div>
    {/if}
    {#if gathering.toolRequiredName && gathering.toolRequiredId}
      <div class="flex justify-between">
        <span class="text-muted-foreground">Tool</span>
        <MapItemLink
          itemId={gathering.toolRequiredId}
          itemName={gathering.toolRequiredName}
          tooltipHtml={null}
          onSelect={onSelectItem}
        />
      </div>
    {:else if gathering.toolRequiredName}
      <div class="flex justify-between">
        <span class="text-muted-foreground">Tool</span>
        <span>{gathering.toolRequiredName}</span>
      </div>
    {/if}
    <div class="flex justify-between">
      <span class="text-muted-foreground">Respawn</span>
      <span>{formatGatheringRespawn(entity.type, gathering.respawnTime)}</span>
    </div>

    <!-- Drops (lazy-loaded) -->
    {#if isLoading}
      <div class="py-2 text-center text-xs text-muted-foreground">
        Loading...
      </div>
    {:else if gatheringDetails && gatheringDetails.drops.length > 0}
      <div class="border-t pt-2">
        <div class="mb-1 text-xs font-medium text-muted-foreground">Drops</div>
        <div class="max-h-48 space-y-0.5 overflow-y-auto pr-2">
          {#each gatheringDetails.drops as drop, i (i)}
            <div class="flex justify-between gap-2">
              <MapItemLink
                itemId={drop.itemId}
                itemName={drop.itemName}
                tooltipHtml={drop.tooltipHtml}
                colorClass={getQualityTextColorClass(drop.quality)}
                class="truncate"
                onSelect={onSelectItem}
              />
              <span class="shrink-0 text-muted-foreground">
                {#if drop.dropRateMax !== undefined}
                  {formatPercent(drop.dropRate)} – {formatPercent(
                    drop.dropRateMax,
                  )}
                {:else}
                  {formatPercent(drop.dropRate)}
                {/if}
              </span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}

  <!-- Crafting Station Section -->
  {#if entity.type === "alchemy_table" || entity.type === "crafting_station" || entity.type === "scribing_table"}
    <!-- Nothing extra needed - name and zone shown in header -->
  {/if}
</PopupCard>

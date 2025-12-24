<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import {
    toRomanNumeral,
    formatDuration,
    formatPercent,
    formatSpawnTimeWindow,
    getQualityTextColorClass,
  } from "$lib/utils/format";
  import { hasNpcRole, getNpcRoles } from "$lib/utils/tooltip";
  import {
    type AnyMapEntity,
    type MonsterMapEntity,
    type NpcMapEntity,
    type PortalMapEntity,
    type ChestMapEntity,
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
    type MonsterPopupDetails,
    type NpcPopupDetails,
    type ChestPopupDetails,
    type GatheringPopupDetails,
    type AltarPopupDetails,
  } from "$lib/queries/popup";

  interface Props {
    entity: AnyMapEntity;
    onClose: () => void;
    onSelectMonster?: (monsterId: string) => void;
  }

  let { entity, onClose, onSelectMonster }: Props = $props();

  // Lazy-loaded details state
  let monsterDetails = $state<MonsterPopupDetails | null>(null);
  let npcDetails = $state<NpcPopupDetails | null>(null);
  let chestDetails = $state<ChestPopupDetails | null>(null);
  let gatheringDetails = $state<GatheringPopupDetails | null>(null);
  let altarDetails = $state<AltarPopupDetails | null>(null);
  let isLoading = $state(false);

  // Load details when entity changes
  $effect(() => {
    const currentEntity = entity;
    monsterDetails = null;
    npcDetails = null;
    chestDetails = null;
    gatheringDetails = null;
    altarDetails = null;

    async function loadDetails() {
      isLoading = true;
      try {
        if (isMonster(currentEntity)) {
          // Only load drops for bosses, elites, and hunts (not regular creatures)
          const shouldLoadDrops =
            currentEntity.isBoss ||
            currentEntity.isElite ||
            currentEntity.isHunt;
          if (shouldLoadDrops) {
            // Hunts show all drops, bosses/elites show bestiary drops
            const showBestiaryOnly = !currentEntity.isHunt;
            monsterDetails = await loadMonsterPopupDetails(
              currentEntity.monsterId,
              showBestiaryOnly,
            );
          }
        } else if (currentEntity.type === "npc") {
          npcDetails = await loadNpcPopupDetails(currentEntity.id);
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

  function isMonster(e: AnyMapEntity): e is MonsterMapEntity {
    return ["monster", "boss", "elite", "hunt"].includes(e.type);
  }

  function isGathering(e: AnyMapEntity): e is GatheringMapEntity {
    return ["gathering_plant", "gathering_mineral", "gathering_spark"].includes(
      e.type,
    );
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
      default:
        return null;
    }
  }

  function getEntityTypeName(entity: AnyMapEntity): string {
    switch (entity.type) {
      case "monster":
        return "Creature";
      case "boss":
        return "Boss";
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
      case "altar":
        return "Altar";
      case "gathering_plant":
        return "Plant";
      case "gathering_mineral":
        return "Mineral";
      case "gathering_spark":
        return "Spark";
      case "alchemy_table":
      case "crafting_station":
        return "Crafting Station";
      default:
        return "Unknown";
    }
  }

  function getDisplayName(entity: AnyMapEntity): string {
    if (entity.type === "alchemy_table") {
      return "Alchemy Table";
    }
    if (entity.type === "crafting_station") {
      const crafting = entity as CraftingMapEntity;
      return crafting.isCookingOven ? "Cooking Oven" : "Forge";
    }
    return entity.name;
  }

  function handleSelectMonster(monsterId: string) {
    if (onSelectMonster) {
      onSelectMonster(monsterId);
    }
  }

  const url = $derived(getEntityUrl(entity));
</script>

<Card.Root
  class="absolute right-4 top-4 z-10 w-80 gap-0 bg-background/95 py-0 backdrop-blur supports-[backdrop-filter]:bg-background/80"
>
  <Card.Header class="!gap-0 border-b !py-2">
    <div class="flex items-start justify-between gap-2">
      <div>
        <Card.Title class="text-base">{getDisplayName(entity)}</Card.Title>
        <p class="text-sm text-muted-foreground">{getEntityTypeName(entity)}</p>
      </div>
      <Button variant="ghost" size="sm" onclick={onClose} class="h-6 w-6 p-0">
        <span class="sr-only">Close</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </Button>
    </div>
  </Card.Header>
  <Card.Content class="space-y-1.5 py-2 text-sm">
    <div class="flex justify-between">
      <span class="text-muted-foreground">Zone</span>
      <span>{entity.zoneName}</span>
    </div>

    <!-- Monster Section -->
    {#if isMonster(entity)}
      {@const monster = entity as MonsterMapEntity}
      <div class="flex justify-between">
        <span class="text-muted-foreground">Level</span>
        <span>{monster.level}</span>
      </div>

      {#if monster.spawnType !== "placeholder"}
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

      <!-- Special spawn info -->
      {#if monster.spawnType === "summon" && monster.summonKillMonsterName}
        {@const count = monster.summonKillCount ?? 1}
        <div class="rounded bg-purple-500/20 px-2 py-1 text-purple-300">
          <span class="text-purple-400">Blocked from respawning while</span>
          {#if count > 1}{count}x{/if}
          {#if onSelectMonster && monster.summonKillMonsterId}
            <button
              class="text-purple-200 underline hover:text-purple-100"
              onclick={() => handleSelectMonster(monster.summonKillMonsterId!)}
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
          {#if onSelectMonster && monster.sourceMonsterId}
            <button
              class="text-cyan-200 underline hover:text-cyan-100"
              onclick={() => handleSelectMonster(monster.sourceMonsterId!)}
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

      <!-- Drops (lazy-loaded) - only for boss/elite/hunt -->
      {#if isLoading && (monster.isBoss || monster.isElite || monster.isHunt)}
        <div class="text-muted-foreground">Loading drops...</div>
      {:else if monsterDetails && monsterDetails.drops.length > 0}
        <div class="border-t pt-2">
          <div class="mb-1 font-medium text-muted-foreground">
            {monster.isBoss || monster.isElite ? "Bestiary Drops" : "Drops"}
          </div>
          <div class="max-h-48 space-y-0.5 overflow-y-auto pr-2">
            {#each monsterDetails.drops as drop, i (i)}
              <div class="flex justify-between gap-2">
                <ItemLink
                  itemId={drop.itemId}
                  itemName={drop.itemName}
                  tooltipHtml={drop.tooltipHtml}
                  colorClass={getQualityTextColorClass(drop.quality)}
                  class="truncate"
                />
                <span class="shrink-0 text-muted-foreground"
                  >{formatPercent(drop.dropRate)}</span
                >
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/if}

    <!-- NPC Section -->
    {#if entity.type === "npc"}
      {@const npc = entity as NpcMapEntity}
      {@const roles = getNpcRoles(npc.roleBitmask)}

      <!-- Role badges -->
      {#if roles.length > 0}
        <div class="flex flex-wrap gap-1">
          {#each roles as role (role)}
            <span
              class="rounded bg-blue-500/20 px-1.5 py-0.5 text-xs text-blue-400"
              >{role}</span
            >
          {/each}
        </div>
      {/if}

      <!-- Teleport destination -->
      {#if npc.hasTeleport && npc.teleportDestName}
        <div class="flex justify-between">
          <span class="text-muted-foreground">Teleports to</span>
          <span class="text-cyan-400">{npc.teleportDestName}</span>
        </div>
      {/if}

      <!-- Renewal Sage dungeon -->
      {#if hasNpcRole(npc.roleBitmask, "isRenewalSage") && npc.renewalDungeonName}
        <div class="flex justify-between">
          <span class="text-muted-foreground">Resets</span>
          <span class="text-purple-400">{npc.renewalDungeonName}</span>
        </div>
      {/if}

      <!-- Quests (lazy-loaded) -->
      {#if isLoading && npc.questCount > 0}
        <div class="text-muted-foreground">Loading quests...</div>
      {:else if npcDetails && npcDetails.quests.length > 0}
        <div class="border-t pt-2">
          <div class="mb-1 font-medium text-muted-foreground">Quests</div>
          <div class="max-h-48 space-y-0.5 overflow-y-auto pr-2">
            {#each npcDetails.quests as quest, i (i)}
              <div class="flex justify-between gap-2">
                <a
                  href="/quests/{quest.id}"
                  class="truncate text-blue-600 hover:underline dark:text-blue-400"
                  >{quest.name}</a
                >
                <span class="shrink-0 text-muted-foreground"
                  >Lv {quest.levelRecommended}</span
                >
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Items sold (lazy-loaded) -->
      {#if isLoading && npc.itemsSoldCount > 0}
        <div class="text-muted-foreground">Loading items...</div>
      {:else if npcDetails && npcDetails.itemsSold.length > 0}
        <div class="border-t pt-2">
          <div class="mb-1 font-medium text-muted-foreground">
            Items for Sale
          </div>
          <div class="max-h-48 space-y-0.5 overflow-y-auto pr-2">
            {#each npcDetails.itemsSold as item, i (i)}
              <ItemLink
                itemId={item.itemId}
                itemName={item.itemName}
                tooltipHtml={item.tooltipHtml}
                colorClass={getQualityTextColorClass(item.quality)}
                class="truncate"
              />
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
            <span>{portal.destinationZoneName}</span>
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
            <div class="mb-1 font-medium text-muted-foreground">
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
                  <ItemLink
                    itemId={portal.requiredItemId}
                    itemName={portal.requiredItemName}
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
                  {#if onSelectMonster && portal.needMonsterDeadId}
                    <button
                      class="text-red-200 underline hover:text-red-100"
                      onclick={() =>
                        handleSelectMonster(portal.needMonsterDeadId!)}
                    >
                      {portal.needMonsterDeadName}
                    </button>
                  {:else if portal.needMonsterDeadId}
                    <a
                      href="/monsters/{portal.needMonsterDeadId}"
                      class="text-red-200 underline hover:text-red-100"
                      >{portal.needMonsterDeadName}</a
                    >
                  {:else}
                    <span class="text-red-200"
                      >{portal.needMonsterDeadName}</span
                    >
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
          <ItemLink
            itemId={chest.keyRequiredId}
            itemName={chest.keyRequiredName}
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
        <div class="text-muted-foreground">Loading drops...</div>
      {:else if chestDetails && chestDetails.drops.length > 0}
        <div class="border-t pt-2">
          <div class="mb-1 font-medium text-muted-foreground">Drops</div>
          <div class="max-h-48 space-y-0.5 overflow-y-auto pr-2">
            {#each chestDetails.drops as drop, i (i)}
              <div>
                <div class="flex justify-between gap-2">
                  <ItemLink
                    itemId={drop.itemId}
                    itemName={drop.itemName}
                    tooltipHtml={drop.tooltipHtml}
                    colorClass={getQualityTextColorClass(drop.quality)}
                    class="truncate"
                  />
                  <span class="shrink-0 text-muted-foreground"
                    >{formatPercent(drop.dropRate)}</span
                  >
                </div>
                {#if drop.isRandomItem && drop.randomItemOutcomes}
                  <div class="ml-2 truncate text-muted-foreground">
                    <span>Can be:</span>
                    {#each drop.randomItemOutcomes.slice(0, 3) as outcome, j (outcome.itemId)}
                      <a
                        href="/items/{outcome.itemId}"
                        class="text-blue-600 hover:underline dark:text-blue-400"
                        >{outcome.itemName}{j <
                        Math.min(drop.randomItemOutcomes.length, 3) - 1
                          ? ","
                          : ""}</a
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

    <!-- Altar Section -->
    {#if entity.type === "altar"}
      {@const altar = entity as AltarMapEntity}
      <div class="flex justify-between">
        <span class="text-muted-foreground">Type</span>
        <span class="capitalize">{altar.altarType}</span>
      </div>
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
          <ItemLink
            itemId={altar.activationItemId}
            itemName={altar.activationItemName}
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
              <a
                href="/monsters/{altar.finalBossIds[i]}"
                class="text-red-200 hover:underline">{bossName}</a
              >
            {:else}
              <span class="text-red-200">{bossName}</span>
            {/if}
            {#if i < altar.finalBossNames.length - 1},
            {/if}
          {/each}
        </div>
      {/if}

      <!-- Rewards by tier (lazy-loaded) -->
      {#if isLoading}
        <div class="text-muted-foreground">Loading rewards...</div>
      {:else if altarDetails && altarDetails.rewards.length > 0}
        <div class="border-t pt-2">
          <div class="mb-1 font-medium text-muted-foreground">Rewards</div>
          <div class="space-y-2">
            {#each altarDetails.rewards as reward (reward.tier)}
              <div>
                <ItemLink
                  itemId={reward.itemId}
                  itemName={reward.itemName}
                  tooltipHtml={reward.tooltipHtml}
                  colorClass={getQualityTextColorClass(reward.quality)}
                  class="truncate"
                />
                <div class="text-xs text-muted-foreground">
                  {#if reward.tier === "normal"}
                    Lv 30-34
                  {:else if reward.tier === "magic"}
                    Lv 35-44
                  {:else if reward.tier === "epic"}
                    Lv 45-50, Vet 0-99
                  {:else}
                    Lv 50, Vet 100+
                  {/if}
                  {#if reward.dropRate !== null}
                    · {formatPercent(reward.dropRate)}
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/if}

    <!-- Gathering Section -->
    {#if isGathering(entity)}
      {@const gathering = entity as GatheringMapEntity}
      <div class="flex justify-between">
        <span class="text-muted-foreground">Tier</span>
        <span>{toRomanNumeral(gathering.level)}</span>
      </div>
      {#if gathering.toolRequiredName && gathering.toolRequiredId}
        <div class="flex justify-between">
          <span class="text-muted-foreground">Tool</span>
          <ItemLink
            itemId={gathering.toolRequiredId}
            itemName={gathering.toolRequiredName}
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
        <span>{formatDuration(gathering.respawnTime)}</span>
      </div>

      <!-- Drops (lazy-loaded) -->
      {#if isLoading}
        <div class="text-muted-foreground">Loading drops...</div>
      {:else if gatheringDetails && gatheringDetails.drops.length > 0}
        <div class="border-t pt-2">
          <div class="mb-1 font-medium text-muted-foreground">Drops</div>
          <div class="max-h-48 space-y-0.5 overflow-y-auto pr-2">
            {#each gatheringDetails.drops as drop, i (i)}
              <div class="flex justify-between gap-2">
                <ItemLink
                  itemId={drop.itemId}
                  itemName={drop.itemName}
                  tooltipHtml={drop.tooltipHtml}
                  colorClass={getQualityTextColorClass(drop.quality)}
                  class="truncate"
                />
                <span class="shrink-0 text-muted-foreground">
                  {#if drop.dropRateMax !== undefined}
                    {formatPercent(drop.dropRate)}–{formatPercent(
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
    {#if entity.type === "alchemy_table" || entity.type === "crafting_station"}
      <!-- Nothing extra needed - name and zone shown in header -->
    {/if}
  </Card.Content>
  {#if url}
    <a
      href={url}
      class="block border-t py-2 text-center text-sm text-primary hover:underline"
    >
      View Details
    </a>
  {/if}
</Card.Root>

<script lang="ts">
  import PopupCard from "./PopupCard.svelte";
  import MapEntityLink from "./MapEntityLink.svelte";
  import MapItemLink from "./MapItemLink.svelte";
  import { buildEntityUrl } from "$lib/map/url-state";
  import {
    loadQuestPopupDetails,
    type QuestPopupDetails,
  } from "$lib/queries/popup";
  import { getQualityTextColorClass } from "$lib/utils/format";

  interface Props {
    questId: string;
    onClose: () => void;
    onFocusClick?: () => void;
    onSelectNpc: (npcId: string) => void;
    onSelectMonster: (monsterId: string) => void;
    onSelectItem: (itemId: string) => void;
    onHoverNpc?: (npcId: string | null) => void;
    onHoverMonster?: (monsterId: string | null) => void;
    mode?: "card" | "drawer";
  }

  let {
    questId,
    onClose,
    onFocusClick,
    onSelectNpc,
    onSelectMonster,
    onSelectItem,
    onHoverNpc,
    onHoverMonster,
    mode = "card",
  }: Props = $props();

  let details = $state<QuestPopupDetails | null>(null);
  let isLoading = $state(true);
  let error = $state<string | null>(null);

  $effect(() => {
    isLoading = true;
    error = null;
    details = null;

    loadQuestPopupDetails(questId)
      .then((d) => {
        details = d;
        if (!d) {
          error = "Quest not found";
        }
      })
      .catch((e) => {
        error = e instanceof Error ? e.message : "Failed to load quest";
      })
      .finally(() => {
        isLoading = false;
      });
  });

  // For adventurer quests, all NPCs are givers+turn-ins (show as list)
  // For regular quests, show Start/End pattern
  let isAdventurerQuest = $derived(
    details?.isAdventurerQuest &&
      details.npcs.length > 0 &&
      details.npcs.every((n) => n.isGiver && n.isTurnIn),
  );
  let adventurerNpcs = $derived(isAdventurerQuest ? (details?.npcs ?? []) : []);

  // Get start and end NPCs for regular quests
  let startNpc = $derived(
    !isAdventurerQuest ? (details?.npcs.find((n) => n.isGiver) ?? null) : null,
  );
  let endNpc = $derived(
    !isAdventurerQuest
      ? // Different turn-in NPC if available, otherwise use start NPC
        (details?.npcs.find((n) => n.isTurnIn && !n.isGiver) ?? startNpc)
      : null,
  );

  // Split reward items into regular and class-specific
  let regularRewards = $derived(
    details?.rewardItems.filter((r) => !r.classSpecific) ?? [],
  );
  let classRewards = $derived(
    details?.rewardItems.filter((r) => r.classSpecific) ?? [],
  );
</script>

{#if isLoading}
  <PopupCard title="Loading..." {onClose} {mode}>
    <div class="flex items-center justify-center py-4">
      <div
        class="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"
      ></div>
    </div>
  </PopupCard>
{:else if error}
  <PopupCard title="Error" {onClose} {mode}>
    <p class="text-destructive">{error}</p>
  </PopupCard>
{:else if details}
  {@const hasHighlightedEntities =
    details.npcs.length > 0 ||
    details.objectives.some((o) => o.type === "kill" && o.targetId)}
  <PopupCard
    title={details.name}
    subtitle="Quest · Lv {details.levelRecommended}"
    detailsUrl="/quests/{details.id}"
    {onClose}
    onFocusClick={hasHighlightedEntities ? onFocusClick : undefined}
    {mode}
  >
    <!-- NPCs -->
    {#if adventurerNpcs.length > 0}
      <!-- Adventurer quests: list of NPCs (all are giver+turn-in) -->
      <div>
        <div class="mb-1 text-xs font-medium text-muted-foreground">
          Start / End
        </div>
        <div class="flex flex-col items-start gap-0.5">
          {#each adventurerNpcs as npc (npc.npcId)}
            <MapEntityLink
              href={buildEntityUrl(npc.npcId, "npc")}
              onSelect={() => onSelectNpc(npc.npcId)}
              onHoverStart={() => onHoverNpc?.(npc.npcId)}
              onHoverEnd={() => onHoverNpc?.(null)}
              class="text-blue-400"
            >
              {npc.npcName}
            </MapEntityLink>
          {/each}
        </div>
      </div>
    {:else if startNpc}
      <!-- Regular quests: Start/End pattern -->
      <div class="space-y-0.5">
        <div class="flex justify-between">
          <span class="text-muted-foreground">Start</span>
          <MapEntityLink
            href={buildEntityUrl(startNpc.npcId, "npc")}
            onSelect={() => onSelectNpc(startNpc.npcId)}
            onHoverStart={() => onHoverNpc?.(startNpc.npcId)}
            onHoverEnd={() => onHoverNpc?.(null)}
            class="text-blue-400"
          >
            {startNpc.npcName}
          </MapEntityLink>
        </div>
        {#if endNpc}
          <div class="flex justify-between">
            <span class="text-muted-foreground">End</span>
            <MapEntityLink
              href={buildEntityUrl(endNpc.npcId, "npc")}
              onSelect={() => onSelectNpc(endNpc.npcId)}
              onHoverStart={() => onHoverNpc?.(endNpc.npcId)}
              onHoverEnd={() => onHoverNpc?.(null)}
              class="text-blue-400"
            >
              {endNpc.npcName}
            </MapEntityLink>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Objectives -->
    {#if details.objectives.length > 0}
      <div class="border-t pt-2">
        <div class="mb-1 text-xs font-medium text-muted-foreground">
          Objectives
        </div>
        <div class="space-y-0.5">
          {#each details.objectives as obj, i (i)}
            <div class="flex items-center gap-1">
              {#if obj.type === "kill"}
                <span class="text-muted-foreground">Kill</span>
                <span>{obj.amount}×</span>
                {#if obj.targetId}
                  <MapEntityLink
                    href={buildEntityUrl(obj.targetId, "monster")}
                    onSelect={() => onSelectMonster(obj.targetId!)}
                    onHoverStart={() => onHoverMonster?.(obj.targetId!)}
                    onHoverEnd={() => onHoverMonster?.(null)}
                    class="truncate text-red-400"
                  >
                    {obj.targetName}
                  </MapEntityLink>
                {:else}
                  <span class="truncate">{obj.targetName}</span>
                {/if}
              {:else if obj.type === "gather" && obj.targetId}
                <span class="text-muted-foreground">Gather</span>
                <span>{obj.amount}×</span>
                <MapItemLink
                  itemId={obj.targetId}
                  itemName={obj.targetName}
                  tooltipHtml={obj.tooltipHtml ?? null}
                  colorClass={getQualityTextColorClass(obj.quality ?? 0)}
                  class="truncate"
                  onSelect={onSelectItem}
                />
              {:else if obj.type === "have" && obj.targetId}
                <span class="text-muted-foreground">Have</span>
                <span>{obj.amount}×</span>
                <MapItemLink
                  itemId={obj.targetId}
                  itemName={obj.targetName}
                  tooltipHtml={obj.tooltipHtml ?? null}
                  colorClass={getQualityTextColorClass(obj.quality ?? 0)}
                  class="truncate"
                  onSelect={onSelectItem}
                />
              {:else if obj.type === "deliver" && obj.targetId}
                <span class="text-muted-foreground">Deliver</span>
                <span>{obj.amount}×</span>
                <MapItemLink
                  itemId={obj.targetId}
                  itemName={obj.targetName}
                  tooltipHtml={obj.tooltipHtml ?? null}
                  colorClass={getQualityTextColorClass(obj.quality ?? 0)}
                  class="truncate"
                  onSelect={onSelectItem}
                />
              {:else if obj.type === "equip" && obj.targetId}
                <span class="text-muted-foreground">Equip</span>
                <MapItemLink
                  itemId={obj.targetId}
                  itemName={obj.targetName}
                  tooltipHtml={obj.tooltipHtml ?? null}
                  colorClass={getQualityTextColorClass(obj.quality ?? 0)}
                  class="truncate"
                  onSelect={onSelectItem}
                />
              {:else if obj.type === "find"}
                <span class="text-muted-foreground">Find</span>
                {#if obj.targetId}
                  <MapEntityLink
                    href={buildEntityUrl(obj.targetId, "npc")}
                    onSelect={() => onSelectNpc(obj.targetId!)}
                    onHoverStart={() => onHoverNpc?.(obj.targetId!)}
                    onHoverEnd={() => onHoverNpc?.(null)}
                    class="truncate text-blue-400"
                  >
                    {obj.targetName}
                  </MapEntityLink>
                {:else}
                  <span class="truncate">{obj.targetName}</span>
                {/if}
              {:else if obj.type === "discover"}
                <span class="text-muted-foreground">Discover</span>
                <span class="truncate">{obj.targetName}</span>
              {:else}
                <span class="text-muted-foreground">{obj.type}</span>
                {#if obj.amount > 1}<span>{obj.amount}×</span>{/if}
                <span class="truncate">{obj.targetName}</span>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Rewards -->
    {#if details.gold > 0 || details.exp > 0 || regularRewards.length > 0}
      <div class="border-t pt-2">
        <div class="mb-1 text-xs font-medium text-muted-foreground">
          Rewards
        </div>
        <div class="space-y-0.5">
          {#if details.exp > 0}
            <div class="flex justify-between">
              <span class="text-muted-foreground">XP</span>
              <span>{details.exp.toLocaleString()}</span>
            </div>
          {/if}
          {#if details.gold > 0}
            <div class="flex justify-between">
              <span class="text-muted-foreground">Gold</span>
              <span class="text-yellow-500"
                >{details.gold.toLocaleString()}</span
              >
            </div>
          {/if}
          {#each regularRewards as item, i (i)}
            <MapItemLink
              itemId={item.itemId}
              itemName={item.itemName}
              tooltipHtml={item.tooltipHtml}
              colorClass={getQualityTextColorClass(item.quality)}
              class="truncate"
              onSelect={onSelectItem}
            />
          {/each}
        </div>
      </div>
    {/if}

    <!-- Class-specific rewards -->
    {#if classRewards.length > 0}
      <div class="border-t pt-2">
        <div class="mb-1 text-xs font-medium text-muted-foreground">
          Class Rewards
        </div>
        <div class="space-y-0.5">
          {#each classRewards as item, i (i)}
            <div class="flex items-center justify-between gap-2">
              <MapItemLink
                itemId={item.itemId}
                itemName={item.itemName}
                tooltipHtml={item.tooltipHtml}
                colorClass={getQualityTextColorClass(item.quality)}
                class="truncate"
                onSelect={onSelectItem}
              />
              <span class="shrink-0 text-muted-foreground"
                >{item.classSpecific}</span
              >
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </PopupCard>
{/if}

<script lang="ts">
  import PopupCard from "./PopupCard.svelte";
  import MapEntityButton from "./MapEntityButton.svelte";
  import ItemButton from "./ItemButton.svelte";
  import {
    loadQuestPopupDetails,
    type QuestPopupDetails,
  } from "$lib/queries/popup";
  import { getQualityTextColorClass } from "$lib/utils/format";

  interface Props {
    questId: string;
    onClose: () => void;
    onSelectNpc: (npcId: string) => void;
    onSelectItem: (itemId: string) => void;
    onHoverNpc?: (npcId: string | null) => void;
  }

  let { questId, onClose, onSelectNpc, onSelectItem, onHoverNpc }: Props =
    $props();

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

  // Split NPCs into givers and turn-ins
  let givers = $derived(details?.npcs.filter((n) => n.isGiver) ?? []);
  let turnIns = $derived(
    details?.npcs.filter((n) => n.isTurnIn && !n.isGiver) ?? [],
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
  <PopupCard title="Loading..." {onClose}>
    <div class="flex items-center justify-center py-4">
      <div
        class="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"
      ></div>
    </div>
  </PopupCard>
{:else if error}
  <PopupCard title="Error" {onClose}>
    <p class="text-destructive">{error}</p>
  </PopupCard>
{:else if details}
  <PopupCard
    title={details.name}
    subtitle="Quest · Lv.{details.levelRecommended}"
    detailsUrl="/quests/{details.id}"
    {onClose}
  >
    <!-- Objectives -->
    {#if details.objectives.length > 0}
      <div>
        <div class="mb-1 text-xs font-medium text-muted-foreground">
          Objectives
        </div>
        <div class="space-y-0.5">
          {#each details.objectives as obj, i (i)}
            <div class="flex items-center gap-1">
              {#if obj.type === "kill"}
                <span class="text-muted-foreground">Kill</span>
                <span>{obj.amount}×</span>
                <span class="truncate">{obj.targetName}</span>
              {:else if obj.type === "gather" && obj.targetId}
                <span class="text-muted-foreground">Gather</span>
                <span>{obj.amount}×</span>
                <ItemButton
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
                <ItemButton
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
                <ItemButton
                  itemId={obj.targetId}
                  itemName={obj.targetName}
                  tooltipHtml={obj.tooltipHtml ?? null}
                  colorClass={getQualityTextColorClass(obj.quality ?? 0)}
                  class="truncate"
                  onSelect={onSelectItem}
                />
              {:else if obj.type === "equip" && obj.targetId}
                <span class="text-muted-foreground">Equip</span>
                <ItemButton
                  itemId={obj.targetId}
                  itemName={obj.targetName}
                  tooltipHtml={obj.tooltipHtml ?? null}
                  colorClass={getQualityTextColorClass(obj.quality ?? 0)}
                  class="truncate"
                  onSelect={onSelectItem}
                />
              {:else if obj.type === "find"}
                <span class="text-muted-foreground">Find</span>
                <span class="truncate">{obj.targetName}</span>
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
          {#each regularRewards as item (item.itemId)}
            <ItemButton
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
          {#each classRewards as item (item.itemId)}
            <div class="flex items-center justify-between gap-2">
              <ItemButton
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

    <!-- NPCs -->
    {#if givers.length > 0}
      <div class="border-t pt-2">
        <div class="mb-1 text-xs font-medium text-muted-foreground">
          Given by
        </div>
        <div class="space-y-0.5">
          {#each givers as npc (npc.npcId)}
            <div class="flex items-center justify-between gap-2">
              <MapEntityButton
                onSelect={() => onSelectNpc(npc.npcId)}
                onHoverStart={() => onHoverNpc?.(npc.npcId)}
                onHoverEnd={() => onHoverNpc?.(null)}
                class="text-blue-400 dark:text-blue-400"
              >
                <span class="truncate">{npc.npcName}</span>
              </MapEntityButton>
              {#if npc.zoneName}
                <span class="shrink-0 text-xs text-muted-foreground"
                  >{npc.zoneName}</span
                >
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if turnIns.length > 0}
      <div class="border-t pt-2">
        <div class="mb-1 text-xs font-medium text-muted-foreground">
          Turn in to
        </div>
        <div class="space-y-0.5">
          {#each turnIns as npc (npc.npcId)}
            <div class="flex items-center justify-between gap-2">
              <MapEntityButton
                onSelect={() => onSelectNpc(npc.npcId)}
                onHoverStart={() => onHoverNpc?.(npc.npcId)}
                onHoverEnd={() => onHoverNpc?.(null)}
                class="text-blue-400 dark:text-blue-400"
              >
                <span class="truncate">{npc.npcName}</span>
              </MapEntityButton>
              {#if npc.zoneName}
                <span class="shrink-0 text-xs text-muted-foreground"
                  >{npc.zoneName}</span
                >
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </PopupCard>
{/if}

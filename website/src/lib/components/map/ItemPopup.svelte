<script lang="ts">
  import PopupCard from "./PopupCard.svelte";
  import MapEntityLink from "./MapEntityLink.svelte";
  import MapItemLink from "./MapItemLink.svelte";
  import { buildEntityUrl } from "$lib/map/url-state";
  import MonsterTypeIcon from "$lib/components/MonsterTypeIcon.svelte";
  import {
    loadItemPopupDetails,
    type ItemPopupDetails,
  } from "$lib/queries/popup";
  import { getQualityTextColorClass, formatPercent } from "$lib/utils/format";

  interface Props {
    itemId: string;
    onClose: () => void;
    onFocusClick?: () => void;
    onSelectMonster: (monsterId: string) => void;
    onHoverMonster?: (monsterId: string | null) => void;
    onSelectAltar: (altarId: string) => void;
    onHoverAltar?: (altarId: string | null) => void;
    onSelectNpc: (npcId: string) => void;
    onHoverNpc?: (npcId: string | null) => void;
    onSelectChest: (chestId: string) => void;
    onHoverChest?: (chestId: string | null) => void;
    onSelectGathering: (resourceId: string) => void;
    onHoverGathering?: (resourceId: string | null) => void;
    onSelectQuest: (questId: string) => void;
    onSelectItem: (itemId: string) => void;
    mode?: "card" | "drawer";
  }

  let {
    itemId,
    onClose,
    onFocusClick,
    onSelectMonster,
    onHoverMonster,
    onSelectAltar,
    onHoverAltar,
    onSelectNpc,
    onHoverNpc,
    onSelectChest,
    onHoverChest,
    onSelectGathering,
    onHoverGathering,
    onSelectQuest,
    onSelectItem,
    mode = "card",
  }: Props = $props();

  // Check if any focusable sources exist
  function hasFocusableSources(details: ItemPopupDetails): boolean {
    return (
      details.droppers.length > 0 ||
      details.altarSources.length > 0 ||
      details.vendors.length > 0 ||
      details.gatheringSources.length > 0 ||
      details.chestSources.length > 0
    );
  }

  let details = $state<ItemPopupDetails | null>(null);
  let isLoading = $state(true);
  let error = $state<string | null>(null);

  $effect(() => {
    isLoading = true;
    error = null;
    details = null;

    loadItemPopupDetails(itemId)
      .then((d) => {
        details = d;
        if (!d) {
          error = "Item not found";
        }
      })
      .catch((e) => {
        error = e instanceof Error ? e.message : "Failed to load item";
      })
      .finally(() => {
        isLoading = false;
      });
  });
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
  <PopupCard
    title={details.name}
    subtitle="Item"
    titleClass={getQualityTextColorClass(details.quality)}
    detailsUrl="/items/{details.id}"
    {onClose}
    onFocusClick={hasFocusableSources(details) ? onFocusClick : undefined}
    {mode}
  >
    <!-- Dropped by -->
    {#if details.droppers.length > 0}
      <div>
        <div class="mb-1 text-xs font-medium text-muted-foreground">
          Dropped by
        </div>
        <div class="max-h-32 space-y-0.5 overflow-y-auto pr-2">
          {#each details.droppers as dropper (dropper.monsterId)}
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-1 min-w-0">
                <MonsterTypeIcon
                  isBoss={dropper.isBoss}
                  isElite={dropper.isElite}
                  class="h-3.5 w-3.5 shrink-0"
                />
                <MapEntityLink
                  href={buildEntityUrl(dropper.monsterId, "monster")}
                  onSelect={() => onSelectMonster(dropper.monsterId)}
                  onHoverStart={() => onHoverMonster?.(dropper.monsterId)}
                  onHoverEnd={() => onHoverMonster?.(null)}
                  class={dropper.isBoss
                    ? "text-cyan-400"
                    : dropper.isElite
                      ? "text-purple-400"
                      : "text-red-400"}
                >
                  <span class="truncate">{dropper.monsterName}</span>
                </MapEntityLink>
              </div>
              <div
                class="flex items-center gap-2 shrink-0 text-xs text-muted-foreground"
              >
                <span>Lv.{dropper.level}</span>
                <span>{formatPercent(dropper.dropRate)}</span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Sold by -->
    {#if details.vendors.length > 0}
      <div class={details.droppers.length > 0 ? "border-t pt-2" : ""}>
        <div class="mb-1 text-xs font-medium text-muted-foreground">
          Sold by
        </div>
        <div class="max-h-32 space-y-0.5 overflow-y-auto pr-2">
          {#each details.vendors as vendor (vendor.npcId)}
            <div class="flex items-center justify-between gap-2">
              <MapEntityLink
                href={buildEntityUrl(vendor.npcId, "npc")}
                onSelect={() => onSelectNpc(vendor.npcId)}
                onHoverStart={() => onHoverNpc?.(vendor.npcId)}
                onHoverEnd={() => onHoverNpc?.(null)}
              >
                <span class="truncate">{vendor.npcName}</span>
              </MapEntityLink>
              <span class="shrink-0 text-xs text-muted-foreground">
                {#if vendor.currencyItemId}
                  {vendor.price.toLocaleString()}x {vendor.currencyItemName}
                {:else}
                  {vendor.price.toLocaleString()}g
                {/if}
              </span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Gathered from -->
    {#if details.gatheringSources.length > 0}
      <div
        class={details.droppers.length > 0 || details.vendors.length > 0
          ? "border-t pt-2"
          : ""}
      >
        <div class="mb-1 text-xs font-medium text-muted-foreground">
          Gathered from
        </div>
        <div class="max-h-32 space-y-0.5 overflow-y-auto pr-2">
          {#each details.gatheringSources as source (source.resourceId)}
            <div class="flex items-center justify-between gap-2">
              <MapEntityLink
                href={buildEntityUrl(
                  source.resourceId,
                  source.resourceType === "chest" ? "chest" : "gathering",
                )}
                onSelect={() =>
                  source.resourceType === "chest"
                    ? onSelectChest(source.resourceId)
                    : onSelectGathering(source.resourceId)}
                onHoverStart={() =>
                  source.resourceType === "chest"
                    ? onHoverChest?.(source.resourceId)
                    : onHoverGathering?.(source.resourceId)}
                onHoverEnd={() =>
                  source.resourceType === "chest"
                    ? onHoverChest?.(null)
                    : onHoverGathering?.(null)}
              >
                <span class="truncate">
                  {source.resourceType === "chest"
                    ? "Chest"
                    : source.resourceName}
                </span>
              </MapEntityLink>
              <span class="shrink-0 text-xs text-muted-foreground">
                {formatPercent(source.rate)}
              </span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Altar Rewards -->
    {#if details.altarSources.length > 0}
      <div
        class={details.droppers.length > 0 ||
        details.vendors.length > 0 ||
        details.gatheringSources.length > 0
          ? "border-t pt-2"
          : ""}
      >
        <div class="mb-1 text-xs font-medium text-muted-foreground">
          Altar Rewards
        </div>
        <div class="max-h-32 space-y-1 overflow-y-auto pr-2">
          {#each details.altarSources as altar (altar.altarId)}
            <div>
              <MapEntityLink
                href={buildEntityUrl(altar.altarId, "altar")}
                onSelect={() => onSelectAltar(altar.altarId)}
                onHoverStart={() => onHoverAltar?.(altar.altarId)}
                onHoverEnd={() => onHoverAltar?.(null)}
                class="text-orange-400"
              >
                <span class="truncate">{altar.altarName}</span>
              </MapEntityLink>
              <div class="text-xs text-muted-foreground">
                {#if altar.tier === "normal"}
                  Lv 30-34
                {:else if altar.tier === "magic"}
                  Lv 35-44
                {:else if altar.tier === "epic"}
                  Lv 45-50, Vet 0-99
                {:else}
                  Lv 50, Vet 100+
                {/if}
                {#if altar.dropRate > 0}
                  · {formatPercent(altar.dropRate)}
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Found in Chests -->
    {#if details.chestSources.length > 0}
      <div
        class={details.droppers.length > 0 ||
        details.vendors.length > 0 ||
        details.gatheringSources.length > 0 ||
        details.altarSources.length > 0
          ? "border-t pt-2"
          : ""}
      >
        <div class="mb-1 text-xs font-medium text-muted-foreground">
          Found in Chests
        </div>
        <div class="max-h-32 space-y-0.5 overflow-y-auto pr-2">
          {#each details.chestSources as chest (chest.chestId)}
            <div class="flex items-center justify-between gap-2">
              <MapItemLink
                itemId={chest.chestId}
                itemName={chest.chestName}
                onSelect={onSelectItem}
              />
              <span class="shrink-0 text-xs text-muted-foreground">
                {formatPercent(chest.rate)}
              </span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Quest Rewards -->
    {#if details.questRewards.length > 0}
      <div
        class={details.droppers.length > 0 ||
        details.vendors.length > 0 ||
        details.gatheringSources.length > 0 ||
        details.altarSources.length > 0 ||
        details.chestSources.length > 0
          ? "border-t pt-2"
          : ""}
      >
        <div class="mb-1 text-xs font-medium text-muted-foreground">
          Quest Rewards
        </div>
        <div class="max-h-32 space-y-0.5 overflow-y-auto pr-2">
          {#each details.questRewards as quest (quest.questId)}
            <div class="flex items-center justify-between gap-2">
              <MapEntityLink
                href={buildEntityUrl(quest.questId, "quest")}
                onSelect={() => onSelectQuest(quest.questId)}
              >
                <span class="truncate">{quest.questName}</span>
              </MapEntityLink>
              <span class="shrink-0 text-xs text-muted-foreground">
                Lv.{quest.levelRecommended}
              </span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Crafted from -->
    {#if details.craftingSources.length > 0}
      <div
        class={details.droppers.length > 0 ||
        details.vendors.length > 0 ||
        details.gatheringSources.length > 0 ||
        details.altarSources.length > 0 ||
        details.chestSources.length > 0 ||
        details.questRewards.length > 0
          ? "border-t pt-2"
          : ""}
      >
        <div class="mb-1 text-xs font-medium text-muted-foreground">
          Crafted from
        </div>
        <div class="max-h-32 space-y-0.5 overflow-y-auto pr-2">
          {#each details.craftingSources as recipe (recipe.recipeId)}
            {#each recipe.materials as material (material.itemId)}
              <div class="flex items-center gap-1">
                <span class="text-muted-foreground">{material.amount}x</span>
                <MapItemLink
                  itemId={material.itemId}
                  itemName={material.itemName}
                  onSelect={onSelectItem}
                />
              </div>
            {/each}
          {/each}
        </div>
      </div>
    {/if}

    <!-- Merged from -->
    {#if details.mergeSources.length > 0}
      <div
        class={details.droppers.length > 0 ||
        details.vendors.length > 0 ||
        details.gatheringSources.length > 0 ||
        details.altarSources.length > 0 ||
        details.chestSources.length > 0 ||
        details.questRewards.length > 0 ||
        details.craftingSources.length > 0
          ? "border-t pt-2"
          : ""}
      >
        <div class="mb-1 text-xs font-medium text-muted-foreground">
          Merged from
        </div>
        <div class="max-h-32 space-y-0.5 overflow-y-auto pr-2">
          {#each details.mergeSources as source (source.itemId)}
            <div>
              <MapItemLink
                itemId={source.itemId}
                itemName={source.itemName}
                onSelect={onSelectItem}
              />
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Tooltip -->
    {#if details.tooltipHtml}
      <div
        class={details.droppers.length > 0 ||
        details.vendors.length > 0 ||
        details.gatheringSources.length > 0 ||
        details.altarSources.length > 0 ||
        details.chestSources.length > 0 ||
        details.questRewards.length > 0 ||
        details.craftingSources.length > 0 ||
        details.mergeSources.length > 0
          ? "border-t pt-2"
          : ""}
      >
        <div class="text-sm whitespace-pre-wrap tooltip-content">
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html details.tooltipHtml}
        </div>
      </div>
    {/if}
  </PopupCard>
{/if}

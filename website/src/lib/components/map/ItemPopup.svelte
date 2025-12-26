<script lang="ts">
  import PopupCard from "./PopupCard.svelte";
  import MapEntityButton from "./MapEntityButton.svelte";
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
  }

  let {
    itemId,
    onClose,
    onFocusClick,
    onSelectMonster,
    onHoverMonster,
  }: Props = $props();

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
    subtitle="Item"
    titleClass={getQualityTextColorClass(details.quality)}
    detailsUrl="/items/{details.id}"
    {onClose}
    onFocusClick={details.droppers.length > 0 ? onFocusClick : undefined}
  >
    {#if details.droppers.length > 0}
      <div>
        <div class="mb-1 text-xs font-medium text-muted-foreground">
          Dropped by
        </div>
        <div class="max-h-48 space-y-0.5 overflow-y-auto pr-2">
          {#each details.droppers as dropper (dropper.monsterId)}
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-1 min-w-0">
                <MonsterTypeIcon
                  isBoss={dropper.isBoss}
                  isElite={dropper.isElite}
                  class="h-3.5 w-3.5 shrink-0"
                />
                <MapEntityButton
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
                </MapEntityButton>
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

    {#if details.tooltipHtml}
      <div class={details.droppers.length > 0 ? "border-t pt-2" : ""}>
        <div class="text-sm whitespace-pre-wrap tooltip-content">
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html details.tooltipHtml}
        </div>
      </div>
    {/if}
  </PopupCard>
{/if}

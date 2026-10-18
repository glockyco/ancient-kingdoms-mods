<script lang="ts">
  import { onDestroy } from "svelte";
  import * as Popover from "$lib/components/ui/popover";
  import { formatPercent } from "$lib/utils/format";
  import type { FatecharmItem } from "$lib/utils/fatecharm";

  let {
    chance,
    fatecharmChance = null,
    fatecharm = null,
    onSelectItem,
  }: {
    chance: number;
    fatecharmChance?: number | null;
    /** The Fatecharm item this chance consumes. */
    fatecharm?: FatecharmItem | null;
    /** In-map selection for the Fatecharm link; plain navigation otherwise. */
    onSelectItem?: (itemId: string) => void;
  } = $props();

  function selectFatecharm(event: MouseEvent) {
    if (!onSelectItem || !fatecharm) return;
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0)
      return;
    event.preventDefault();
    open = false;
    onSelectItem(fatecharm.id);
  }

  let open = $state(false);
  let closing: ReturnType<typeof setTimeout> | undefined;
  const regular = $derived(
    formatPercent(chance, { decimals: 1, trailingZeros: true }),
  );
  const boosted = $derived(
    fatecharmChance == null
      ? null
      : formatPercent(fatecharmChance, { decimals: 1, trailingZeros: true }),
  );

  function hover(event: PointerEvent) {
    if (event.pointerType !== "mouse") return;
    clearTimeout(closing);
    open = true;
  }

  function leave(event: PointerEvent) {
    if (event.pointerType !== "mouse") return;
    closing = setTimeout(() => (open = false), 150);
  }

  onDestroy(() => clearTimeout(closing));
</script>

{#if fatecharmChance != null && fatecharmChance !== chance}
  <Popover.Root bind:open>
    <Popover.Trigger
      class="cursor-help whitespace-nowrap underline decoration-muted-foreground decoration-dotted underline-offset-4"
      aria-label="{regular}. Show Fatecharm chance"
      onpointerenter={hover}
      onpointerleave={leave}>{regular}</Popover.Trigger
    >
    <Popover.Content
      class="w-72 p-3 text-sm leading-normal"
      aria-label="Drop chance with Fatecharm"
      onpointerenter={hover}
      onpointerleave={leave}
      onOpenAutoFocus={(event) => event.preventDefault()}
    >
      <p>{regular} without Fatecharm.</p>
      <p class="mt-2">
        {boosted} with
        {#if fatecharm}<a
            href="/items/{fatecharm.id}"
            class="text-blue-600 hover:underline dark:text-blue-400"
            onclick={selectFatecharm}>{fatecharm.name}</a
          >{:else}a matching dungeon Fatecharm{/if}. The Fatecharm is consumed
        when used.
      </p>
    </Popover.Content>
  </Popover.Root>
{:else}
  <span class="whitespace-nowrap">{regular}</span>
{/if}

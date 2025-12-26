<script lang="ts" module>
  // Shared state to ensure only one tooltip is open at a time
  let currentOpenId = $state<string | null>(null);
</script>

<script lang="ts">
  import { browser } from "$app/environment";
  import { MediaQuery } from "svelte/reactivity";
  import * as HoverCard from "$lib/components/ui/hover-card";

  interface Props {
    itemId: string;
    itemName: string;
    tooltipHtml?: string | null;
    class?: string;
    colorClass?: string;
    onSelect: (itemId: string) => void;
  }

  let {
    itemId,
    itemName,
    tooltipHtml = null,
    class: className,
    colorClass,
    onSelect,
  }: Props = $props();

  const instanceId = crypto.randomUUID();

  const isSmallScreen = new MediaQuery("(max-width: 640px)");
  const showTooltip = $derived(
    tooltipHtml && browser && !isSmallScreen.current,
  );

  const effectiveColorClass = $derived(
    colorClass ?? "text-blue-600 dark:text-blue-400",
  );

  const isOpen = $derived(currentOpenId === instanceId);

  function handleOpenChange(open: boolean) {
    if (open) {
      currentOpenId = instanceId;
    } else if (currentOpenId === instanceId) {
      currentOpenId = null;
    }
  }

  function handleClick() {
    onSelect(itemId);
  }
</script>

<span class="min-w-0">
  {#if showTooltip}
    <HoverCard.Root
      openDelay={200}
      closeDelay={0}
      open={isOpen}
      onOpenChange={handleOpenChange}
    >
      <HoverCard.Trigger>
        <button
          type="button"
          onclick={handleClick}
          class="inline-block max-w-full cursor-pointer text-left underline decoration-dotted hover:decoration-solid {effectiveColorClass} {className}"
        >
          {itemName}
        </button>
      </HoverCard.Trigger>
      <HoverCard.Content
        class="w-80 border-0 p-0 overflow-hidden shadow-lg"
        side="right"
        collisionPadding={16}
      >
        <div class="text-sm whitespace-pre-wrap tooltip-content">
          <!-- eslint-disable-next-line svelte/no-at-html-tags -->
          {@html tooltipHtml}
        </div>
      </HoverCard.Content>
    </HoverCard.Root>
  {:else}
    <button
      type="button"
      onclick={handleClick}
      class="inline-block max-w-full cursor-pointer text-left underline hover:opacity-80 {effectiveColorClass} {className}"
    >
      {itemName}
    </button>
  {/if}
</span>

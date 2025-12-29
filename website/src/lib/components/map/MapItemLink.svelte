<script lang="ts" module>
  // Shared state to ensure only one tooltip is open at a time
  let currentOpenId = $state<string | null>(null);
</script>

<script lang="ts">
  import { browser } from "$app/environment";
  import { MediaQuery } from "svelte/reactivity";
  import * as HoverCard from "$lib/components/ui/hover-card";
  import { buildEntityUrl } from "$lib/map/url-state";

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

  function handleClick(e: MouseEvent) {
    // Allow modifier-clicks to work naturally (open in new tab)
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) {
      return;
    }
    // Normal click: prevent navigation and use callback
    e.preventDefault();
    onSelect(itemId);
  }

  const href = $derived(buildEntityUrl(itemId, "item"));
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
        <a
          {href}
          onclick={handleClick}
          class="inline-block max-w-full cursor-pointer text-left underline decoration-dotted hover:decoration-solid {effectiveColorClass} {className}"
        >
          {itemName}
        </a>
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
    <a
      {href}
      onclick={handleClick}
      class="inline-block max-w-full cursor-pointer text-left underline hover:opacity-80 {effectiveColorClass} {className}"
    >
      {itemName}
    </a>
  {/if}
</span>

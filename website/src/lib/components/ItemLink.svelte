<script lang="ts" module>
  // Shared state to ensure only one tooltip is open at a time
  let currentOpenId = $state<string | null>(null);
</script>

<script lang="ts">
  import { browser } from "$app/environment";
  import { MediaQuery } from "svelte/reactivity";
  import * as HoverCard from "$lib/components/ui/hover-card";
  import { cn } from "$lib/utils.js";

  interface Props {
    itemId: string;
    itemName: string;
    tooltipHtml?: string | null;
    class?: string;
    colorClass?: string;
    maxWidth?: string;
  }

  let {
    itemId,
    itemName,
    tooltipHtml = null,
    class: className,
    colorClass,
    maxWidth,
  }: Props = $props();

  const instanceId = crypto.randomUUID();

  const isSmallScreen = new MediaQuery("(max-width: 640px)");
  const showTooltip = $derived(
    tooltipHtml && browser && !isSmallScreen.current,
  );

  const effectiveColorClass = $derived(
    colorClass ?? "text-blue-600 dark:text-blue-400",
  );

  const displayMode = $derived(maxWidth ? "block" : "inline-block");

  const isOpen = $derived(currentOpenId === instanceId);

  function handleOpenChange(open: boolean) {
    if (open) {
      currentOpenId = instanceId;
    } else if (currentOpenId === instanceId) {
      currentOpenId = null;
    }
  }
</script>

<span
  class={cn(
    "min-w-0",
    maxWidth && "inline-block overflow-hidden whitespace-nowrap",
  )}
  style={maxWidth ? `max-width: ${maxWidth}` : undefined}
>
  {#if showTooltip}
    <HoverCard.Root
      openDelay={200}
      closeDelay={0}
      open={isOpen}
      onOpenChange={handleOpenChange}
    >
      <HoverCard.Trigger>
        {#snippet child({ props })}
          <a
            {...props}
            href="/items/{itemId}"
            class={cn(
              displayMode,
              "max-w-full underline decoration-dotted hover:decoration-solid",
              effectiveColorClass,
              className,
            )}
          >
            <span class={cn(maxWidth && "block truncate")}>{itemName}</span>
          </a>
        {/snippet}
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
      href="/items/{itemId}"
      class={cn(
        displayMode,
        "max-w-full hover:underline",
        effectiveColorClass,
        className,
      )}
    >
      <span class={cn(maxWidth && "block truncate")}>{itemName}</span>
    </a>
  {/if}
</span>

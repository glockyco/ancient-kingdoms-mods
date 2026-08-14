<script lang="ts" module>
  // Shared state to ensure only one tooltip is open at a time
  let currentOpenId = $state<string | null>(null);
</script>

<script lang="ts">
  import type { Component } from "svelte";
  import { browser } from "$app/environment";
  import { MediaQuery } from "svelte/reactivity";
  import * as HoverCard from "$lib/components/ui/hover-card";
  import { cn } from "$lib/utils.js";
  import EntityLink from "$lib/components/EntityLink.svelte";
  import ItemTooltip from "$lib/components/ItemTooltip.svelte";

  interface Props {
    itemId: string;
    itemName: string;
    tooltipHtml?: string | null;
    class?: string;
    colorClass?: string;
    maxWidth?: string;
    imageAvailable?: string | boolean | null;
    imageWidth?: number | null;
    imageHeight?: number | null;
    /** Text is baseline-safe; reference renders an atomic icon-and-label unit. */
    variant?: "text" | "reference";
    imageKind?: string;
    fallback?: Component<{ class?: string }>;
  }

  let {
    itemId,
    itemName,
    tooltipHtml = null,
    class: className,
    colorClass,
    maxWidth,
    imageAvailable,
    imageWidth,
    imageHeight,
    variant = "text",
    imageKind = "icon",
    fallback,
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
          <EntityLink
            {...props}
            href="/items/{itemId}"
            name={itemName}
            domain="item"
            entityId={itemId}
            {imageKind}
            {imageAvailable}
            {imageWidth}
            {imageHeight}
            {fallback}
            {variant}
            size={28}
            colorClass={effectiveColorClass}
            class={cn(
              variant === "reference" ? "inline-flex" : displayMode,
              "max-w-full underline decoration-dotted hover:decoration-solid",
              className,
            )}
            nameClass={cn(maxWidth && "block truncate")}
          />
        {/snippet}
      </HoverCard.Trigger><HoverCard.Content
        class="w-80 border-0 p-0 overflow-hidden shadow-lg"
        side="right"
        collisionPadding={16}
      >
        <ItemTooltip {itemId} {tooltipHtml} />
      </HoverCard.Content>
    </HoverCard.Root>
  {:else}
    <EntityLink
      href="/items/{itemId}"
      name={itemName}
      domain="item"
      entityId={itemId}
      {imageKind}
      {imageAvailable}
      {imageWidth}
      {imageHeight}
      {fallback}
      {variant}
      size={28}
      colorClass={effectiveColorClass}
      class={cn(
        variant === "reference" ? "inline-flex" : displayMode,
        "max-w-full",
        className,
      )}
      nameClass={cn(maxWidth && "block truncate")}
    />
  {/if}
</span>

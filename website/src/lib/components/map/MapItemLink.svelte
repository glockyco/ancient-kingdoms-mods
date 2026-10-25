<script lang="ts" module>
  // Shared state to ensure only one tooltip is open at a time
  let currentOpenId = $state<string | null>(null);
</script>

<script lang="ts">
  import { browser } from "$app/environment";
  import { MediaQuery } from "svelte/reactivity";
  import * as HoverCard from "$lib/components/ui/hover-card";
  import { buildEntityUrl } from "$lib/map/url-state";
  import ItemTooltip from "$lib/components/ItemTooltip.svelte";
  import { entityImageUrl } from "$lib/utils/entityImage";

  interface Props {
    itemId: string;
    itemName: string;
    tooltipHtml?: string | null;
    imageAvailable?: string | boolean | null;
    class?: string;
    colorClass?: string;
    onSelect: (itemId: string) => void;
  }

  let {
    itemId,
    itemName,
    tooltipHtml = null,
    imageAvailable,
    class: className,
    colorClass,
    onSelect,
  }: Props = $props();

  const instanceId = crypto.randomUUID();

  const isSmallScreen = new MediaQuery("(max-width: 640px)");
  const showTooltip = $derived(
    tooltipHtml && browser && !isSmallScreen.current,
  );
  const tooltipVisualAsset = $derived.by(() => {
    if (tooltipHtml && imageAvailable === undefined) {
      throw new Error(`Missing icon availability for item ${itemId}`);
    }
    return imageAvailable
      ? { public_path: entityImageUrl("item", itemId, "icon").slice(1) }
      : null;
  });

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

<!--
  The wrapper takes the caller's layout classes, such as truncate, and the
  anchor stays inline so the name sits on the baseline of the row around it.
-->
<span class="min-w-0 {className}">
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
            {href}
            onclick={handleClick}
            class="cursor-pointer underline decoration-dotted hover:decoration-solid {effectiveColorClass}"
          >
            {itemName}
          </a>
        {/snippet}
      </HoverCard.Trigger>
      <HoverCard.Content
        class="w-80 border-0 p-0 overflow-hidden shadow-lg"
        side="right"
        collisionPadding={16}
      >
        <ItemTooltip {tooltipHtml} visualAsset={tooltipVisualAsset} />
      </HoverCard.Content>
    </HoverCard.Root>
  {:else}
    <a
      {href}
      onclick={handleClick}
      class="cursor-pointer underline hover:opacity-80 {effectiveColorClass}"
    >
      {itemName}
    </a>
  {/if}
</span>

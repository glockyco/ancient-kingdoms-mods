<script lang="ts">
  import { browser } from "$app/environment";
  import { MediaQuery } from "svelte/reactivity";
  import * as HoverCard from "$lib/components/ui/hover-card";

  interface Props {
    itemId: string;
    itemName: string;
    tooltipHtml?: string | null;
    class?: string;
  }

  let {
    itemId,
    itemName,
    tooltipHtml = null,
    class: className,
  }: Props = $props();

  const isSmallScreen = new MediaQuery("(max-width: 640px)");
  const showTooltip = $derived(
    tooltipHtml && browser && !isSmallScreen.current,
  );
</script>

{#if showTooltip}
  <HoverCard.Root openDelay={200} closeDelay={0}>
    <HoverCard.Trigger>
      <a
        href="/items/{itemId}"
        class="text-blue-600 dark:text-blue-400 underline decoration-dotted hover:decoration-solid {className}"
      >
        {itemName}
      </a>
    </HoverCard.Trigger>
    <HoverCard.Content
      class="w-80 border-0 p-0 rounded-none shadow-lg"
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
    class="text-blue-600 dark:text-blue-400 hover:underline {className}"
  >
    {itemName}
  </a>
{/if}

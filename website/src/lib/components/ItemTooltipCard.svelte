<!--
  Shows an item's game tooltip when its trigger is hovered, as ItemLink does for named
  links, so an icon on its own can carry the same tooltip. Small screens get no hover card.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import { browser } from "$app/environment";
  import { MediaQuery } from "svelte/reactivity";
  import * as HoverCard from "$lib/components/ui/hover-card";
  import ItemTooltip from "$lib/components/ItemTooltip.svelte";

  let {
    tooltipHtml,
    icon,
    iconWidth = null,
    iconHeight = null,
    trigger,
  }: {
    tooltipHtml: string | null;
    /** Public path of the item's icon, with a leading slash, or null. */
    icon: string | null;
    iconWidth?: number | null;
    iconHeight?: number | null;
    /** Renders the trigger; spread `props` onto its root element. */
    trigger: Snippet<[{ props: Record<string, unknown> }]>;
  } = $props();

  const isSmallScreen = new MediaQuery("(max-width: 640px)");
  const show = $derived(tooltipHtml && browser && !isSmallScreen.current);
  const visualAsset = $derived(
    icon
      ? {
          public_path: icon.slice(1),
          width: iconWidth ?? undefined,
          height: iconHeight ?? undefined,
        }
      : null,
  );
</script>

{#if show}
  <HoverCard.Root openDelay={200} closeDelay={0}>
    <HoverCard.Trigger>
      {#snippet child({ props })}
        {@render trigger({ props })}
      {/snippet}
    </HoverCard.Trigger>
    <HoverCard.Content
      class="w-80 overflow-hidden border-0 p-0 shadow-lg"
      side="right"
      collisionPadding={16}
    >
      <ItemTooltip {tooltipHtml} {visualAsset} />
    </HoverCard.Content>
  </HoverCard.Root>
{:else}
  {@render trigger({ props: {} })}
{/if}

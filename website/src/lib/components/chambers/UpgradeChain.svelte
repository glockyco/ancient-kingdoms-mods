<!--
  The guardian's reward buys the Chaos Catalyst, and each catalyst raises one augment
  by one quality. The price is paid in the excluded reward, so it shows as the existing
  "Redacted item" placeholder. Legendary augments are only reachable by this chain.
-->
<script lang="ts">
  import AugmentFamilyGrid from "$lib/components/AugmentFamilyGrid.svelte";
  import EntityLink from "$lib/components/EntityLink.svelte";
  import ItemTooltipCard from "$lib/components/ItemTooltipCard.svelte";
  import RedactedEntry from "$lib/components/RedactedEntry.svelte";
  import { resolve } from "$app/paths";
  import { formatNumber } from "$lib/utils/format";
  import type { ChainFamily, ChainItem, Vendor } from "./model";

  let {
    catalyst,
    typeLabel,
    price,
    vendors,
    families,
    class: className = "",
  }: {
    catalyst: ChainItem;
    typeLabel: string;
    price: number;
    vendors: readonly Vendor[];
    families: readonly ChainFamily[];
    class?: string;
  } = $props();
</script>

<div class="space-y-4 {className}">
  <div
    class="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border bg-card p-3"
  >
    <ItemTooltipCard
      tooltipHtml={catalyst.tooltipHtml}
      icon={catalyst.icon}
      iconWidth={catalyst.iconWidth}
      iconHeight={catalyst.iconHeight}
    >
      {#snippet trigger({ props })}
        <EntityLink
          {...props}
          variant="reference"
          href={resolve("/items/[id]", { id: catalyst.id })}
          name={catalyst.name}
          imageSrc={catalyst.icon}
          quality={catalyst.quality}
          size={36}
        />
      {/snippet}
    </ItemTooltipCard>
    <span
      class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
      >{typeLabel}</span
    >
    <span class="text-sm tabular-nums"
      >{formatNumber(price)} <RedactedEntry kind="item" /></span
    >
  </div>
  <p class="text-sm text-muted-foreground">
    Sold by {vendors.length} Adventurer merchants:
    {#each vendors as vendor, index (vendor.id)}{index > 0
        ? index === vendors.length - 1
          ? ", and "
          : ", "
        : ""}<a
        href={resolve("/npcs/[id]", { id: vendor.id })}
        class="text-blue-600 hover:underline dark:text-blue-400"
        >{vendor.name}</a
      >{/each}.
  </p>
  <p class="text-sm text-muted-foreground">
    Each row runs from the Small augment to the Legendary one, one catalyst per
    step.
  </p>
  <AugmentFamilyGrid {families} />
</div>

<!--
  One card per augment family, its icons in order from the lowest quality to Legendary.
  Each icon shows the item's game tooltip on hover and links to the item.
-->
<script lang="ts">
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import EntityIcon from "$lib/components/EntityIcon.svelte";
  import ItemTooltipCard from "$lib/components/ItemTooltipCard.svelte";
  import { resolve } from "$app/paths";
  import { getQualityBorderClass } from "$lib/utils/format";
  import type { ChainFamily } from "$lib/components/chambers/model";

  let { families }: { families: readonly ChainFamily[] } = $props();
</script>

<ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
  {#each families as family (family.name)}
    <li class="rounded-lg border bg-card p-3">
      <p class="mb-2 text-sm font-medium text-foreground">{family.name}</p>
      <ol
        class="flex items-center gap-1"
        aria-label={`${family.name} upgrade steps`}
      >
        {#each family.tiers as tier, index (tier.id)}
          <li class="flex items-center gap-1">
            {#if index > 0}
              <ChevronRight
                class="size-3.5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            {/if}
            <ItemTooltipCard
              tooltipHtml={tier.tooltipHtml}
              icon={tier.icon}
              iconWidth={tier.iconWidth}
              iconHeight={tier.iconHeight}
            >
              {#snippet trigger({ props })}
                <a
                  {...props}
                  href={resolve("/items/[id]", { id: tier.id })}
                  aria-label={tier.name}
                  class="rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <EntityIcon
                    src={tier.icon}
                    alt=""
                    size={32}
                    borderClass={getQualityBorderClass(tier.quality)}
                  />
                </a>
              {/snippet}
            </ItemTooltipCard>
          </li>
        {/each}
      </ol>
    </li>
  {/each}
</ul>

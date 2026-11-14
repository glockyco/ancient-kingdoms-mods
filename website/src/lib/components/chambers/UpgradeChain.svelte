<!--
  The guardian's reward buys the Chaos Catalyst, and each catalyst raises one loose augment
  by one quality. The price is paid in the excluded reward, so it shows as the existing
  "Redacted item" placeholder. Legendary augments are only reachable by this chain.
-->
<script lang="ts">
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import EntityIcon from "$lib/components/EntityIcon.svelte";
  import EntityLink from "$lib/components/EntityLink.svelte";
  import RedactedEntry from "$lib/components/RedactedEntry.svelte";
  import { resolve } from "$app/paths";
  import { formatNumber, getQualityBorderClass } from "$lib/utils/format";
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
    <EntityLink
      variant="reference"
      href={resolve("/items/[id]", { id: catalyst.id })}
      name={catalyst.name}
      imageSrc={catalyst.icon}
      quality={catalyst.quality}
      size={36}
    />
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
              <a
                href={resolve("/items/[id]", { id: tier.id })}
                title={tier.name}
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
            </li>
          {/each}
        </ol>
      </li>
    {/each}
  </ul>
</div>

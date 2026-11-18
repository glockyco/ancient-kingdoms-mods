<!--
  Augment upgrades on an item page. The augment upgrade item lists every family as the
  Chambers of Chaos page does. An augment lists its own family as named steps, with the
  augment the page is about marked.
-->
<script lang="ts">
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import AugmentFamilyGrid from "$lib/components/AugmentFamilyGrid.svelte";
  import EntityIcon from "$lib/components/EntityIcon.svelte";
  import ItemTooltipCard from "$lib/components/ItemTooltipCard.svelte";
  import { resolve } from "$app/paths";
  import { getQualityBorderClass } from "$lib/utils/format";
  import type { ChainFamily, ChainItem } from "$lib/components/chambers/model";

  let {
    catalyst,
    families,
    currentId = null,
  }: {
    catalyst: ChainItem;
    families: readonly ChainFamily[];
    /** The augment the page is about, or null on the augment upgrade item's page. */
    currentId?: string | null;
  } = $props();

  const link = "text-blue-600 hover:underline dark:text-blue-400";
  const family = $derived(currentId === null ? null : families[0]);
</script>

{#snippet catalystName()}
  {#if currentId === null}{catalyst.name}{:else}<a
      href={resolve("/items/[id]", { id: catalyst.id })}
      class={link}>{catalyst.name}</a
    >{/if}
{/snippet}

<div class="space-y-4">
  <!-- Source: server-scripts/AugmentUpgradeItem.cs:TryUpgrade,TryUpgradeSocketed,GetTargetAugment; PlayerInventory.cs:GetAugmentUpgradeEquipment — a loose augment is consumed with the catalyst, while an augment socketed in gear in the bags, worn by the player or worn by an active mercenary improves in place and only the catalyst is consumed. -->
  <p class="text-sm text-muted-foreground">
    A {@render catalystName()} raises one augment by one quality, either a loose one
    or one socketed in gear you or an active mercenary carry. Each step uses up its
    own catalyst, and a loose augment is used up too.
  </p>
  {#if family}
    <ol
      class="flex flex-col items-start gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-3"
      aria-label={`${family.name} upgrade steps`}
    >
      {#each family.tiers as tier, index (tier.id)}
        <li
          class="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2"
        >
          {#if index > 0}
            <ChevronRight
              class="ml-4 size-4 shrink-0 rotate-90 text-muted-foreground sm:ml-0 sm:rotate-0"
              aria-hidden="true"
            />
          {/if}
          {@render step(tier)}
        </li>
      {/each}
    </ol>
  {:else}
    <p class="text-sm text-muted-foreground">
      Each row runs from the Small augment to the Legendary one.
    </p>
    <AugmentFamilyGrid {families} />
  {/if}
</div>

{#snippet step(tier: ChainItem)}
  {@const current = tier.id === currentId}
  <ItemTooltipCard
    tooltipHtml={tier.tooltipHtml}
    icon={tier.icon}
    iconWidth={tier.iconWidth}
    iconHeight={tier.iconHeight}
  >
    {#snippet trigger({ props })}
      {#if current}
        <span
          {...props}
          aria-current="page"
          class="flex items-center gap-2 rounded-lg border border-foreground bg-muted px-2 py-1.5 font-semibold"
        >
          <EntityIcon
            src={tier.icon}
            alt=""
            size={28}
            borderClass={getQualityBorderClass(tier.quality)}
          />
          {tier.name}
        </span>
      {:else}
        <a
          {...props}
          href={resolve("/items/[id]", { id: tier.id })}
          class="flex items-center gap-2 rounded-lg border bg-card px-2 py-1.5 {link}"
        >
          <EntityIcon
            src={tier.icon}
            alt=""
            size={28}
            borderClass={getQualityBorderClass(tier.quality)}
          />
          {tier.name}
        </a>
      {/if}
    {/snippet}
  </ItemTooltipCard>
{/snippet}

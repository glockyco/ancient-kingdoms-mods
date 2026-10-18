<script lang="ts">
  import type { DefinitionInspection } from "$lib/acquisition/types";
  import ItemLink from "../ItemLink.svelte";
  import MethodList from "./MethodList.svelte";
  import { quantityText, type DisplayItems } from "./display";
  let {
    inspection,
    items = {},
    names = {},
    isPack = false,
  }: {
    inspection: DefinitionInspection;
    items?: DisplayItems;
    names?: Readonly<Record<string, string>>;
    isPack?: boolean;
  } = $props();
  const sections = $derived([
    { label: "Contents", outcomes: inspection.fixedContents },
    { label: "Random rewards", outcomes: inspection.randomOutcomes },
    { label: "Chest rewards", outcomes: inspection.portableChestOutcomes },
  ]);
</script>

<div class="space-y-4">
  {#each sections as section (section.label)}
    {#if section.outcomes.length}
      <section class="rounded-md border bg-muted/30 p-4 space-y-2">
        <h3 class="font-semibold">{section.label}</h3>
        {#if section.label === "Random rewards"}<p
            class="text-sm text-muted-foreground"
          >
            One of these rewards is chosen when another source awards this item.
            This is not a container you can open from inventory.
          </p>{/if}
        {#each section.outcomes as outcome (outcome)}
          <div class="flex flex-wrap gap-2 items-baseline">
            {#if outcome.itemId}<ItemLink
                itemId={outcome.itemId}
                itemName={items[outcome.itemId]?.name ??
                  outcome.itemId.replaceAll("_", " ")}
              />{:else}<span>Unpublished outcome</span>{/if}
            <span>{quantityText(outcome.amount)}</span>
            {#if outcome.probability !== null && section.label !== "Contents"}<span
                class="text-sm text-muted-foreground"
                >{(outcome.probability * 100).toLocaleString("en-US", {
                  maximumSignificantDigits: 5,
                })}% per {section.label === "Chest rewards"
                  ? "opening"
                  : "award"}</span
              >{/if}
          </div>
        {/each}
      </section>
    {/if}
  {/each}
  {#if inspection.offeredAssets.length}
    <section class="space-y-2">
      <h3 class="font-semibold">Where this is offered</h3>
      {#if isPack}<p class="text-sm text-muted-foreground">
          Buying or crafting this pack gives its contents directly, rather than
          placing the pack in inventory.
        </p>{/if}
      <MethodList methods={inspection.offeredAssets} {items} {names} />
    </section>
  {/if}
  {#if inspection.initiatingMemberships.length}
    <section class="space-y-2">
      <h3 class="font-semibold">Using this item</h3>
      <MethodList methods={inspection.initiatingMemberships} {items} {names} />
    </section>
  {/if}
</div>

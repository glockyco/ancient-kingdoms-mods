<script lang="ts">
  import type { MethodView } from "$lib/acquisition/types";
  import type { DisplayItems } from "./acquisition/display";
  import ScrollRegion from "./acquisition/ScrollRegion.svelte";
  import LazyObtainabilityTree from "./LazyObtainabilityTree.svelte";
  import DeferredDetails from "./DeferredDetails.svelte";

  let {
    methods,
    items,
    names = {},
  }: {
    methods: readonly MethodView[];
    items: DisplayItems;
    names?: Readonly<Record<string, string>>;
  } = $props();
</script>

<div class="space-y-4 min-w-0">
  {#each methods as method, index (method.methodId)}
    <div class="bg-background rounded-md p-4 border min-w-0 space-y-4">
      {#if methods.length > 1}
        <h3 class="font-semibold">Alternative {index + 1}</h3>
      {/if}
      {#each method.costGroups as group (group.id)}
        <div class="space-y-3">
          {#each group.inputs as input (input.id)}
            {@const itemId = input.item_id}
            {@const itemName =
              input.resource_kind === "gold"
                ? "Gold"
                : input.withheld
                  ? "Unpublished required item"
                  : (items[itemId ?? ""]?.name ??
                    names[itemId ?? ""] ??
                    itemId?.replaceAll("_", " ") ??
                    "Item")}
            <div class="border-l-2 pl-3 min-w-0">
              {#if input.resource_kind === "item" && itemId && !input.withheld}
                <DeferredDetails
                  summary={`${itemName} ×${input.amount}`}
                  summaryClassName="cursor-pointer font-medium text-blue-600 dark:text-blue-400"
                >
                  <ScrollRegion
                    label="Sources for {itemName}"
                    className="mt-3 max-h-[32rem] overflow-auto overscroll-contain pr-2"
                  >
                    <LazyObtainabilityTree
                      {itemId}
                      amount={input.amount}
                      hideHeading
                    />
                  </ScrollRegion>
                </DeferredDetails>
              {:else}
                <p>{itemName} ×{input.amount}</p>
              {/if}
            </div>
          {/each}
        </div>
      {/each}
    </div>
  {/each}
</div>

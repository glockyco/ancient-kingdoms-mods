<script lang="ts">
  import type { AcquisitionTree, MethodView } from "$lib/acquisition/types";
  import ItemLink from "./ItemLink.svelte";
  import ObtainabilityTree from "./ObtainabilityTree.svelte";
  import MethodList from "./acquisition/MethodList.svelte";
  import DeferredDetails from "./DeferredDetails.svelte";
  import {
    acquisitionPlanNotes,
    ingredientQuantityText,
    type DisplayItems,
  } from "./acquisition/display";
  let {
    node,
    hideRootLink = false,
    hideHeading = false,
    items = {},
    names: suppliedNames = {},
  }: {
    node: AcquisitionTree;
    hideRootLink?: boolean;
    hideHeading?: boolean;
    items?: DisplayItems;
    names?: Readonly<Record<string, string>>;
  } = $props();
  const names = $derived({ ...suppliedNames, ...node.names });
  const presentation = $derived.by(() => {
    const methods: MethodView[] = [];
    const plans: {
      branch: AcquisitionTree["branches"][number];
      notes: readonly string[];
    }[] = [];
    for (const branch of node.branches) {
      const notes = acquisitionPlanNotes(branch);
      if (branch.ingredients.length || branch.reason || notes.length) {
        plans.push({ branch, notes });
      } else {
        methods.push(branch.method);
      }
    }
    return { methods, plans };
  });
</script>

<div class="space-y-3 min-w-0">
  {#if !hideHeading}
    <div class="flex flex-wrap items-baseline gap-2 font-medium">
      {#if hideRootLink}<span
          >{items[node.itemId]?.name ?? node.itemId.replaceAll("_", " ")}</span
        >{:else}<ItemLink
          itemId={node.itemId}
          itemName={items[node.itemId]?.name ??
            node.itemId.replaceAll("_", " ")}
        />{/if}
      <span class="text-muted-foreground">×{node.amount}</span>
    </div>
  {/if}
  {#if node.reason}
    <p class="text-sm text-muted-foreground">
      {#if node.reason === "cycle"}
        This ingredient leads back to an earlier item.&#32;
      {/if}
      <a
        class="text-blue-600 hover:underline dark:text-blue-400"
        href={node.inspectionLink}>View this item's sources</a
      >.
    </p>
  {/if}
  {#if presentation.methods.length}
    <MethodList
      methods={presentation.methods}
      {items}
      {names}
      selectedItemId={node.itemId}
      parentScroll
    />
  {/if}
  {#each presentation.plans as plan (plan.branch.method.methodId)}
    {@const branch = plan.branch}
    <div class="space-y-2 sm:border-l-2 sm:pl-3">
      <MethodList
        methods={[branch.method]}
        {items}
        {names}
        selectedItemId={node.itemId}
        parentScroll
      />
      {#if branch.reason === "cycle"}
        <p class="text-sm text-muted-foreground">
          This source depends on an earlier item in this chain. <a
            class="text-blue-600 hover:underline dark:text-blue-400"
            href={node.inspectionLink}>Inspect this item</a
          >.
        </p>
      {/if}
      {#each plan.notes as note (note)}
        <p class="text-sm text-muted-foreground">{note}</p>
      {/each}
      {#each branch.ingredients as ingredient (ingredient.input.id)}
        {#if ingredient.acquisition}
          {@const child = ingredient.acquisition}
          {@const itemName =
            items[child.itemId]?.name ??
            names[child.itemId] ??
            child.itemId.replaceAll("_", " ")}
          <DeferredDetails
            summary={`${itemName} ×${child.amount}`}
            summaryClassName="cursor-pointer font-medium text-blue-600 dark:text-blue-400"
          >
            <div class="mt-3">
              <ObtainabilityTree node={child} {items} {names} hideHeading />
            </div>
          </DeferredDetails>
        {:else}
          {@const amount = ingredientQuantityText(branch, ingredient)}
          {#if amount && (ingredient.amount.kind !== "exact" || ingredient.amount.value !== ingredient.input.amount)}
            <p>
              {ingredient.input.resource_kind === "gold"
                ? ingredient.amount.kind === "unknown"
                  ? "Gold"
                  : "Total gold"
                : ingredient.input.withheld
                  ? "Unpublished required item"
                  : (items[ingredient.input.item_id ?? ""]?.name ??
                    ingredient.input.item_id?.replaceAll("_", " "))}: {amount}
            </p>
          {/if}
        {/if}
      {/each}
    </div>
  {/each}
  {#if !node.branches.length && !node.reason}<p
      class="text-sm text-muted-foreground"
    >
      No known source.
    </p>{/if}
</div>

<script lang="ts">
  import { browserAcquisitionQuery } from "$lib/acquisition/browser";
  import { expandAcquisition } from "$lib/acquisition/expand";
  import {
    loadAcquisitionItems,
    type AcquisitionItem,
  } from "$lib/acquisition/items";
  import type { AcquisitionTree } from "$lib/acquisition/types";
  import ObtainabilityTree from "./ObtainabilityTree.svelte";

  let {
    itemId,
    amount = 1,
    rootRecipeMethodIds,
    hideRootLink = false,
    hideHeading = false,
  }: {
    itemId: string;
    amount?: number;
    rootRecipeMethodIds?: readonly string[];
    hideRootLink?: boolean;
    hideHeading?: boolean;
  } = $props();

  let tree = $state.raw<AcquisitionTree | null>(null);
  let items = $state.raw<Record<string, AcquisitionItem>>({});
  let loading = $state(true);
  let error = $state<string | null>(null);

  $effect(() => {
    const id = itemId;
    const requested = amount;
    const selectedMethods = rootRecipeMethodIds;
    let cancelled = false;
    tree = null;
    items = {};
    loading = true;
    error = null;

    async function load() {
      try {
        const value = await expandAcquisition(browserAcquisitionQuery, {
          itemId: id,
          amount: requested,
          rootRecipeMethodIds: selectedMethods,
          maxDepth: 8,
          maxNodes: 200,
        });
        if (cancelled) return;
        const loadedItems = await loadAcquisitionItems(
          browserAcquisitionQuery,
          value,
        );
        if (!cancelled) {
          items = loadedItems;
          tree = value;
        }
      } catch {
        if (!cancelled)
          error = "Could not load item sources. Refresh the page to try again.";
      } finally {
        if (!cancelled) loading = false;
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  });
</script>

{#if loading}
  <p class="text-muted-foreground" role="status">Loading sources...</p>
{:else if error}
  <p class="text-destructive" role="alert">{error}</p>
{:else if tree}
  <ObtainabilityTree
    node={tree}
    {items}
    names={tree.names}
    {hideRootLink}
    {hideHeading}
  />
{/if}

<script lang="ts" generics="TData, TValue">
  import type { Column } from "@tanstack/table-core";
  import { SvelteSet } from "svelte/reactivity";
  import * as Tabs from "$lib/components/ui/tabs";
  import { Button } from "$lib/components/ui/button";
  import { cn } from "$lib/utils.js";
  import { STAT_CATEGORIES, ALL_STAT_KEYS } from "$lib/constants/stats";
  import { STAT_DISPLAY_NAMES } from "$lib/terminology";
  import {
    getStatCounts,
    getMatchingItemIds,
    getStatDeltas,
  } from "$lib/queries/item-stats";

  interface StatFilterValue {
    stats: string[];
    mode: "any" | "all";
  }

  let {
    column,
    open = $bindable(false),
    totalRows,
    filteredRows,
    facetedItemIds,
  }: {
    column: Column<TData, TValue>;
    open?: boolean;
    totalRows: number;
    filteredRows: number;
    facetedItemIds: string[];
  } = $props();

  // Validate filter value structure: stats array (can be empty) and valid mode
  function isValidFilterValue(value: unknown): value is StatFilterValue {
    if (!value || typeof value !== "object") return false;
    const v = value as Record<string, unknown>;
    if (!Array.isArray(v.stats)) return false;
    if (v.mode !== "any" && v.mode !== "all") return false;
    return v.stats.every((s) => typeof s === "string");
  }

  const rawFilterValue = $derived(column?.getFilterValue());
  const filterValue = $derived(
    isValidFilterValue(rawFilterValue) ? rawFilterValue : undefined,
  );
  const selectedStats = $derived(new SvelteSet(filterValue?.stats ?? []));
  const matchMode = $derived(filterValue?.mode ?? "all");

  // Clear invalid/garbage filter state on mount (e.g., from URL parsing issues)
  $effect(() => {
    if (rawFilterValue !== undefined && !isValidFilterValue(rawFilterValue)) {
      column?.setFilterValue(undefined);
    }
  });

  // Async state for SQL query results
  let counts = $state<Map<string, number>>(new Map());
  let deltas = $state<Map<string, number>>(new Map());
  let currentMatchCount = $state(0);

  // Fetch counts when panel opens or faceted items change
  $effect(() => {
    if (!open) return;

    const ids = facetedItemIds;
    getStatCounts(ids.length > 0 ? ids : undefined).then((result) => {
      counts = result;
    });
  });

  // Fetch deltas when selection changes
  $effect(() => {
    if (!open) return;
    if (selectedStats.size === 0) {
      deltas = new Map();
      currentMatchCount = 0;
      return;
    }

    const selected = [...selectedStats];
    const mode = matchMode;

    // Get current match count and deltas
    Promise.all([
      getMatchingItemIds(selected, mode),
      getStatDeltas(selected, mode, ALL_STAT_KEYS),
    ]).then(([matchingIds, deltaResults]) => {
      currentMatchCount = matchingIds.size;
      deltas = deltaResults;
    });
  });

  function updateFilter(stats: Set<string>, mode: "any" | "all") {
    const statsArray = Array.from(stats);
    // Always keep mode in filter value so it persists to URL
    column?.setFilterValue({ stats: statsArray, mode });
  }

  function toggleStat(stat: string) {
    const newStats = new SvelteSet(selectedStats);
    if (newStats.has(stat)) {
      newStats.delete(stat);
    } else {
      newStats.add(stat);
    }
    updateFilter(newStats, matchMode);
  }

  function setMode(mode: "any" | "all") {
    updateFilter(selectedStats, mode);
  }

  function clearFilter() {
    column?.setFilterValue(undefined);
  }

  function getStatLabel(stat: string): string {
    return STAT_DISPLAY_NAMES[stat] ?? stat;
  }
</script>

{#if open}
  <div class="border-border bg-muted/30 mt-2 rounded-lg border p-4">
    <!-- Header: Mode toggle + Summary -->
    <div class="mb-4 flex items-center justify-between gap-4">
      <Tabs.Root
        value={matchMode}
        onValueChange={(v) => setMode(v as "any" | "all")}
      >
        <Tabs.List>
          <Tabs.Trigger value="all">All</Tabs.Trigger>
          <Tabs.Trigger value="any">Any</Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>

      <div class="text-muted-foreground flex items-center gap-4 text-sm">
        <span>
          Showing <span class="text-foreground font-medium">{filteredRows}</span
          >
          of {totalRows} items
        </span>
        {#if selectedStats.size > 0}
          <Button
            variant="ghost"
            size="sm"
            class="h-7 px-2"
            onclick={clearFilter}
          >
            Clear filters
          </Button>
        {/if}
      </div>
    </div>

    <!-- Stat grid -->
    <div class="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
      {#each Object.entries(STAT_CATEGORIES) as [categoryKey, category] (categoryKey)}
        <div>
          <h4
            class="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide"
          >
            {category.label}
          </h4>
          <div class="flex flex-col gap-1">
            {#each category.stats as stat (stat)}
              {@const isSelected = selectedStats.has(stat)}
              {@const count = counts.get(stat)}
              {@const delta = deltas.get(stat)}
              {@const newTotal =
                delta !== undefined ? currentMatchCount + delta : count}
              <!-- Only disable if we KNOW count is 0 (not if still loading) -->
              {@const isDisabled = count === 0 && !isSelected}
              <button
                type="button"
                onclick={() => !isDisabled && toggleStat(stat)}
                disabled={isDisabled}
                class={cn(
                  "flex items-center justify-between rounded-md border px-2 py-1 text-left text-sm transition-colors",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary/50 hover:bg-muted",
                  isDisabled && "pointer-events-none opacity-40",
                )}
              >
                <span class="truncate">{getStatLabel(stat)}</span>
                <span
                  class={cn(
                    "ml-2 shrink-0 tabular-nums",
                    isSelected
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground",
                  )}
                >
                  {#if count === undefined}
                    <!-- Not loaded yet -->
                  {:else if selectedStats.size === 0}
                    <!-- No selection: show absolute count -->
                    {count}
                  {:else if delta !== undefined && delta !== 0}
                    <!-- Has selection: show new total + delta -->
                    {newTotal}
                    <span
                      class={cn(
                        "text-xs",
                        isSelected
                          ? "text-primary-foreground/60"
                          : "text-muted-foreground/60",
                      )}
                    >
                      ({delta > 0 ? "+" : ""}{delta})
                    </span>
                  {:else}
                    <!-- Delta is 0 or undefined: just show the number -->
                    {newTotal}
                  {/if}
                </span>
              </button>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}

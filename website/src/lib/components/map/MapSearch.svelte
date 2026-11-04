<script lang="ts">
  import * as Command from "$lib/components/ui/command";
  import { openFocused } from "$lib/components/ui/command/open-focused";
  import {
    searchMapEntities,
    type MapSearchCategory,
    type MapSearchResult,
  } from "$lib/queries/map-search";
  import { linkActiveDescendant } from "$lib/components/ui/command/link-active-descendant";
  import { scrollSelectedIntoView } from "$lib/components/ui/command/scroll-selected-into-view";
  import SearchResultItem from "./SearchResultItem.svelte";

  interface Props {
    open: boolean;
    onselect: (result: MapSearchResult) => void;
  }
  let { open = $bindable(false), onselect }: Props = $props();

  let query = $state("");
  let results = $state<MapSearchResult[]>([]);
  let loading = $state(false);
  let failed = $state(false);

  let input = $state<HTMLInputElement | null>(null);

  /** Opens the search with its field focused, for a button that opens it. */
  export function show() {
    openFocused(
      () => (open = true),
      () => input,
    );
  }

  // Debounced search
  let searchTimeout: ReturnType<typeof setTimeout>;
  $effect(() => {
    clearTimeout(searchTimeout);
    const searchQuery = query;
    let cancelled = false;
    failed = false;
    if (searchQuery.length >= 2) {
      loading = true;
      searchTimeout = setTimeout(async () => {
        try {
          const matches = await searchMapEntities(searchQuery);
          if (!cancelled) results = matches;
        } catch (error) {
          console.error("Failed to search map:", error);
          if (!cancelled) {
            results = [];
            failed = true;
          }
        } finally {
          if (!cancelled) loading = false;
        }
      }, 150);
    } else {
      results = [];
      loading = false;
    }
    return () => {
      cancelled = true;
      clearTimeout(searchTimeout);
    };
  });

  // Reset query when dialog closes
  $effect(() => {
    if (!open) {
      query = "";
      results = [];
    }
  });

  function handleSelect(result: MapSearchResult) {
    onselect(result);
    open = false;
  }

  const categoryLabels: Record<MapSearchResult["category"], string> = {
    monster: "Monsters",
    npc: "NPCs",
    zone: "Zones",
    resource: "Resources",
    chest: "Chests",
    treasure: "Dig sites",
    altar: "Altars",
    house: "Houses",
    shrine: "Shrines",
    trap: "Traps",
    crafting: "Crafting Stations",
    portal: "Portals",
    item: "Items",
    quest: "Quests",
  };

  // Group in global relevance order; preserve the first category's position.
  function groupByCategory(
    items: MapSearchResult[],
  ): [MapSearchCategory, MapSearchResult[]][] {
    const groups: [MapSearchCategory, MapSearchResult[]][] = [];
    for (const item of items) {
      const group = groups.find(([category]) => category === item.category);
      if (group) {
        group[1].push(item);
      } else {
        groups.push([item.category, [item]]);
      }
    }
    return groups;
  }
</script>

{#snippet searchContent()}
  <div class="contents" use:linkActiveDescendant>
    <Command.Input
      bind:value={query}
      bind:ref={input}
      placeholder="Search monsters, NPCs, zones..."
      autofocus
    />
    <div class="min-h-0 flex-1" use:scrollSelectedIntoView>
      <Command.List class="max-sm:max-h-full">
        {#if loading}
          <Command.Loading>
            <div class="py-6 text-center text-sm text-muted-foreground">
              Searching...
            </div>
          </Command.Loading>
        {:else if failed}
          <Command.Empty>
            <div role="alert" class="py-6 text-center text-sm text-destructive">
              Search is unavailable. Check your connection and try again.
            </div>
          </Command.Empty>
        {:else if query.length < 2}
          <Command.Empty>
            <div class="py-6 text-center text-sm text-muted-foreground">
              Type at least 2 characters to search
            </div>
          </Command.Empty>
        {:else if results.length === 0}
          <Command.Empty>
            <div class="py-6 text-center text-sm text-muted-foreground">
              No results found for "{query}"
            </div>
          </Command.Empty>
        {:else}
          {#each groupByCategory(results) as [category, items] (category)}
            <Command.Group heading={categoryLabels[category]}>
              {#each items as result (result.id)}
                <Command.Item
                  value={`${result.category}-${result.id}-${result.name}`}
                  onSelect={() => handleSelect(result)}
                >
                  <SearchResultItem {result} />
                </Command.Item>
              {/each}
            </Command.Group>
          {/each}
        {/if}
      </Command.List>
    </div>
  </div>
{/snippet}

<Command.Dialog
  bind:open
  title="Search Map"
  description="Search for monsters, NPCs, zones, and more"
  shouldFilter={false}
>
  {@render searchContent()}
</Command.Dialog>

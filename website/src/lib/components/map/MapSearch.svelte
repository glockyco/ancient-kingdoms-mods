<script lang="ts">
  import * as Command from "$lib/components/ui/command";
  import * as Drawer from "$lib/components/ui/drawer";
  import {
    searchMapEntities,
    SEARCH_CATEGORY_ORDER,
    type MapSearchResult,
    type MapSearchCategory,
  } from "$lib/queries/map-search";
  import SearchResultItem from "./SearchResultItem.svelte";

  interface Props {
    open: boolean;
    onselect: (result: MapSearchResult) => void;
  }
  let { open = $bindable(false), onselect }: Props = $props();

  let query = $state("");
  let results = $state<MapSearchResult[]>([]);
  let loading = $state(false);

  // Responsive detection
  let isMobile = $state(false);
  $effect(() => {
    const mql = window.matchMedia("(max-width: 640px)");
    isMobile = mql.matches;
    const handler = (e: MediaQueryListEvent) => (isMobile = e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  });

  // Debounced search
  let searchTimeout: ReturnType<typeof setTimeout>;
  $effect(() => {
    clearTimeout(searchTimeout);
    if (query.length >= 2) {
      loading = true;
      searchTimeout = setTimeout(async () => {
        results = await searchMapEntities(query);
        loading = false;
      }, 150);
    } else {
      results = [];
      loading = false;
    }
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

  // Group results by category
  const categoryLabels: Record<MapSearchCategory, string> = {
    monster: "Monsters",
    npc: "NPCs",
    zone: "Zones",
    resource: "Gathering",
    chest: "Chests",
    treasure: "Treasure",
    altar: "Altars",
    crafting: "Crafting Stations",
    portal: "Portals",
    item: "Items",
    quest: "Quests",
  };

  function groupByCategory(
    items: MapSearchResult[],
  ): [MapSearchCategory, MapSearchResult[]][] {
    const groups: Partial<Record<MapSearchCategory, MapSearchResult[]>> = {};
    for (const item of items) {
      (groups[item.category] ??= []).push(item);
    }
    return SEARCH_CATEGORY_ORDER.filter((cat) => groups[cat]).map((cat) => [
      cat,
      groups[cat]!,
    ]);
  }

  // Workaround: bits-ui Command doesn't fully scroll selected items into view
  // See: https://github.com/pacocoursey/cmdk/issues/321
  function fixScrollIntoView(node: HTMLElement) {
    function isFullyVisible(el: HTMLElement, container: HTMLElement): boolean {
      const elRect = el.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      return (
        elRect.top >= containerRect.top && elRect.bottom <= containerRect.bottom
      );
    }

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName !== "aria-selected") continue;
        const target = mutation.target as HTMLElement;
        if (target.getAttribute("aria-selected") !== "true") continue;

        const list = node.querySelector("[data-slot='command-list']");
        if (list && !isFullyVisible(target, list as HTMLElement)) {
          target.scrollIntoView({ block: "nearest" });
        }
      }
    });

    observer.observe(node, {
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-selected"],
    });

    return { destroy: () => observer.disconnect() };
  }
</script>

{#snippet searchContent()}
  <Command.Input
    bind:value={query}
    placeholder="Search monsters, NPCs, zones..."
    autofocus
  />
  <div use:fixScrollIntoView>
    <Command.List>
      {#if loading}
        <Command.Loading>
          <div class="py-6 text-center text-sm text-muted-foreground">
            Searching...
          </div>
        </Command.Loading>
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
{/snippet}

{#if isMobile}
  <Drawer.Root bind:open>
    <Drawer.Content class="max-h-[85vh]">
      <Drawer.Header class="sr-only">
        <Drawer.Title>Search Map</Drawer.Title>
      </Drawer.Header>
      <Command.Root
        shouldFilter={false}
        class="rounded-t-lg border-none bg-background"
      >
        {@render searchContent()}
      </Command.Root>
    </Drawer.Content>
  </Drawer.Root>
{:else}
  <Command.Dialog
    bind:open
    title="Search Map"
    description="Search for monsters, NPCs, zones, and more"
    shouldFilter={false}
  >
    {@render searchContent()}
  </Command.Dialog>
{/if}

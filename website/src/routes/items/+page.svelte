<script lang="ts">
  import { page } from "$app/stores";
  import { resolve } from "$app/paths";
  import { onMount } from "svelte";
  import { SvelteURLSearchParams } from "svelte/reactivity";
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { PAGINATION } from "$lib/config";
  import { formatItemType } from "$lib/utils/format";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const STORAGE_KEY = "items-filters";

  // Local state is source of truth
  let isHydrated = $state(false);
  let qualityFilter = $state<number[]>([]);
  let typeFilter = $state<string[]>([]);
  let searchFilter = $state("");
  let currentPage = $state(1);

  // Derived state
  const hasActiveFilters = $derived(
    qualityFilter.length > 0 || typeFilter.length > 0 || !!searchFilter,
  );

  // Sync filters to URL and localStorage
  function syncFilters() {
    if (!isHydrated) return;

    const params = new SvelteURLSearchParams();

    if (qualityFilter.length > 0)
      params.set("quality", qualityFilter.join(","));
    if (typeFilter.length > 0) params.set("type", typeFilter.join(","));
    if (searchFilter) params.set("search", searchFilter);
    if (currentPage > 1) params.set("page", String(currentPage));

    // Update URL
    const queryString = params.toString();
    const newUrl = queryString
      ? `${window.location.pathname}?${queryString}`
      : window.location.pathname;
    window.history.replaceState(history.state, "", newUrl);

    // Update localStorage (excluding page)
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          quality: qualityFilter,
          itemType: typeFilter,
          search: searchFilter,
        }),
      );
    } catch {
      // Ignore errors
    }
  }

  // Load from URL or localStorage
  onMount(() => {
    const urlQuality = $page.url.searchParams.get("quality");
    const urlType = $page.url.searchParams.get("type");
    const urlSearch = $page.url.searchParams.get("search");
    const urlPage = $page.url.searchParams.get("page");

    if (urlQuality || urlType || urlSearch) {
      // URL has params - use them
      qualityFilter = urlQuality ? urlQuality.split(",").map(Number) : [];
      typeFilter = urlType ? urlType.split(",") : [];
      searchFilter = urlSearch || "";
      currentPage = urlPage ? Number(urlPage) : 1;
    } else {
      // No URL params - try localStorage
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          qualityFilter = parsed.quality || [];
          typeFilter = parsed.itemType || [];
          searchFilter = parsed.search || "";
        }
      } catch {
        // Ignore errors
      }
    }

    isHydrated = true;
  });

  // Sync whenever filters change
  $effect(() => {
    syncFilters();
  });

  const qualities = [
    { name: "Common", color: "bg-quality-0" },
    { name: "Uncommon", color: "bg-quality-1" },
    { name: "Rare", color: "bg-quality-2" },
    { name: "Epic", color: "bg-quality-3" },
    { name: "Legendary", color: "bg-quality-4" },
  ];

  // Helper to check if item name matches search
  function matchesSearch(itemName: string): boolean {
    if (!searchFilter) return true;
    return itemName.toLowerCase().includes(searchFilter.toLowerCase());
  }

  // Helper to check if item matches all filters
  function matchesFilters(
    item: { quality: number; item_type: string; name: string },
    options: { includeQuality?: boolean; includeType?: boolean } = {},
  ): boolean {
    const { includeQuality = true, includeType = true } = options;

    if (
      includeQuality &&
      qualityFilter.length > 0 &&
      !qualityFilter.includes(item.quality)
    ) {
      return false;
    }
    if (
      includeType &&
      typeFilter.length > 0 &&
      !typeFilter.includes(item.item_type)
    ) {
      return false;
    }
    if (!matchesSearch(item.name)) {
      return false;
    }
    return true;
  }

  // Filter items
  const filteredItems = $derived(
    data.items.filter((item) => matchesFilters(item)),
  );

  // Calculate quality counts
  const qualityCounts = $derived(
    qualities.map((_, quality) => {
      const count = data.items.filter(
        (item) =>
          matchesFilters(item, { includeQuality: false }) &&
          item.quality === quality,
      ).length;
      return { quality, count };
    }),
  );

  // Calculate type counts
  const typeCounts = $derived.by(() => {
    const allTypes = Array.from(
      new Set(data.items.map((item) => item.item_type)),
    ).sort();
    return allTypes.map((type) => {
      const count = data.items.filter(
        (item) =>
          matchesFilters(item, { includeType: false }) &&
          item.item_type === type,
      ).length;
      return { type, count };
    });
  });

  // Pagination
  const totalPages = $derived(
    Math.ceil(filteredItems.length / PAGINATION.PAGE_SIZE),
  );
  const paginatedItems = $derived(
    filteredItems.slice(
      (currentPage - 1) * PAGINATION.PAGE_SIZE,
      currentPage * PAGINATION.PAGE_SIZE,
    ),
  );

  function toggleQuality(quality: number) {
    qualityFilter = qualityFilter.includes(quality)
      ? qualityFilter.filter((q) => q !== quality)
      : [...qualityFilter, quality];
    currentPage = 1; // Reset to page 1
  }

  function toggleType(type: string) {
    typeFilter = typeFilter.includes(type)
      ? typeFilter.filter((t) => t !== type)
      : [...typeFilter, type];
    currentPage = 1; // Reset to page 1
  }

  function clearFilters() {
    qualityFilter = [];
    typeFilter = [];
    searchFilter = "";
    currentPage = 1;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore errors
    }
  }

  function parseClassRequired(classJson: string): string[] {
    try {
      const parsed = JSON.parse(classJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
</script>

{#if !isHydrated}
  <div
    class="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"
  >
    <div class="text-center">
      <div
        class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
      ></div>
      <p class="mt-2 text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
{/if}

<div class="container mx-auto p-8 space-y-8">
  <div>
    <h1 class="text-4xl font-bold mb-2">Items</h1>
    <p class="text-muted-foreground">
      Showing {paginatedItems.length} of {filteredItems.length} items
      {#if filteredItems.length !== data.items.length}
        (filtered from {data.items.length} total)
      {/if}
    </p>
  </div>

  <!-- Filters -->
  <Card.Root class="bg-muted/30">
    <Card.Header>
      <div class="flex items-center justify-between">
        <Card.Title>Filters</Card.Title>
        <Button
          variant="outline"
          size="sm"
          class={!hasActiveFilters ? "invisible" : ""}
          onclick={clearFilters}
        >
          Clear Filters
        </Button>
      </div>
    </Card.Header>
    <Card.Content class="space-y-4">
      <!-- Search Filter -->
      <div>
        <label for="search" class="text-sm font-medium mb-2 block">Search</label
        >
        <input
          id="search"
          type="text"
          placeholder="Search items by name..."
          bind:value={searchFilter}
          oninput={() => (currentPage = 1)}
          class="w-full px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      <!-- Quality Filter -->
      <div>
        <div class="text-sm font-medium mb-2">Quality</div>
        <div class="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2">
          {#each qualityCounts as { quality, count } (quality)}
            <button
              type="button"
              class="px-3 py-1 rounded text-sm font-medium transition-all border-2 flex justify-between items-center {qualityFilter.includes(
                quality,
              )
                ? `${qualities[quality].color} border-foreground`
                : 'bg-muted border-transparent'} {count === 0
                ? 'opacity-40'
                : ''}"
              onclick={() => toggleQuality(quality)}
            >
              <span>{qualities[quality].name}</span>
              <span class="font-mono">({count})</span>
            </button>
          {/each}
        </div>
      </div>

      <!-- Item Type Filter -->
      <div>
        <div class="text-sm font-medium mb-2">Type</div>
        <div class="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2">
          {#each typeCounts as { type, count } (type)}
            <button
              type="button"
              class="px-3 py-1 rounded text-sm font-medium transition-all border-2 flex justify-between items-center {typeFilter.includes(
                type,
              )
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted border-transparent'} {count === 0
                ? 'opacity-40'
                : ''}"
              onclick={() => toggleType(type)}
            >
              <span>{formatItemType(type)}</span>
              <span class="font-mono">({count})</span>
            </button>
          {/each}
        </div>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Items Grid -->
  <div
    class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
  >
    {#each paginatedItems as item (item.id)}
      {@const classRequired = parseClassRequired(item.class_required)}
      <a href={resolve("/items/[id]", { id: item.id })} class="block">
        <Card.Root class="h-full hover:border-primary transition-colors">
          <Card.Header>
            <div class="flex items-start justify-between gap-2">
              <Card.Title class="text-lg">{item.name}</Card.Title>
              <span
                class="px-2 py-1 rounded text-xs font-medium {qualities[
                  item.quality
                ].color} flex-shrink-0"
              >
                Q{item.quality}
              </span>
            </div>
            <Card.Description>
              {formatItemType(item.item_type)}
              {#if item.level_required > 0}
                · Level {item.level_required}
              {/if}
            </Card.Description>
          </Card.Header>
          <Card.Content class="space-y-2">
            {#if item.slot}
              <div class="text-sm">
                <span class="text-muted-foreground">Slot:</span>
                <span class="font-medium">{item.slot}</span>
              </div>
            {/if}

            {#if item.backpack_slots > 0}
              <div class="text-sm">
                <span class="text-muted-foreground">Capacity:</span>
                <span class="font-medium"
                  >{item.backpack_slots} slot{item.backpack_slots !== 1
                    ? "s"
                    : ""}</span
                >
              </div>
            {/if}

            {#if classRequired.length > 0}
              <div class="text-sm">
                <span class="text-muted-foreground">Class:</span>
                <span class="font-medium">{classRequired.join(", ")}</span>
              </div>
            {/if}

            {#if item.stats_count > 0}
              <div class="text-sm text-muted-foreground">
                {item.stats_count} stat{item.stats_count !== 1 ? "s" : ""}
              </div>
            {/if}
          </Card.Content>
        </Card.Root>
      </a>
    {/each}
  </div>

  <!-- Pagination -->
  {#if totalPages > 1}
    <div class="flex justify-center gap-2">
      <Button
        variant="outline"
        disabled={currentPage <= 1}
        onclick={() => (currentPage = currentPage - 1)}
      >
        Previous
      </Button>

      <div class="flex items-center px-4">
        Page {currentPage} of {totalPages}
      </div>

      <Button
        variant="outline"
        disabled={currentPage >= totalPages}
        onclick={() => (currentPage = currentPage + 1)}
      >
        Next
      </Button>
    </div>
  {/if}
</div>

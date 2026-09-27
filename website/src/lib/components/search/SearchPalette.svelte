<script lang="ts">
  import { goto } from "$app/navigation";
  import EntityIcon from "$lib/components/EntityIcon.svelte";
  import * as Command from "$lib/components/ui/command";
  import { linkActiveDescendant } from "$lib/components/ui/command/link-active-descendant";
  import { scrollSelectedIntoView } from "$lib/components/ui/command/scroll-selected-into-view";
  import * as Drawer from "$lib/components/ui/drawer";
  import { entityRegistry, type EntityId } from "$lib/entities/registry";
  import { searchPalette } from "$lib/search/palette-state.svelte";
  import {
    loadRecentSearches,
    rememberSearch,
  } from "$lib/search/recent-searches";
  import {
    preloadSearchIndex,
    searchEntities,
    type SearchKind,
    type SearchResult,
  } from "$lib/search/search";
  import Clock from "@lucide/svelte/icons/clock";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import { FileText, ListFilter, type IconNode } from "lucide";

  let query = $state("");
  let results = $state<SearchResult[]>([]);
  let loading = $state(false);
  let failed = $state(false);
  let recent = $state<string[]>([]);
  let isMobile = $state(false);

  $effect(() => {
    const mql = window.matchMedia("(max-width: 640px)");
    isMobile = mql.matches;
    const handler = (e: MediaQueryListEvent) => (isMobile = e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  });

  $effect(() => {
    if (searchPalette.open) {
      recent = loadRecentSearches();
      preloadSearchIndex();
    } else {
      query = "";
      results = [];
    }
  });

  let searchTimeout: ReturnType<typeof setTimeout>;
  let searchToken = 0;
  $effect(() => {
    clearTimeout(searchTimeout);
    const text = query;
    const token = ++searchToken;
    if (text.trim().length < 2) {
      results = [];
      loading = false;
      return;
    }
    loading = true;
    searchTimeout = setTimeout(async () => {
      try {
        const found = await searchEntities(text);
        if (token !== searchToken) return;
        results = found;
        failed = false;
      } catch {
        if (token !== searchToken) return;
        results = [];
        failed = true;
      } finally {
        if (token === searchToken) loading = false;
      }
    }, 100);
  });

  const KIND_ICON: Partial<Record<SearchKind, IconNode>> = {
    page: FileText,
    list: ListFilter,
  };

  function iconFor(kind: SearchKind): IconNode {
    return KIND_ICON[kind] ?? entityRegistry[kind as EntityId].icon;
  }

  function open(result: SearchResult) {
    recent = rememberSearch(query);
    searchPalette.open = false;
    void goto(result.href);
  }

  const announcement = $derived(
    query.trim().length < 2 || loading
      ? ""
      : failed
        ? "Search is unavailable"
        : results.length === 1
          ? "1 result"
          : `${results.length} results`,
  );
</script>

{#snippet searchContent()}
  <div class="contents" use:linkActiveDescendant>
    <Command.Input
      bind:value={query}
      placeholder="Search items, monsters, rules..."
      autofocus
    />
    <div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {announcement}
    </div>
    <div use:scrollSelectedIntoView>
      <Command.List>
        {#if query.trim().length < 2}
          {#if recent.length > 0}
            <Command.Group heading="Recent searches">
              {#each recent as entry (entry)}
                <Command.Item
                  value={`recent-${entry}`}
                  onSelect={() => (query = entry)}
                >
                  <Clock class="text-muted-foreground" aria-hidden="true" />
                  <span class="truncate">{entry}</span>
                </Command.Item>
              {/each}
            </Command.Group>
          {:else}
            <Command.Empty>
              <div class="py-6 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search
              </div>
            </Command.Empty>
          {/if}
        {:else if loading && results.length === 0}
          <Command.Loading>
            <div class="py-6 text-center text-sm text-muted-foreground">
              Searching...
            </div>
          </Command.Loading>
        {:else if failed}
          <Command.Empty>
            <div class="py-6 text-center text-sm text-muted-foreground">
              Search is unavailable. Check your connection and try again.
            </div>
          </Command.Empty>
        {:else if results.length === 0}
          <Command.Empty>
            <div class="py-6 text-center text-sm text-muted-foreground">
              No results match "{query.trim()}"
            </div>
          </Command.Empty>
        {:else}
          {#each results as result (`${result.kind}:${result.id}`)}
            <Command.Item
              value={`${result.kind}:${result.id}`}
              onSelect={() => open(result)}
            >
              <div class="flex w-full min-w-0 items-center gap-3">
                <EntityIcon
                  src={result.image}
                  alt=""
                  fallbackIcon={iconFor(result.kind)}
                  size={28}
                />
                <span class="min-w-0 flex-1 truncate font-medium">
                  {result.name}
                </span>
                {#if result.detail}
                  <span
                    class="flex shrink-0 items-center gap-1 text-sm text-amber-600 dark:text-amber-400"
                  >
                    <Sparkles size={14} aria-hidden="true" />
                    {result.detail}
                  </span>
                {/if}
                <span class="shrink-0 text-sm text-muted-foreground">
                  {result.label}
                </span>
              </div>
            </Command.Item>
          {/each}
        {/if}
      </Command.List>
    </div>
  </div>
{/snippet}

{#if isMobile}
  <Drawer.Root bind:open={searchPalette.open}>
    <Drawer.Content class="max-h-[85vh]">
      <Drawer.Header class="sr-only">
        <Drawer.Title>Search the compendium</Drawer.Title>
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
    bind:open={searchPalette.open}
    title="Search the compendium"
    description="Search items, monsters, NPCs, zones, rules, and lists"
    shouldFilter={false}
  >
    {@render searchContent()}
  </Command.Dialog>
{/if}

<script lang="ts">
  import { goto } from "$app/navigation";
  import EntityIcon from "$lib/components/EntityIcon.svelte";
  import * as Command from "$lib/components/ui/command";
  import { linkActiveDescendant } from "$lib/components/ui/command/link-active-descendant";
  import { scrollSelectedIntoView } from "$lib/components/ui/command/scroll-selected-into-view";
  import * as Drawer from "$lib/components/ui/drawer";
  import { entityRegistry, type EntityId } from "$lib/entities/registry";
  import { searchPalette } from "$lib/search/palette-state.svelte";
  import { oldValorathNotice } from "$lib/components/old-valorath/notice-state.svelte";
  import { asksAboutOldValorath } from "$lib/components/old-valorath/query";
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
  import { CircleHelp, FileText, ListFilter, type IconNode } from "lucide";

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
    // Sections and guide articles both open a part of a page as a Topic.
    section: entityRegistry.guide_topic.icon,
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

  const showNotice = $derived(
    query.trim().length >= 2 && asksAboutOldValorath(query),
  );

  function openNotice() {
    recent = rememberSearch(query);
    searchPalette.open = false;
    oldValorathNotice.open = true;
  }

  const announcement = $derived.by(() => {
    if (query.trim().length < 2 || loading) return "";
    if (failed) return "Search is unavailable";
    const count = results.length + (showNotice ? 1 : 0);
    return count === 1 ? "1 result" : `${count} results`;
  });
</script>

{#snippet searchContent()}
  <div class="contents" use:linkActiveDescendant>
    <Command.Input
      bind:value={query}
      placeholder="Search items, monsters, mechanics..."
      autofocus
    />
    <div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {announcement}
    </div>
    <div class="min-h-0 overflow-hidden" use:scrollSelectedIntoView>
      <Command.List class="max-h-[min(300px,calc(85dvh-6rem))]">
        {#if showNotice}
          <Command.Item value="notice:old-valorath" onSelect={openNotice}>
            <div class="flex w-full min-w-0 items-center gap-3">
              <EntityIcon
                src={null}
                alt=""
                fallbackIcon={CircleHelp}
                size={28}
              />
              <div class="min-w-0 flex-1">
                <div class="flex min-w-0 items-center gap-3">
                  <span class="min-w-0 flex-1 truncate font-medium">
                    Old Valorath
                  </span>
                  <span class="shrink-0 text-sm text-muted-foreground">
                    Notice
                  </span>
                </div>
                <p class="mt-0.5 text-sm text-muted-foreground">
                  Why it is missing from the Compendium
                </p>
              </div>
            </div>
          </Command.Item>
        {/if}
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
                <div class="min-w-0 flex-1">
                  <div class="flex min-w-0 items-center gap-3">
                    <span class="min-w-0 flex-1 truncate font-medium">
                      {result.name}
                    </span>
                    <span class="shrink-0 text-sm text-muted-foreground">
                      {result.label}
                    </span>
                  </div>
                  {#if result.detail}
                    <p
                      class="mt-0.5 line-clamp-2 break-words text-sm text-muted-foreground"
                      title={result.detail}
                    >
                      {result.detail}
                    </p>
                  {/if}
                </div>
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
    <Drawer.Content class="max-h-[85dvh] overflow-hidden">
      <Drawer.Header class="sr-only">
        <Drawer.Title>Search the compendium</Drawer.Title>
      </Drawer.Header>
      <Command.Root
        shouldFilter={false}
        class="min-h-0 rounded-t-lg border-none bg-background"
      >
        {@render searchContent()}
      </Command.Root>
    </Drawer.Content>
  </Drawer.Root>
{:else}
  <Command.Dialog
    bind:open={searchPalette.open}
    title="Search the compendium"
    description="Search items, monsters, NPCs, zones, mechanics, and lists such as Rings or Merchants"
    shouldFilter={false}
  >
    {@render searchContent()}
  </Command.Dialog>
{/if}

<script lang="ts">
  import SearchShortcut from "$lib/components/search/SearchShortcut.svelte";
  import { searchPalette } from "$lib/search/palette-state.svelte";
  import Search from "@lucide/svelte/icons/search";
</script>

<!-- A search field look-alike that opens the site palette. -->
<button
  type="button"
  onclick={() => (searchPalette.open = true)}
  class="js-only mx-auto flex h-11 w-full max-w-md cursor-text items-center gap-2 rounded-full border bg-card px-3 text-left shadow-sm transition-shadow hover:border-foreground/20 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35 focus-visible:outline-none"
>
  <Search
    class="size-[1.15rem] shrink-0 text-muted-foreground"
    aria-hidden="true"
  />
  <span class="flex-1 text-sm text-muted-foreground">
    Search the compendium…
  </span>
  <SearchShortcut class="hidden sm:inline" />
</button>

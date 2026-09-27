<script lang="ts">
  import { searchPalette } from "$lib/search/palette-state.svelte";
  import Search from "@lucide/svelte/icons/search";
  import SearchShortcut from "./SearchShortcut.svelte";

  interface Props {
    class?: string;
  }
  let { class: className = "" }: Props = $props();
</script>

<button
  type="button"
  onclick={() => (searchPalette.open = true)}
  aria-label="Search the compendium"
  class="js-only inline-flex h-8 items-center gap-2 rounded-md border bg-card px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground {className}"
>
  <Search class="size-4" aria-hidden="true" />
  <span class="hidden sm:inline">Search</span>
  <SearchShortcut class="hidden md:inline" />
</button>

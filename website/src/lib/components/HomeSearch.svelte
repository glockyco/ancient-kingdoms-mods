<script lang="ts">
  // Visual-only search field for the home hero. Not wired to a search backend
  // yet — it is rendered behind a dev flag (see +page.svelte) so the layout can
  // be designed and reviewed without shipping a dead control to production.
  import Search from "@lucide/svelte/icons/search";
</script>

<div
  class="mx-auto flex h-11 max-w-md items-center gap-2 rounded-full border bg-card px-3 shadow-sm transition-shadow focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/35"
>
  <Search
    class="size-[1.15rem] shrink-0 text-muted-foreground"
    aria-hidden="true"
  />
  <input
    type="search"
    autocomplete="off"
    aria-label="Search the compendium"
    placeholder="Search the compendium…"
    class="w-full border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
  />
</div>

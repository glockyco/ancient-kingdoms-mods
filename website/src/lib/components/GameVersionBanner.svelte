<script lang="ts">
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import { COMPENDIUM_VERSION, COMPENDIUM_DATE } from "$lib/constants/version";
  import { compareVersions } from "$lib/version-compare";
  import type { GameVersionResult } from "$lib/steam-news-parser";

  // Fed by the home page's server load. Server-rendered into the initial
  // HTML, so there is no fetch and no flash — the live segment is part of
  // the first paint when the upstream call succeeded, and silently absent
  // when it didn't.
  let { live }: { live: GameVersionResult } = $props();

  const isBehind = $derived(
    live.ok ? compareVersions(live.version, COMPENDIUM_VERSION) > 0 : false,
  );
</script>

<p
  class="text-sm text-muted-foreground flex flex-col items-center sm:flex-row sm:justify-center sm:gap-2"
>
  <span>Updated for v{COMPENDIUM_VERSION} ({COMPENDIUM_DATE})</span>
  {#if live.ok}
    <span class="hidden sm:inline" aria-hidden="true">·</span>
    <a
      href={live.url}
      target="_blank"
      rel="noopener noreferrer"
      class={isBehind
        ? "text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
        : "hover:underline inline-flex items-center gap-1"}
      aria-label={isBehind
        ? "Compendium is behind the live game version. Open Steam announcement."
        : "Open Steam announcement"}
    >
      Game on v{live.version}
      {#if isBehind}
        <TriangleAlert class="h-3.5 w-3.5" aria-hidden="true" />
      {/if}
    </a>
  {/if}
</p>

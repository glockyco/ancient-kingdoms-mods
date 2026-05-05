<script lang="ts">
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import { COMPENDIUM_VERSION } from "$lib/constants/version";
  import { compareVersions } from "$lib/version-compare";
  import type { GameVersionResult } from "$lib/steam-news-parser";

  // Fed by the home page's server load. Server-rendered into the initial
  // HTML, so there is no fetch and no flash — the live segment is part of
  // the first paint when the upstream call succeeded, and silently absent
  // when it didn't. `checkedAt` is the ISO date (YYYY-MM-DD, UTC) of the
  // request that produced this render; it surfaces freshness to humans and
  // to crawlers via a `<time datetime>` element.
  let { live, checkedAt }: { live: GameVersionResult; checkedAt: string } =
    $props();

  const isBehind = $derived(
    live.ok ? compareVersions(live.version, COMPENDIUM_VERSION) > 0 : false,
  );
</script>

<p
  class="text-sm text-muted-foreground flex flex-col items-center sm:flex-row sm:justify-center sm:gap-2"
>
  <span>Updated for v{COMPENDIUM_VERSION}</span>
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
      Game at v{live.version}
      {#if isBehind}
        <TriangleAlert class="h-3.5 w-3.5" aria-hidden="true" />
      {/if}
    </a>
  {/if}
  <span class="hidden sm:inline" aria-hidden="true">·</span>
  <span>Checked on <time datetime={checkedAt}>{checkedAt}</time></span>
</p>

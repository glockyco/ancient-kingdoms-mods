<script lang="ts">
  import { onMount } from "svelte";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import { COMPENDIUM_VERSION, COMPENDIUM_DATE } from "$lib/constants/version";
  import { compareVersions } from "$lib/version-compare";
  import type { GameVersionResult } from "$lib/steam-news-parser";

  type CachedResult = {
    result: GameVersionResult;
    fetchedAt: number;
  };

  const SESSION_KEY = "gameVersion";
  const TTL_MS = 15 * 60 * 1000;

  let live = $state<GameVersionResult | null>(null);

  function readCache(): GameVersionResult | null {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const cached = JSON.parse(raw) as CachedResult;
      if (Date.now() - cached.fetchedAt > TTL_MS) return null;
      return cached.result;
    } catch {
      return null;
    }
  }

  function writeCache(result: GameVersionResult): void {
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ result, fetchedAt: Date.now() }),
      );
    } catch {
      // sessionStorage may be unavailable (private mode, quota); ignore.
    }
  }

  onMount(async () => {
    const cached = readCache();
    if (cached) {
      live = cached;
      return;
    }
    try {
      const r = await fetch("/api/game-version");
      if (!r.ok) {
        live = { ok: false };
        return;
      }
      const data = (await r.json()) as GameVersionResult;
      live = data;
      writeCache(data);
    } catch {
      live = { ok: false };
    }
  });

  const isBehind = $derived(
    live?.ok ? compareVersions(live.version, COMPENDIUM_VERSION) > 0 : false,
  );
</script>

<p
  class="text-sm text-muted-foreground flex flex-col sm:flex-row sm:items-center sm:justify-center sm:gap-2"
>
  <span>Updated for v{COMPENDIUM_VERSION} ({COMPENDIUM_DATE})</span>
  {#if live?.ok}
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

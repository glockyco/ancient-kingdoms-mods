<script lang="ts">
  import "../app.css";
  import JsonLd from "$lib/components/JsonLd.svelte";
  import {
    buildOrganization,
    buildPerson,
    buildWebSite,
  } from "$lib/seo/jsonld";
  import { ModeWatcher, setMode } from "mode-watcher";
  import { beforeNavigate } from "$app/navigation";
  import { page } from "$app/state";
  import SearchPalette from "$lib/components/search/SearchPalette.svelte";
  import { searchPalette } from "$lib/search/palette-state.svelte";
  import LoadingOverlay from "$lib/components/LoadingOverlay.svelte";
  import { onMount } from "svelte";
  import { getNormalizedUrlSearch } from "$lib/utils/url";

  let { children } = $props();

  const websiteNode = buildWebSite();
  const organizationNode = buildOrganization();
  const personNode = buildPerson();

  onMount(() => {
    // Allow forcing theme via URL parameter (e.g. ?theme=dark for embeds)
    const themeParam = new URLSearchParams(getNormalizedUrlSearch()).get(
      "theme",
    );
    if (themeParam === "dark" || themeParam === "light") {
      setMode(themeParam);
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/service-worker.js", {
        type: "module",
      });
    }
  });

  // The map binds the same shortcut to its own search, which keeps map
  // placements and moves the map to the selected result.
  function handleKeydown(event: KeyboardEvent) {
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") {
      return;
    }
    if (page.url.pathname === "/map" || page.url.pathname.startsWith("/map/")) {
      return;
    }
    event.preventDefault();
    searchPalette.open = !searchPalette.open;
  }

  // Auto-update service worker on navigation
  beforeNavigate(async () => {
    if (!("serviceWorker" in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    if (registration.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
  });
</script>

<svelte:head>
  <noscript>
    <style>
      .loading-overlay,
      .js-only {
        display: none !important;
      }
    </style>
  </noscript>
</svelte:head>

<JsonLd node={websiteNode} />
<JsonLd node={organizationNode} />
<JsonLd node={personNode} />

<svelte:window onkeydown={handleKeydown} />

<ModeWatcher />
<LoadingOverlay />
<SearchPalette />
<main>
  {@render children()}
</main>

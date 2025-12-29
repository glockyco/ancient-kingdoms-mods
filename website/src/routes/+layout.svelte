<script lang="ts">
  import "../app.css";
  import { ModeWatcher } from "mode-watcher";
  import { beforeNavigate } from "$app/navigation";
  import LoadingOverlay from "$lib/components/LoadingOverlay.svelte";
  import { onMount } from "svelte";

  let { children } = $props();

  onMount(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/service-worker.js", {
        type: "module",
      });
    }
  });

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

<ModeWatcher />
<LoadingOverlay />

{@render children()}

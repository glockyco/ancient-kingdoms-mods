<script lang="ts">
  import "../app.css";
  import { ModeWatcher } from "mode-watcher";
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

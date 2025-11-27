<script lang="ts">
  import "../app.css";
  import favicon from "$lib/assets/favicon.svg";
  import { ModeWatcher } from "mode-watcher";
  import LoadingOverlay from "$lib/components/LoadingOverlay.svelte";

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
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

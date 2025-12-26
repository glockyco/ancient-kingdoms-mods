<script lang="ts">
  import MapLink from "$lib/components/MapLink.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Altar {data.id} - Ancient Kingdoms Compendium</title>
</svelte:head>

<div class="container mx-auto p-8 space-y-8 max-w-5xl">
  <div>
    <div class="flex items-center gap-3 mb-4">
      <h1 class="text-4xl font-bold">Altar: {data.id}</h1>
      <MapLink entityId={data.id} entityType="altar" />
    </div>
    <p class="text-muted-foreground">This page is coming soon.</p>
  </div>
</div>

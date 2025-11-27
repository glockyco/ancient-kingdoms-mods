<script lang="ts">
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Gather Item {data.id} - Ancient Kingdoms Compendium</title>
</svelte:head>

<div class="container mx-auto p-8 space-y-8 max-w-5xl">
  <div>
    <h1 class="text-4xl font-bold mb-4">Gather Item: {data.id}</h1>
    <p class="text-muted-foreground">This page is coming soon.</p>
  </div>
</div>

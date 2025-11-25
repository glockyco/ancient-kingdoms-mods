<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Zone {data.id} - Ancient Kingdoms Compendium</title>
</svelte:head>

<div class="container mx-auto p-8 space-y-8 max-w-5xl">
  <div>
    <Button href="/items" variant="outline" class="mb-4"
      >&larr; Back to Items</Button
    >

    <h1 class="text-4xl font-bold mb-4">Zone: {data.id}</h1>
    <p class="text-muted-foreground">This page is coming soon.</p>
  </div>
</div>

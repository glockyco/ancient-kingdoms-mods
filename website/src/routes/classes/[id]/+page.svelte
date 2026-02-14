<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";

  let { data } = $props();
</script>

<svelte:head>
  <title>{data.class.name} - Ancient Kingdoms Compendium</title>
  <meta name="description" content={data.class.description} />
</svelte:head>

<div class="container mx-auto px-4 py-6">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Classes", href: "/classes" },
      {
        label: data.class.name,
        href: `/classes/${data.class.id}` as "/classes/[id]",
      },
    ]}
  />

  <h1 class="text-4xl font-bold mb-6 mt-4">{data.class.name}</h1>

  <p class="text-lg text-muted-foreground mb-6">{data.class.description}</p>

  <p class="text-muted-foreground">
    Class detail page coming soon (under construction)
  </p>
</div>

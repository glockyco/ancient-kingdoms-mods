<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import Seo from "$lib/components/Seo.svelte";

  let { data } = $props();
</script>

<Seo
  title="Pocket Compendium Changelog - Ancient Kingdoms Mod"
  description="What changed in each version of Pocket Compendium, the Ancient Kingdoms mod."
  path="/mods/changelog"
/>

<div class="container mx-auto max-w-2xl px-6 py-8 sm:px-8">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Mods", href: "/mods" },
      { label: "Changelog" },
    ]}
  />

  <header class="mt-6 space-y-3">
    <h1 class="text-3xl font-bold sm:text-4xl">Changelog</h1>
    <p class="text-lg text-pretty text-muted-foreground">
      What changed in each version of Pocket Compendium.
    </p>
  </header>

  <ol class="mt-10 space-y-8">
    {#each data.releases as release (release.version)}
      <li id="v{release.version}" class="space-y-2">
        <h2 class="flex items-baseline gap-3">
          <span class="text-lg font-semibold">{release.version}</span>
          <time class="text-sm text-muted-foreground" datetime={release.date}
            >{release.date}</time
          >
        </h2>
        <ul
          class="list-disc space-y-1 pl-5 text-pretty text-muted-foreground marker:text-muted-foreground/60"
        >
          {#each release.changes as change (change)}
            <li>{change}</li>
          {/each}
        </ul>
      </li>
    {/each}
  </ol>
</div>

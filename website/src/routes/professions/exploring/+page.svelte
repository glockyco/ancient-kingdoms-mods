<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import Compass from "@lucide/svelte/icons/compass";
  import Trophy from "@lucide/svelte/icons/trophy";
  import MapIcon from "@lucide/svelte/icons/map";
  import Castle from "@lucide/svelte/icons/castle";
  import Trees from "@lucide/svelte/icons/trees";

  let { data } = $props();
</script>

<svelte:head>
  <title>{data.profession.name} - Ancient Kingdoms Compendium</title>
  <meta
    name="description"
    content="{data.profession.description} View all areas to discover."
  />
</svelte:head>

<div class="container mx-auto p-8 space-y-8">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Professions", href: "/professions" },
      { label: data.profession.name },
    ]}
  />

  <!-- Header -->
  <div class="flex items-start gap-4">
    <div
      class="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0"
    >
      <Compass class="h-8 w-8 text-blue-500 dark:text-blue-400" />
    </div>
    <div>
      <div class="flex items-center gap-2">
        <h1 class="text-3xl font-bold">{data.profession.name}</h1>
        <span
          class="px-2 py-0.5 text-xs rounded-full bg-muted text-blue-500 dark:text-blue-400 font-medium"
        >
          Exploration
        </span>
      </div>
      <p class="text-muted-foreground mt-1">{data.profession.description}</p>

      <div class="flex flex-wrap items-center gap-4 mt-3 text-muted-foreground">
        {#if data.profession.tracking_type === "count_based" && data.profession.tracking_denominator}
          <span class="whitespace-nowrap"
            >Areas: {data.profession.tracking_denominator}</span
          >
        {/if}
        {#if data.profession.steam_achievement_id}
          <span class="flex items-center gap-1 whitespace-nowrap">
            <Trophy class="h-4 w-4" />
            Steam Achievement
          </span>
        {/if}
      </div>
    </div>
  </div>

  <!-- Areas Table -->
  <section class="space-y-4">
    <h2 class="text-xl font-semibold flex items-center gap-2">
      <MapIcon class="h-5 w-5 text-blue-500" />
      Areas to Discover ({data.areas.length})
    </h2>
    <div class="rounded-lg border overflow-x-auto">
      <table class="w-full whitespace-nowrap">
        <thead class="bg-muted/50">
          <tr>
            <th class="p-3 w-10"></th>
            <th class="text-left p-3 font-medium">Zone</th>
            <th class="text-left p-3 font-medium">Area</th>
            <th class="text-right p-3 font-medium">Min Level</th>
            <th class="text-right p-3 font-medium">Max Level</th>
            <th class="text-right p-3 font-medium">Discovery EXP</th>
          </tr>
        </thead>
        <tbody>
          {#each data.areas as area (area.id)}
            <tr class="border-t hover:bg-muted/30">
              <td class="p-3">
                <div class="flex justify-center">
                  {#if area.is_dungeon}
                    <Castle class="h-4 w-4 text-purple-500" />
                  {:else}
                    <Trees class="h-4 w-4 text-green-500" />
                  {/if}
                </div>
              </td>
              <td class="p-3">
                <a
                  href="/zones/{area.zone_id}"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {area.zone_name}
                </a>
              </td>
              <td class="p-3">{area.name}</td>
              <td class="p-3 text-right">
                {#if area.level_min !== null}
                  {area.level_min}
                {:else}
                  <span class="text-muted-foreground">—</span>
                {/if}
              </td>
              <td class="p-3 text-right">
                {#if area.level_max !== null}
                  {area.level_max}
                {:else}
                  <span class="text-muted-foreground">—</span>
                {/if}
              </td>
              <td class="p-3 text-right">
                {#if area.discovery_exp}
                  {area.discovery_exp.toLocaleString()}
                {:else}
                  <span class="text-muted-foreground">—</span>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>
</div>

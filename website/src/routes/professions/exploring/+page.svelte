<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import Compass from "@lucide/svelte/icons/compass";
  import Trophy from "@lucide/svelte/icons/trophy";
  import MapIcon from "@lucide/svelte/icons/map";

  let { data } = $props();
</script>

<svelte:head>
  <title>{data.profession.name} - Ancient Kingdoms Compendium</title>
  <meta
    name="description"
    content="{data.profession.description} View all zones to discover."
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

      <div class="flex items-center gap-4 mt-3 text-muted-foreground">
        {#if data.profession.tracking_type === "count_based" && data.profession.tracking_denominator}
          <span>Progress: 0 / {data.profession.tracking_denominator} zones</span
          >
        {/if}
        {#if data.profession.steam_achievement_id}
          <span class="flex items-center gap-1">
            <Trophy class="h-4 w-4" />
            Steam Achievement
          </span>
        {/if}
      </div>
    </div>
  </div>

  <!-- Zones Table -->
  <section class="space-y-4">
    <h2 class="text-xl font-semibold flex items-center gap-2">
      <MapIcon class="h-5 w-5 text-blue-500" />
      Zones to Discover ({data.zones.length})
    </h2>
    <div class="rounded-lg border overflow-hidden">
      <table class="w-full">
        <thead class="bg-muted/50">
          <tr>
            <th class="text-left p-3 font-medium">Name</th>
            <th class="text-left p-3 font-medium">Type</th>
            <th class="text-left p-3 font-medium">Required Level</th>
            <th class="text-left p-3 font-medium">Discovery EXP</th>
          </tr>
        </thead>
        <tbody>
          {#each data.zones as zone (zone.id)}
            <tr class="border-t hover:bg-muted/30">
              <td class="p-3">
                <a
                  href="/zones/{zone.id}"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {zone.name}
                </a>
              </td>
              <td class="p-3">
                {#if zone.is_dungeon}
                  <span class="text-purple-500 font-medium">Dungeon</span>
                {:else}
                  <span class="text-muted-foreground">Overworld</span>
                {/if}
              </td>
              <td class="p-3">{zone.required_level}</td>
              <td class="p-3">
                {#if zone.discovery_exp}
                  {zone.discovery_exp.toLocaleString()}
                {:else}
                  <span class="text-muted-foreground">-</span>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>
</div>

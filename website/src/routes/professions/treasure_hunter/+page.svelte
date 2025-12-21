<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import Trophy from "@lucide/svelte/icons/trophy";
  import MapIcon from "@lucide/svelte/icons/map";
  import Gem from "@lucide/svelte/icons/gem";

  let { data } = $props();
</script>

<svelte:head>
  <title>{data.profession.name} - Ancient Kingdoms Compendium</title>
  <meta
    name="description"
    content="{data.profession
      .description} View all treasure maps and their destinations."
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
      <MapIcon class="h-8 w-8 text-amber-500 dark:text-amber-400" />
    </div>
    <div>
      <div class="flex items-center gap-2">
        <h1 class="text-3xl font-bold">{data.profession.name}</h1>
        <span
          class="px-2 py-0.5 text-xs rounded-full bg-muted text-amber-500 dark:text-amber-400 font-medium"
        >
          Exploration
        </span>
      </div>
      <p class="text-muted-foreground mt-1">{data.profession.description}</p>

      <div class="flex flex-wrap items-center gap-4 mt-3 text-muted-foreground">
        <span class="whitespace-nowrap"
          >Max Level: {data.profession.max_level}%</span
        >
        <span class="whitespace-nowrap">Skill Gain: +0.5% per treasure</span>
        {#if data.profession.steam_achievement_id}
          <span class="flex items-center gap-1 whitespace-nowrap">
            <Trophy class="h-4 w-4" />
            Achievement: {data.profession.steam_achievement_name}
          </span>
        {/if}
      </div>
    </div>
  </div>

  <!-- Treasure Chests Section -->
  <section class="space-y-4">
    <h2 class="text-xl font-semibold flex items-center gap-2">
      <MapIcon class="h-5 w-5 text-amber-500" />
      Treasure Chests ({data.chestMaps.length})
    </h2>
    <div class="rounded-lg border overflow-x-auto">
      <table class="w-full">
        <thead class="bg-muted/50">
          <tr>
            <th class="text-left p-3 font-medium">Map</th>
            <th class="text-left p-3 font-medium">Destination</th>
            <th class="text-left p-3 font-medium">Coordinates</th>
            <th class="text-left p-3 font-medium">Reward</th>
          </tr>
        </thead>
        <tbody>
          {#each data.chestMaps as map (map.id)}
            <tr class="border-t hover:bg-muted/30">
              <td class="p-3">
                <ItemLink
                  itemId={map.id}
                  itemName={map.name}
                  tooltipHtml={map.tooltip_html}
                />
              </td>
              <td class="p-3">
                <a
                  href="/zones/{map.destination_zone_id}"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {map.destination_zone_name}
                </a>
              </td>
              <td class="p-3 font-mono text-muted-foreground">
                ({Math.round(map.position_x)}, {Math.round(map.position_y)})
              </td>
              <td class="p-3">
                <ItemLink
                  itemId={map.reward_item_id}
                  itemName={map.reward_item_name}
                  tooltipHtml={map.reward_item_tooltip}
                />
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  <!-- Unique Treasures Section -->
  {#if data.uniqueMaps.length > 0}
    <section class="space-y-4">
      <h2 class="text-xl font-semibold flex items-center gap-2">
        <Gem class="h-5 w-5 text-purple-500" />
        Unique Treasures ({data.uniqueMaps.length})
      </h2>
      <div class="rounded-lg border overflow-x-auto">
        <table class="w-full">
          <thead class="bg-muted/50">
            <tr>
              <th class="text-left p-3 font-medium">Map</th>
              <th class="text-left p-3 font-medium">Destination</th>
              <th class="text-left p-3 font-medium">Coordinates</th>
              <th class="text-left p-3 font-medium">Reward</th>
            </tr>
          </thead>
          <tbody>
            {#each data.uniqueMaps as map (map.id)}
              <tr class="border-t hover:bg-muted/30">
                <td class="p-3">
                  <ItemLink
                    itemId={map.id}
                    itemName={map.name}
                    tooltipHtml={map.tooltip_html}
                  />
                </td>
                <td class="p-3">
                  <a
                    href="/zones/{map.destination_zone_id}"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {map.destination_zone_name}
                  </a>
                </td>
                <td class="p-3 font-mono text-muted-foreground">
                  ({Math.round(map.position_x)}, {Math.round(map.position_y)})
                </td>
                <td class="p-3">
                  <ItemLink
                    itemId={map.reward_item_id}
                    itemName={map.reward_item_name}
                    tooltipHtml={map.reward_item_tooltip}
                  />
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}
</div>

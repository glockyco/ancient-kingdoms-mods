<script lang="ts">
  import { formatNumber } from "$lib/utils/format";
  import Seo from "$lib/components/Seo.svelte";
  import { detailTitle } from "$lib/seo/title";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import MechanicsLink from "$lib/components/MechanicsLink.svelte";
  import Compass from "@lucide/svelte/icons/compass";
  import AchievementLink from "$lib/components/AchievementLink.svelte";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import Castle from "@lucide/svelte/icons/castle";
  import Trees from "@lucide/svelte/icons/trees";

  let { data } = $props();
</script>

<Seo
  title={detailTitle(data.profession.name, { family: "Profession" })}
  description={`${data.profession.description} All ${data.areas.length} areas with their zones, zone monster levels and discovery XP.`}
  path="/professions/exploring"
/>

<div class="container mx-auto max-w-6xl space-y-10 p-8">
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
        <span
          >Each new area adds {formatNumber(
            100 / (data.profession.tracking_denominator ?? data.areas.length),
            { decimals: 2 },
          )}% Exploring, rounded. Discover {data.profession
            .tracking_denominator} areas to reach 100%.</span
        >
        {#if data.profession.achievement_id}
          <AchievementLink
            achievementId={data.profession.achievement_id}
            achievementName={data.profession.achievement_name}
          />
        {/if}
      </div>
    </div>
  </div>

  <!-- Areas Table -->
  <section class="space-y-4">
    <h2 class="text-xl font-semibold flex items-center gap-2">
      <MapPin class="h-5 w-5 text-emerald-500" />
      Areas to discover ({data.areas.length})
    </h2>
    <div class="rounded-lg border overflow-x-auto">
      <table class="w-full whitespace-nowrap">
        <thead class="bg-muted/50">
          <tr>
            <th class="p-3 font-medium">Type</th>
            <th class="text-left p-3 font-medium">Zone</th>
            <th class="text-left p-3 font-medium">Area</th>
            <th class="text-right p-3 font-medium">Zone monster levels</th>
            <th class="text-right p-3 font-medium">Discovery XP</th>
          </tr>
        </thead>
        <tbody>
          {#each data.areas as area (area.id)}
            <tr class="border-t hover:bg-muted/30">
              <td class="p-3">
                <div class="flex justify-center">
                  {#if area.is_dungeon}
                    <Castle
                      class="h-4 w-4 text-purple-500"
                      aria-label="Dungeon"
                    />
                  {:else}
                    <Trees
                      class="h-4 w-4 text-green-500"
                      aria-label="Outdoors"
                    />
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
                {#if area.level_min !== null && area.level_max !== null}
                  {area.level_min}{#if area.level_max !== area.level_min}
                    to {area.level_max}{/if}
                {:else}
                  <span class="text-muted-foreground">Unknown</span>
                {/if}
              </td>
              <td class="p-3 text-right">
                {#if area.discovery_exp}
                  <MechanicsLink section="experience"
                    >{formatNumber(area.discovery_exp)}</MechanicsLink
                  >
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

<script lang="ts">
  import { SvelteMap } from "svelte/reactivity";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import MonsterTypeIcon from "$lib/components/MonsterTypeIcon.svelte";
  import { IconBadge } from "$lib/components/ui/icon-badge";
  import {
    formatRespawnTime,
    formatRespawnChance,
    formatSpecialSpawn,
  } from "$lib/utils/respawn";
  import Swords from "@lucide/svelte/icons/swords";
  import Trophy from "@lucide/svelte/icons/trophy";
  import Skull from "@lucide/svelte/icons/skull";
  import Castle from "@lucide/svelte/icons/castle";
  import Trees from "@lucide/svelte/icons/trees";

  let { data } = $props();

  // Build zone lookup for each monster
  const monsterZoneMap = $derived.by(() => {
    const map = new SvelteMap<
      string,
      { zone_id: string; zone_name: string; is_dungeon: boolean }[]
    >();
    for (const mz of data.monsterZones) {
      if (!map.has(mz.monster_id)) {
        map.set(mz.monster_id, []);
      }
      map.get(mz.monster_id)!.push(mz);
    }
    return map;
  });
</script>

<svelte:head>
  <title>{data.profession.name} - Ancient Kingdoms Compendium</title>
  <meta
    name="description"
    content="{data.profession
      .description} View all bosses and elite monsters for the Slayer profession."
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
      <Swords class="h-8 w-8 text-red-500 dark:text-red-400" />
    </div>
    <div>
      <div class="flex items-center gap-2">
        <h1 class="text-3xl font-bold">{data.profession.name}</h1>
        <span
          class="px-2 py-0.5 text-xs rounded-full bg-muted text-red-500 dark:text-red-400 font-medium"
        >
          Combat
        </span>
      </div>
      <p class="text-muted-foreground mt-1">{data.profession.description}</p>

      <div class="flex flex-wrap items-center gap-4 mt-3 text-muted-foreground">
        <span class="whitespace-nowrap"
          >Max Level: {data.profession.max_level}%</span
        >
        <span class="whitespace-nowrap"
          >Skill per kill: +{data.skillGainPerKill.toFixed(4)}%</span
        >
        <span class="whitespace-nowrap">Max kills per monster: 50</span>
        {#if data.profession.steam_achievement_id}
          <span class="flex items-center gap-1 whitespace-nowrap">
            <Trophy class="h-4 w-4" />
            Achievement: {data.profession.steam_achievement_name}
          </span>
        {/if}
      </div>
    </div>
  </div>

  <!-- Monsters Table -->
  <section class="space-y-4">
    <h2 class="text-xl font-semibold flex items-center gap-2">
      <Skull class="h-5 w-5 text-red-500" />
      Bosses & Elites ({data.monsters.length})
    </h2>
    <div class="rounded-lg border overflow-x-auto">
      <table class="w-full whitespace-nowrap">
        <thead class="bg-muted/50">
          <tr>
            <th class="p-3 w-10"></th>
            <th class="text-left p-3 font-medium">Name</th>
            <th class="text-right p-3 font-medium">Level</th>
            <th class="text-right p-3 font-medium">Respawn</th>
            <th class="text-right p-3 font-medium">Chance</th>
            <th class="text-right p-3 font-medium">Special</th>
            <th class="text-right p-3 font-medium">Zone</th>
            <th class="text-right p-3 font-medium">Skill Gain</th>
          </tr>
        </thead>
        <tbody>
          {#each data.monsters as monster (monster.id)}
            {@const zones = monsterZoneMap.get(monster.id) ?? []}
            {@const hasVariance = monster.level_min !== monster.level_max}
            <tr class="border-t hover:bg-muted/30">
              <td class="p-3">
                <div class="flex justify-center">
                  <MonsterTypeIcon
                    isBoss={monster.is_boss}
                    isElite={monster.is_elite}
                  />
                </div>
              </td>
              <td class="p-3">
                <a
                  href="/monsters/{monster.id}"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {monster.name}
                </a>
              </td>
              <td class="p-3 text-right">
                {monster.level_min}<span class={hasVariance ? "" : "invisible"}
                  >+</span
                >
              </td>
              <td class="p-3 text-right">{formatRespawnTime(monster)}</td>
              <td class="p-3 text-right">{formatRespawnChance(monster)}</td>
              <td class="p-3 text-right">{formatSpecialSpawn(monster)}</td>
              <td class="p-3 text-right">
                {#if zones.length > 0}
                  <div class="flex gap-1 justify-end">
                    <IconBadge
                      href="/zones/{zones[0].zone_id}"
                      icon={zones[0].is_dungeon ? Castle : Trees}
                      iconClass={zones[0].is_dungeon
                        ? "text-purple-500"
                        : "text-green-500"}
                    >
                      {zones[0].zone_name}
                    </IconBadge>
                    {#if zones.length > 1}
                      <span class="text-muted-foreground text-xs self-center"
                        >+{zones.length - 1}</span
                      >
                    {/if}
                  </div>
                {:else}
                  <span class="text-muted-foreground">—</span>
                {/if}
              </td>
              <td class="p-3 text-right">
                <span class="font-mono text-green-600 dark:text-green-400">
                  +{data.skillGainPerKill.toFixed(4)}%
                </span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>
</div>

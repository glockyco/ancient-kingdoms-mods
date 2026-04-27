<script lang="ts">
  import Seo from "$lib/components/Seo.svelte";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import QuestTypeBadge from "$lib/components/QuestTypeBadge.svelte";
  import { getClassConfig } from "$lib/utils/classes";
  import Scroll from "@lucide/svelte/icons/scroll";
  import Trophy from "@lucide/svelte/icons/trophy";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import Store from "@lucide/svelte/icons/store";

  let { data } = $props();

  type PlayerClass =
    | "Warrior"
    | "Cleric"
    | "Ranger"
    | "Rogue"
    | "Wizard"
    | "Druid";

  const allClasses: PlayerClass[] = [
    "Warrior",
    "Cleric",
    "Ranger",
    "Rogue",
    "Wizard",
    "Druid",
  ];

  let selectedClass = $state<PlayerClass>("Warrior");
</script>

<Seo
  title={`${data.profession.name} - Ancient Kingdoms Compendium`}
  description={`${data.profession.description} View all adventurer quests.`}
  path="/professions/adventuring"
/>

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
      <Scroll class="h-8 w-8 text-orange-500 dark:text-orange-400" />
    </div>
    <div>
      <div class="flex items-center gap-2">
        <h1 class="text-3xl font-bold">{data.profession.name}</h1>
        <span
          class="px-2 py-0.5 text-xs rounded-full bg-muted text-orange-500 dark:text-orange-400 font-medium"
        >
          Exploration
        </span>
      </div>
      <p class="text-muted-foreground mt-1">{data.profession.description}</p>

      <div class="flex items-center gap-4 mt-3 text-muted-foreground">
        <span>Max Level: {data.profession.max_level}%</span>
        {#if data.profession.steam_achievement_id}
          <span class="flex items-center gap-1">
            <Trophy class="h-4 w-4" />
            Achievement: {data.profession.steam_achievement_name}
          </span>
        {/if}
      </div>
    </div>
  </div>

  <!-- Quest Givers -->
  {#if data.questGivers.length > 0}
    <section class="space-y-4">
      <h2 class="text-xl font-semibold flex items-center gap-2">
        <MapPin class="h-5 w-5 text-emerald-500" />
        Quest Givers ({data.questGivers.length})
      </h2>
      <div class="rounded-lg border overflow-x-auto">
        <table class="w-full whitespace-nowrap">
          <thead class="bg-muted/50">
            <tr>
              <th class="text-left p-3 font-medium">Name</th>
              <th class="text-left p-3 font-medium">Zone</th>
              <th class="text-left p-3 font-medium">Area</th>
              <th class="text-left p-3 font-medium">Coordinates</th>
            </tr>
          </thead>
          <tbody>
            {#each data.questGivers as giver (giver.npc_id)}
              <tr class="border-t hover:bg-muted/30">
                <td class="p-3">
                  <a
                    href="/npcs/{giver.npc_id}"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {giver.npc_name}
                  </a>
                </td>
                <td class="p-3">
                  <a
                    href="/zones/{giver.zone_id}"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {giver.zone_name}
                  </a>
                </td>
                <td class="p-3 text-muted-foreground">
                  {giver.sub_zone_name ?? "—"}
                </td>
                <td class="p-3 font-mono text-muted-foreground">
                  ({Math.round(giver.position_x)}, {Math.round(
                    giver.position_y,
                  )})
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}

  <!-- Merchants -->
  {#if data.merchants.length > 0}
    <section class="space-y-4">
      <h2 class="text-xl font-semibold flex items-center gap-2">
        <Store class="h-5 w-5 text-amber-500" />
        Merchants ({data.merchants.length})
      </h2>
      <div class="rounded-lg border overflow-x-auto">
        <table class="w-full whitespace-nowrap">
          <thead class="bg-muted/50">
            <tr>
              <th class="text-left p-3 font-medium">Name</th>
              <th class="text-left p-3 font-medium">Zone</th>
              <th class="text-left p-3 font-medium">Area</th>
              <th class="text-left p-3 font-medium">Coordinates</th>
            </tr>
          </thead>
          <tbody>
            {#each data.merchants as merchant (merchant.npc_id)}
              <tr class="border-t hover:bg-muted/30">
                <td class="p-3">
                  <a
                    href="/npcs/{merchant.npc_id}"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {merchant.npc_name}
                  </a>
                </td>
                <td class="p-3">
                  <a
                    href="/zones/{merchant.zone_id}"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {merchant.zone_name}
                  </a>
                </td>
                <td class="p-3 text-muted-foreground">
                  {merchant.sub_zone_name ?? "—"}
                </td>
                <td class="p-3 font-mono text-muted-foreground">
                  ({Math.round(merchant.position_x)}, {Math.round(
                    merchant.position_y,
                  )})
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}

  <!-- Quests Table -->
  <section class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <h2 class="text-xl font-semibold flex items-center gap-2">
        <Scroll class="h-5 w-5 text-orange-500" />
        Adventurer Quests ({data.quests.length})
      </h2>
      <div class="flex flex-wrap gap-1">
        {#each allClasses as playerClass (playerClass)}
          {@const config = getClassConfig(playerClass)}
          <button
            class="px-2 py-1 rounded text-xs font-medium transition-colors"
            style="background-color: {selectedClass === playerClass
              ? config.color
              : 'transparent'}; color: {selectedClass === playerClass
              ? 'white'
              : config.color}; border: 1px solid {config.color};"
            onclick={() => (selectedClass = playerClass)}
          >
            {config.abbrev}
          </button>
        {/each}
      </div>
    </div>
    <div class="rounded-lg border overflow-x-auto">
      <table class="w-full whitespace-nowrap">
        <thead class="bg-muted/50">
          <tr>
            <th class="text-left p-3 font-medium">Type</th>
            <th class="text-left p-3 font-medium">Quest</th>
            <th class="text-left p-3 font-medium">Objective</th>
            <th class="text-left p-3 font-medium">Rewards</th>
            <th class="text-left p-3 font-medium">Class Reward</th>
            <th class="text-right p-3 font-medium">Adventuring</th>
            <th class="text-right p-3 font-medium">Level</th>
          </tr>
        </thead>
        <tbody>
          {#each data.quests as quest (quest.id)}
            <tr class="border-t hover:bg-muted/30">
              <td class="p-3">
                <QuestTypeBadge type={quest.display_type} />
              </td>
              <td class="p-3">
                <a
                  href="/quests/{quest.id}"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {quest.name}
                </a>
              </td>
              <td class="p-3">
                {#if quest.objective}
                  {#if quest.objective.type === "kill"}
                    <a
                      href="/monsters/{quest.objective.target_id}"
                      class="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {quest.objective.target_name}
                    </a>
                    <span class="text-muted-foreground">
                      ×{quest.objective.amount}
                    </span>
                  {:else}
                    <a
                      href="/items/{quest.objective.target_id}"
                      class="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {quest.objective.target_name}
                    </a>
                    <span class="text-muted-foreground">
                      ×{quest.objective.amount}
                    </span>
                  {/if}
                {:else}
                  <span class="text-muted-foreground">—</span>
                {/if}
              </td>
              <td class="p-3">
                {#each quest.reward_items.filter((i) => i.class_specific === null) as item (item.item_id)}
                  <a
                    href="/items/{item.item_id}"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {item.item_name}
                  </a>
                {:else}
                  <span class="text-muted-foreground">—</span>
                {/each}
              </td>
              <td class="p-3">
                {#each quest.reward_items.filter((i) => i.class_specific === selectedClass) as item (item.item_id)}
                  <a
                    href="/items/{item.item_id}"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {item.item_name}
                  </a>
                {:else}
                  <span class="text-muted-foreground">—</span>
                {/each}
              </td>
              <td class="p-3 text-right">
                {#if quest.reward_adventuring_skill > 0}
                  <span class="text-green-600 dark:text-green-400">
                    +{(quest.reward_adventuring_skill * 100).toFixed(2)}%
                  </span>
                {:else}
                  <span class="text-muted-foreground">—</span>
                {/if}
              </td>
              <td class="p-3 text-right">{quest.level_recommended}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>
</div>

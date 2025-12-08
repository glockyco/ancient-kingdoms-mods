<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import Swords from "@lucide/svelte/icons/swords";
  import Trophy from "@lucide/svelte/icons/trophy";

  let { data } = $props();

  // Skill level state (0-100%)
  let skillLevel = $state(0);

  // Skill gain chance: 70% at 0 skill, down to 20% at 100% skill
  function getSkillGainChance(): number {
    const skill = skillLevel / 100;
    return Math.max(0, (0.7 - skill / 2) * 100);
  }

  // Skill gain amount: Random(1-2) / 10000 + level / 100000
  // Returns [min, max] as percentages
  function getSkillGainAmount(monsterLevel: number): [number, number] {
    const baseMin = 1 / 10000;
    const baseMax = 2 / 10000;
    const levelBonus = monsterLevel / 100000;
    return [(baseMin + levelBonus) * 100, (baseMax + levelBonus) * 100];
  }
</script>

<svelte:head>
  <title>{data.profession.name} - Ancient Kingdoms Compendium</title>
  <meta
    name="description"
    content="{data.profession
      .description} View all hunt targets for the Hunter profession."
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

      <div class="flex items-center gap-4 mt-3 text-muted-foreground">
        <span>Max Level: {data.profession.max_level}%</span>
        {#if data.profession.steam_achievement_id}
          <span class="flex items-center gap-1">
            <Trophy class="h-4 w-4" />
            Steam Achievement
          </span>
        {/if}
      </div>
    </div>
  </div>

  <!-- Calculator -->
  <section class="space-y-4">
    <h2 class="text-xl font-semibold">Calculator</h2>
    <div
      class="rounded-lg border p-3 flex flex-wrap items-center gap-x-6 gap-y-2"
    >
      <div class="flex items-center gap-3">
        <label for="skill-slider" class="shrink-0">Hunter Skill:</label>
        <input
          id="skill-slider"
          type="range"
          min="0"
          max="100"
          step="1"
          bind:value={skillLevel}
          class="w-32 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
        />
        <span class="font-mono w-12">{skillLevel}%</span>
      </div>
      <div class="flex items-center gap-2 text-muted-foreground">
        <span>Skill gain chance:</span>
        <span class="font-mono text-foreground"
          >{getSkillGainChance().toFixed(0)}%</span
        >
        <span class="text-xs">(per kill)</span>
      </div>
    </div>
  </section>

  <!-- Monsters Table -->
  <section class="space-y-4">
    <h2 class="text-xl font-semibold">
      Hunt Targets ({data.monsters.length})
    </h2>
    <div class="rounded-lg border overflow-hidden">
      <table class="w-full">
        <thead class="bg-muted/50">
          <tr>
            <th class="text-left p-3 font-medium">Name</th>
            <th class="text-left p-3 font-medium">Level</th>
            <th class="text-left p-3 font-medium">Skill Gain</th>
          </tr>
        </thead>
        <tbody>
          {#each data.monsters as monster (monster.id)}
            {@const [minGain, maxGain] = getSkillGainAmount(monster.level)}
            <tr class="border-t hover:bg-muted/30">
              <td class="p-3">
                <a
                  href="/monsters/{monster.id}"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {monster.name}
                </a>
              </td>
              <td class="p-3">{monster.level}</td>
              <td class="p-3">
                <span class="font-mono">
                  {minGain.toFixed(2)}% – {maxGain.toFixed(2)}%
                </span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>
</div>

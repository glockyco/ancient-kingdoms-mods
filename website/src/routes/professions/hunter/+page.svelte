<script lang="ts">
  import Seo from "$lib/components/Seo.svelte";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import Trophy from "@lucide/svelte/icons/trophy";
  import CalculatorIcon from "@lucide/svelte/icons/calculator";
  import Crosshair from "@lucide/svelte/icons/crosshair";

  let { data } = $props();

  // Skill level state (0-100%)
  let skillLevel = $state(0);

  // Monster level for calculator (1-60)
  let monsterLevel = $state(1);

  // Skill gain chance: 70% at 0 skill, down to 20% at 100% skill
  function getSkillGainChance(): number {
    const skill = skillLevel / 100;
    return Math.max(0, (0.7 - skill / 2) * 100);
  }

  // Skill gain amount: Random(1-2) / 10000 + level / 100000
  // Returns [min, max] as percentages
  function getSkillGainAmount(level: number): [number, number] {
    const baseMin = 1 / 10000;
    const baseMax = 2 / 10000;
    const levelBonus = level / 100000;
    return [(baseMin + levelBonus) * 100, (baseMax + levelBonus) * 100];
  }

  // Get skill gain range for a monster with level range
  function getSkillGainRange(
    levelMin: number,
    levelMax: number,
  ): [number, number] {
    const [minAtMinLevel] = getSkillGainAmount(levelMin);
    const [, maxAtMaxLevel] = getSkillGainAmount(levelMax);
    return [minAtMinLevel, maxAtMaxLevel];
  }
</script>

<Seo
  title={`${data.profession.name} - Ancient Kingdoms`}
  description={`${data.profession.description} View all hunt targets for the Hunter profession.`}
  path="/professions/hunter"
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
      <Crosshair class="h-8 w-8 text-red-500 dark:text-red-400" />
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
            Achievement: {data.profession.steam_achievement_name}
          </span>
        {/if}
      </div>
    </div>
  </div>

  <!-- Calculator -->
  <section class="space-y-4">
    <h2 class="text-xl font-semibold flex items-center gap-2">
      <CalculatorIcon class="h-5 w-5 text-cyan-500" />
      Calculator
    </h2>
    <div
      class="rounded-lg border p-3 flex flex-wrap items-center gap-x-6 gap-y-3"
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
      <div class="flex items-center gap-3">
        <label for="level-slider" class="shrink-0">Monster Level:</label>
        <input
          id="level-slider"
          type="range"
          min="1"
          max="60"
          step="1"
          bind:value={monsterLevel}
          class="w-32 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
        />
        <span class="font-mono w-8">{monsterLevel}</span>
      </div>
      <div class="flex items-center gap-2 text-muted-foreground">
        <span>Skill gain chance:</span>
        <span class="font-mono text-foreground"
          >{getSkillGainChance().toFixed(0)}%</span
        >
        <span class="text-xs">(per kill)</span>
      </div>
      <div class="flex items-center gap-2 text-muted-foreground">
        <span>Skill gain:</span>
        <span class="font-mono text-foreground"
          >{getSkillGainAmount(monsterLevel)[0].toFixed(3)}% – {getSkillGainAmount(
            monsterLevel,
          )[1].toFixed(3)}%</span
        >
      </div>
    </div>
  </section>

  <!-- Monsters Table -->
  <section class="space-y-4">
    <h2 class="text-xl font-semibold flex items-center gap-2">
      <Crosshair class="h-5 w-5 text-red-500" />
      Hunt Targets ({data.monsters.length})
    </h2>
    <div class="rounded-lg border overflow-x-auto">
      <table class="w-full whitespace-nowrap">
        <thead class="bg-muted/50">
          <tr>
            <th class="text-left p-3 font-medium">Name</th>
            <th class="text-right p-3 font-medium">Min Lv</th>
            <th class="text-right p-3 font-medium">Max Lv</th>
            <th class="text-right p-3 font-medium">Skill Gain</th>
          </tr>
        </thead>
        <tbody>
          {#each data.monsters as monster (monster.id)}
            {@const [minGain, maxGain] = getSkillGainRange(
              monster.level_min,
              monster.level_max,
            )}
            <tr class="border-t hover:bg-muted/30">
              <td class="p-3">
                <a
                  href="/monsters/{monster.id}"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {monster.name}
                </a>
              </td>
              <td class="p-3 text-right">{monster.level_min}</td>
              <td class="p-3 text-right">{monster.level_max}</td>
              <td class="p-3 text-right">
                <span class="font-mono">
                  {minGain.toFixed(3)}% – {maxGain.toFixed(3)}%
                </span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>
</div>

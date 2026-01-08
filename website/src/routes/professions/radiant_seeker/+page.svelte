<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import Trophy from "@lucide/svelte/icons/trophy";
  import CalculatorIcon from "@lucide/svelte/icons/calculator";
  import Sparkles from "@lucide/svelte/icons/sparkles";

  let { data } = $props();

  // Skill level state (0-100%)
  let skillLevel = $state(0);

  // Skill gain chance: 90% at 0 skill, down to 40% at 100% skill (updated v0.9.3.6)
  function getSkillGainChance(): number {
    const skill = skillLevel / 100;
    return Math.max(0, (0.9 - skill / 2) * 100);
  }

  // Radiant Aether drop chance: radiantSeekerLevel * 5%
  function getRadiantAetherChance(): number {
    const skill = skillLevel / 100;
    return skill * 5;
  }
</script>

<svelte:head>
  <title>{data.profession.name} - Ancient Kingdoms Compendium</title>
  <meta
    name="description"
    content="{data.profession.description} View all radiant spark locations."
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
      <Sparkles class="h-8 w-8 text-yellow-500 dark:text-yellow-400" />
    </div>
    <div>
      <div class="flex items-center gap-2">
        <h1 class="text-3xl font-bold">{data.profession.name}</h1>
        <span
          class="px-2 py-0.5 text-xs rounded-full bg-muted text-yellow-500 dark:text-yellow-400 font-medium"
        >
          Gathering
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
      class="rounded-lg border p-3 flex flex-wrap items-center gap-x-6 gap-y-2"
    >
      <div class="flex items-center gap-3">
        <label for="skill-slider" class="shrink-0">Radiant Seeker Skill:</label>
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
        <span class="text-xs">(per success)</span>
      </div>
      <div class="flex items-center gap-2 text-muted-foreground">
        <a
          href="/items/radiant_aether"
          class="text-blue-600 dark:text-blue-400 hover:underline"
          >Radiant Aether</a
        >
        <span>chance:</span>
        <span class="font-mono text-foreground"
          >{getRadiantAetherChance().toFixed(1)}%</span
        >
      </div>
    </div>
  </section>

  <!-- Resources Table -->
  <section class="space-y-4">
    <h2 class="text-xl font-semibold flex items-center gap-2">
      <Sparkles class="h-5 w-5 text-purple-500" />
      Radiant Sparks ({data.resources.length})
    </h2>
    <div class="rounded-lg border overflow-hidden">
      <table class="w-full">
        <thead class="bg-muted/50">
          <tr>
            <th class="text-left p-3 font-medium">Name</th>
            <th class="text-left p-3 font-medium">Skill Gain</th>
          </tr>
        </thead>
        <tbody>
          {#each data.resources as resource (resource.id)}
            <tr class="border-t hover:bg-muted/30">
              <td class="p-3">
                <a
                  href="/gather-items/{resource.id}"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {resource.name}
                </a>
              </td>
              <td class="p-3">
                <span class="font-mono">0.10% – 0.30%</span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>
</div>

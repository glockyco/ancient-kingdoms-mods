<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import Pickaxe from "@lucide/svelte/icons/pickaxe";
  import Trophy from "@lucide/svelte/icons/trophy";
  import CalculatorIcon from "@lucide/svelte/icons/calculator";
  import Gem from "@lucide/svelte/icons/gem";

  let { data } = $props();

  // Skill level state (0-100%)
  let skillLevel = $state(0);
  let pickaxeQuality = $state(0);

  // Quality names for pickaxe
  const qualityNames = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];

  // Roman numerals for level display
  const romanNumerals = ["I", "II", "III", "IV", "V"];

  // Create a map of tier -> resource count
  const resourceCountMap = $derived(
    new Map(data.resourceCounts.map((rc) => [rc.tier, rc.count])),
  );

  // Mining success chance formula from game code
  // Takes pickaxe quality (0-4) and skill level (0-100%)
  function getSuccessChance(resourceLevel: number): number {
    const skill = skillLevel / 100;
    switch (resourceLevel) {
      case 0:
        return Math.min(100, (0.8 + pickaxeQuality + skill) * 100);
      case 1:
        return Math.min(100, (0.1 + pickaxeQuality * 0.2 + skill) * 100);
      case 2:
        return Math.min(100, (pickaxeQuality * 0.15 + skill * 0.6) * 100);
      case 3:
        return Math.min(100, (pickaxeQuality * 0.1 + skill * 0.4) * 100);
      default:
        return Math.min(100, (pickaxeQuality * 0.05 + skill * 0.2) * 100);
    }
  }

  function getSuccessChanceColor(chance: number): string {
    if (chance >= 100) return "text-green-500";
    if (chance >= 75) return "text-lime-500";
    if (chance >= 50) return "text-yellow-500";
    if (chance >= 25) return "text-orange-500";
    return "text-red-500";
  }

  // Skill gain chance: 70% at 0 skill, down to 20% at 100% skill
  function getSkillGainChance(): number {
    const skill = skillLevel / 100;
    return Math.max(0, (0.7 - skill / 2) * 100);
  }

  // Skill gain amount: Random(1-3) / (successChance * 1000)
  // Returns [min, max] as percentages
  function getSkillGainAmount(successChance: number): [number, number] {
    if (successChance <= 0) return [0, 0];
    const successFraction = successChance / 100;
    const min = (1 / (successFraction * 1000)) * 100;
    const max = (3 / (successFraction * 1000)) * 100;
    return [min, max];
  }

  // Effortless thresholds: Tier I at 25%, Tier II at 50%, Tier III at 75%
  function isEffortless(resourceLevel: number): boolean {
    const skill = skillLevel / 100;
    switch (resourceLevel) {
      case 0:
        return skill >= 0.25;
      case 1:
        return skill >= 0.5;
      case 2:
        return skill >= 0.75;
      default:
        return false;
    }
  }
</script>

<svelte:head>
  <title>{data.profession.name} - Ancient Kingdoms Compendium</title>
  <meta
    name="description"
    content="{data.profession
      .description} View ores and minerals you can mine with the Mining skill."
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
      <Pickaxe class="h-8 w-8 text-green-500 dark:text-green-400" />
    </div>
    <div>
      <div class="flex items-center gap-2">
        <h1 class="text-3xl font-bold">{data.profession.name}</h1>
        <span
          class="px-2 py-0.5 text-xs rounded-full bg-muted text-green-500 dark:text-green-400 font-medium"
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
            Steam Achievement
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
        <label for="skill-slider" class="shrink-0">Mining Skill:</label>
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
        <label for="pickaxe-slider" class="shrink-0">Pickaxe:</label>
        <input
          id="pickaxe-slider"
          type="range"
          min="0"
          max="4"
          step="1"
          bind:value={pickaxeQuality}
          class="w-32 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
        />
        <span class="font-mono w-24">{qualityNames[pickaxeQuality]}</span>
      </div>
      <div class="flex items-center gap-2 text-muted-foreground">
        <span>Skill gain chance:</span>
        <span class="font-mono text-foreground"
          >{getSkillGainChance().toFixed(0)}%</span
        >
        <span class="text-xs">(per success)</span>
      </div>
    </div>
    <div class="rounded-lg border overflow-hidden">
      <table class="w-full">
        <thead class="bg-muted/50">
          <tr>
            <th class="text-left p-3 font-medium">Tier</th>
            <th class="text-left p-3 font-medium">Success</th>
            <th class="text-left p-3 font-medium">Skill Gain</th>
            <th class="text-right p-3 font-medium">Ores</th>
          </tr>
        </thead>
        <tbody>
          {#each [0, 1, 2, 3, 4] as tier (tier)}
            {@const successChance = getSuccessChance(tier)}
            {@const effortless = isEffortless(tier)}
            {@const [minGain, maxGain] = getSkillGainAmount(successChance)}
            {@const resourceCount = resourceCountMap.get(tier) ?? 0}
            <tr class="border-t hover:bg-muted/30">
              <td class="p-3 font-medium">{romanNumerals[tier]}</td>
              <td class="p-3">
                <span class="font-mono {getSuccessChanceColor(successChance)}">
                  {successChance.toFixed(0)}%
                </span>
              </td>
              <td class="p-3">
                {#if effortless}
                  <span class="text-muted-foreground italic">Effortless</span>
                {:else if successChance > 0}
                  <span class="font-mono"
                    >{minGain.toFixed(2)}% – {maxGain.toFixed(2)}%</span
                  >
                {:else}
                  <span class="text-muted-foreground">—</span>
                {/if}
              </td>
              <td class="p-3 text-right">{resourceCount}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  <!-- Ores Table -->
  <section class="space-y-4">
    <h2 class="text-xl font-semibold flex items-center gap-2">
      <Gem class="h-5 w-5 text-amber-500" />
      Ores ({data.resources.length})
    </h2>
    <div class="rounded-lg border overflow-hidden">
      <table class="w-full">
        <thead class="bg-muted/50">
          <tr>
            <th class="text-left p-3 font-medium">Name</th>
            <th class="text-left p-3 font-medium">Tier</th>
            <th class="text-left p-3 font-medium">Success</th>
            <th class="text-left p-3 font-medium">Skill Gain</th>
          </tr>
        </thead>
        <tbody>
          {#each data.resources as resource (resource.id)}
            {@const successChance = getSuccessChance(resource.level)}
            {@const effortless = isEffortless(resource.level)}
            {@const [minGain, maxGain] = getSkillGainAmount(successChance)}
            <tr class="border-t hover:bg-muted/30">
              <td class="p-3">
                <a
                  href="/gather-items/{resource.id}"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {resource.name}
                </a>
              </td>
              <td class="p-3 font-medium">
                {romanNumerals[resource.level] ?? resource.level}
              </td>
              <td class="p-3">
                <span class="font-mono {getSuccessChanceColor(successChance)}">
                  {successChance.toFixed(0)}%
                </span>
              </td>
              <td class="p-3">
                {#if effortless}
                  <span class="text-muted-foreground italic">Effortless</span>
                {:else if successChance > 0}
                  <span class="font-mono">
                    {minGain.toFixed(2)}% – {maxGain.toFixed(2)}%
                  </span>
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

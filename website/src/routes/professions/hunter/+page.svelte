<script lang="ts">
  import Seo from "$lib/components/Seo.svelte";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import AchievementLink from "$lib/components/AchievementLink.svelte";
  import * as Card from "$lib/components/ui/card";
  import GuideFacts from "$lib/components/GuideFacts.svelte";
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
        {#if data.profession.achievement_id}
          <AchievementLink
            achievementId={data.profession.achievement_id}
            achievementName={data.profession.achievement_name}
          />
        {/if}
      </div>
    </div>
  </div>

  <section class="space-y-4">
    <h2 class="text-xl font-semibold flex items-center gap-2">
      <CalculatorIcon class="h-5 w-5 text-cyan-500" />
      Calculator
    </h2>
    <div
      class="rounded-lg border p-3 flex flex-wrap items-center gap-x-6 gap-y-3"
    >
      <div class="flex items-center gap-3">
        <label for="skill-slider" class="shrink-0">Hunting Skill:</label>
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

  <Card.Root id="how-it-works" class="bg-muted/30">
    <Card.Header
      ><Card.Title class="text-xl">How hunting works</Card.Title></Card.Header
    >
    <Card.Content class="space-y-6">
      <!-- Source: server-scripts/Monster.cs:2952-2960,3051-3055 — hunting mastery gain chance starts at 70%, and each 10% Hunting adds 5 percentage points to qualifying item drops. -->
      <GuideFacts
        facts={[
          { value: "70%", label: "Skill gain chance at 0%" },
          { value: "+5 pp", label: "Rare drop chance per 10% Hunting" },
        ]}
      />
      <ol class="divide-y divide-border text-sm">
        <!-- Source: server-scripts/Monster.cs:2952-2965 — only isHunt kills advance Hunting. -->
        <li class="grid grid-cols-[1.5rem_1fr] gap-3 py-3 first:pt-0">
          <span class="tabular-nums text-muted-foreground">1</span>
          <div>
            <p class="font-medium">Choose a Hunting-journal target.</p>
            <p class="mt-0.5 text-muted-foreground">
              Other creatures do not increase Hunting skill.
            </p>
          </div>
        </li>
        <!-- Source: server-scripts/Monster.cs:2952-2965,3049-3055 — kills can raise skill and non-boss hunt drops above Normal gain a chance bonus. -->
        <li class="grid grid-cols-[1.5rem_1fr] gap-3 py-3">
          <span class="tabular-nums text-muted-foreground">2</span>
          <div>
            <p class="font-medium">Defeat the target.</p>
            <p class="mt-0.5 text-muted-foreground">
              Kills can raise Hunting skill and improve qualifying item drops.
            </p>
          </div>
        </li>
      </ol>
      <!-- Source: server-scripts/Monster.cs:2981-2982,3049-3055 — bosses use a separate drop path, and only above-Normal items on non-boss hunt targets get the bonus. -->
      <ul class="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>
          The drop bonus applies only to items above Normal quality from
          non-boss hunt targets.
        </li>
      </ul>
    </Card.Content>
  </Card.Root>
</div>

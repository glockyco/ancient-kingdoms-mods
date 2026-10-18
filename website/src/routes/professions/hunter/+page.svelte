<script lang="ts">
  import { formatPercent } from "$lib/utils/format";
  import Seo from "$lib/components/Seo.svelte";
  import { detailTitle } from "$lib/seo/title";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import AchievementLink from "$lib/components/AchievementLink.svelte";
  import CalculatorIcon from "@lucide/svelte/icons/calculator";
  import Crosshair from "@lucide/svelte/icons/crosshair";

  let { data } = $props();

  // Skill level state (0-100%)
  let skillLevel = $state(0);

  // Monster level for calculator (1-60)
  let monsterLevel = $state(1);

  // Source: server-scripts/Monster.cs:2970-2974 — Hunting gains stop at 100%.
  function getSkillGainChance(): number {
    if (skillLevel >= 100) return 0;
    const skill = skillLevel / 100;
    return Math.max(0, (0.7 - skill / 2) * 100);
  }

  // Source: server-scripts/Monster.cs:2970-2974 — Random(1-2) / 10000 + level / 100000, below the cap only.
  function getSkillGainAmount(level: number): [number, number] {
    if (skillLevel >= 100) return [0, 0];
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
  title={detailTitle(data.profession.name, { family: "Profession" })}
  description={`${data.profession.description} All ${data.monsters.length} Hunting-journal creatures, skill gains and the bonus to above-Normal item drops.`}
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

  <section id="how-it-works" class="rounded-lg border p-5 space-y-3">
    <h2 class="text-xl font-semibold">How Hunting works</h2>
    <!-- Source: server-scripts/Monster.cs:2967-2981 — only isHunt kills record Hunting and can improve the skill. -->
    <p class="text-muted-foreground">
      <span class="block"
        >Only kills of creatures in the Hunting journal can raise Hunting skill.</span
      >
    </p>
    <!-- Source: server-scripts/Monster.cs:2997-2998,3064-3069 — non-boss isHunt monsters add half the player's Hunting fraction to above-Normal item drop chances. -->
    <p class="text-muted-foreground">
      <span class="block"
        >Each 10% Hunting adds 5 percentage points to above-Normal item drop
        chances from non-boss creatures in the Hunting journal.</span
      >
    </p>
  </section>

  <!-- Calculator -->
  <section class="space-y-4">
    <h2 class="text-xl font-semibold flex items-center gap-2">
      <CalculatorIcon class="h-5 w-5 text-cyan-500" />
      Calculator
    </h2>
    <div
      class="rounded-lg border p-3 flex flex-wrap items-center gap-x-6 gap-y-3"
    >
      <div class="flex flex-wrap items-center gap-3">
        <label for="skill-slider" class="shrink-0">Hunting skill</label>
        <input
          id="skill-slider"
          type="range"
          min="0"
          max="100"
          step="1"
          bind:value={skillLevel}
          class="w-32 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
        />
        <span class="font-mono w-12 shrink-0">{skillLevel}%</span>
      </div>
      <div class="flex flex-wrap items-center gap-3">
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
        <span class="font-mono w-8 shrink-0">{monsterLevel}</span>
      </div>
      <div class="flex items-center gap-2 text-muted-foreground">
        <span>Skill gain chance:</span>
        <span class="font-mono text-foreground"
          >{formatPercent(getSkillGainChance() / 100, {
            decimals: 0,
            trailingZeros: true,
          })}</span
        >
        <span class="text-xs">(per kill)</span>
      </div>
      <div class="flex items-center gap-2 text-muted-foreground">
        <span>Skill gain:</span>
        <span class="font-mono text-foreground">
          {#if getSkillGainChance() > 0}
            {formatPercent(getSkillGainAmount(monsterLevel)[0] / 100, {
              decimals: 3,
              trailingZeros: true,
            })} – {formatPercent(getSkillGainAmount(monsterLevel)[1] / 100, {
              decimals: 3,
              trailingZeros: true,
            })}
          {:else}
            —
          {/if}
        </span>
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
            <th class="text-right p-3 font-medium">Min level</th>
            <th class="text-right p-3 font-medium">Max level</th>
            <th class="text-right p-3 font-medium">Skill Gain</th>
          </tr>
        </thead>
        <tbody>
          {#each data.monsters as monster (monster.id)}
            {@const [minGain, maxGain] = getSkillGainRange(
              monster.level_min,
              monster.level_max,
            )}
            <tr class="border-t odd:bg-muted/20 hover:bg-muted/30">
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
                  {#if maxGain > 0}
                    {formatPercent(minGain / 100, {
                      decimals: 3,
                      trailingZeros: true,
                    })} – {formatPercent(maxGain / 100, {
                      decimals: 3,
                      trailingZeros: true,
                    })}
                  {:else}
                    —
                  {/if}
                </span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>
</div>

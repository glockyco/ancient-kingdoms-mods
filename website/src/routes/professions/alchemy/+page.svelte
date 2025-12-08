<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import ObtainabilityTree from "$lib/components/ObtainabilityTree.svelte";
  import QuestTypeBadge from "$lib/components/QuestTypeBadge.svelte";
  import QuestFlagBadges from "$lib/components/QuestFlagBadges.svelte";
  import Hammer from "@lucide/svelte/icons/hammer";
  import Trophy from "@lucide/svelte/icons/trophy";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import CalculatorIcon from "@lucide/svelte/icons/calculator";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import ScrollIcon from "@lucide/svelte/icons/scroll";
  import { SvelteSet } from "svelte/reactivity";

  let { data } = $props();

  let expandedRecipes = new SvelteSet<string>();

  function toggleRecipe(recipeId: string) {
    if (expandedRecipes.has(recipeId)) {
      expandedRecipes.delete(recipeId);
    } else {
      expandedRecipes.add(recipeId);
    }
  }

  function hasIngredients(recipe: (typeof data.recipes)[0]): boolean {
    return (
      !!recipe.obtainabilityTree.recipe &&
      recipe.obtainabilityTree.recipe.materials.length > 0
    );
  }

  // Skill level state (0-100%)
  let skillLevel = $state(0);

  // Roman numerals for tier display
  const romanNumerals = ["I", "II", "III", "IV", "V"];

  // Create a map of tier -> recipe count
  const recipeCountMap = $derived(
    new Map(data.recipeCounts.map((rc) => [rc.tier, rc.count])),
  );

  // Alchemy success chance formula from game code
  function getSuccessChance(recipeLevel: number): number {
    const skill = skillLevel / 100;
    switch (recipeLevel) {
      case 0:
        return 100;
      case 1:
        return Math.min(100, (0.5 + skill * 5) * 100);
      case 2:
        return Math.min(100, (0.1 + skill) * 100);
      case 3:
        return Math.min(100, skill * 95);
      default:
        return Math.min(100, skill * 85);
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
  function isEffortless(recipeLevel: number): boolean {
    const skill = skillLevel / 100;
    switch (recipeLevel) {
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
      .description} View all potions and elixirs you can craft with the Alchemy skill."
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
      <Hammer class="h-8 w-8 text-orange-500 dark:text-orange-400" />
    </div>
    <div>
      <div class="flex items-center gap-2">
        <h1 class="text-3xl font-bold">{data.profession.name}</h1>
        <span
          class="px-2 py-0.5 text-xs rounded-full bg-muted text-orange-500 dark:text-orange-400 font-medium"
        >
          Crafting
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

  <!-- Station Locations -->
  {#if data.locations.length > 0}
    <section class="space-y-4">
      <h2 class="text-xl font-semibold flex items-center gap-2">
        <MapPin class="h-5 w-5 text-emerald-500" />
        Alchemy Table Locations ({data.locations.length})
      </h2>
      <div class="rounded-lg border overflow-hidden">
        <table class="w-full">
          <thead class="bg-muted/50">
            <tr>
              <th class="text-left p-3 font-medium">Zone</th>
              <th class="text-left p-3 font-medium">Sub-zone</th>
              <th class="text-left p-3 font-medium">Coordinates</th>
            </tr>
          </thead>
          <tbody>
            {#each data.locations as location (location.zone_id + location.sub_zone_name)}
              <tr class="border-t hover:bg-muted/30">
                <td class="p-3">
                  <a
                    href="/zones/{location.zone_id}"
                    class="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {location.zone_name}
                  </a>
                </td>
                <td class="p-3 text-muted-foreground">
                  {location.sub_zone_name ?? "—"}
                </td>
                <td class="p-3 font-mono text-muted-foreground">
                  ({Math.round(location.position_x)}, {Math.round(
                    location.position_y,
                  )})
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}

  <!-- Quest Line -->
  {#if data.quests.length > 0}
    <section class="space-y-4">
      <h2 class="text-xl font-semibold flex items-center gap-2">
        <ScrollIcon class="h-5 w-5 text-orange-500" />
        Quest Line ({data.quests.length})
      </h2>
      <div class="rounded-lg border overflow-hidden">
        <table class="w-full">
          <thead class="bg-muted/50">
            <tr>
              <th class="text-left p-3 font-medium w-12">#</th>
              <th class="text-left p-3 font-medium">Type</th>
              <th class="text-left p-3 font-medium">Quest</th>
              <th class="text-left p-3 font-medium">Objective</th>
              <th class="text-left p-3 font-medium">Rewards</th>
              <th class="text-right p-3 font-medium">Level</th>
            </tr>
          </thead>
          <tbody>
            {#each data.quests as quest, i (quest.id)}
              <tr class="border-t hover:bg-muted/30">
                <td class="p-3 text-muted-foreground">{i + 1}</td>
                <td class="p-3">
                  <QuestTypeBadge type={quest.display_type} />
                </td>
                <td class="p-3">
                  <div class="flex flex-col gap-1">
                    <a
                      href="/quests/{quest.id}"
                      class="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {quest.name}
                    </a>
                    <QuestFlagBadges {quest} />
                  </div>
                </td>
                <td class="p-3">
                  {#if quest.objective_items.length > 0}
                    <div class="flex flex-wrap gap-x-3 gap-y-1">
                      {#each quest.objective_items as item (item.item_id)}
                        <span class="whitespace-nowrap">
                          <ItemLink
                            itemId={item.item_id}
                            itemName={item.item_name}
                            tooltipHtml={item.tooltip_html}
                          />
                          <span class="text-muted-foreground"
                            >×{item.amount}</span
                          >
                        </span>
                      {/each}
                    </div>
                  {:else if quest.potion_to_brew}
                    <span class="whitespace-nowrap">
                      <ItemLink
                        itemId={quest.potion_to_brew.item_id}
                        itemName={quest.potion_to_brew.item_name}
                        tooltipHtml={quest.potion_to_brew.tooltip_html}
                      />
                      <span class="text-muted-foreground"
                        >×{quest.potion_to_brew.amount}</span
                      >
                    </span>
                  {:else if quest.display_type === "Find" && quest.npc_to_find}
                    <a
                      href="/npcs/{quest.npc_to_find.npc_id}"
                      class="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {quest.npc_to_find.npc_name}
                    </a>
                  {:else}
                    <span class="text-muted-foreground">—</span>
                  {/if}
                </td>
                <td class="p-3">
                  <div class="flex flex-col gap-1">
                    {#if quest.reward_gold > 0}
                      <span class="text-amber-600 dark:text-amber-400"
                        >{quest.reward_gold.toLocaleString()} Gold</span
                      >
                    {/if}
                    {#each quest.reward_items as item (item.item_id)}
                      <ItemLink
                        itemId={item.item_id}
                        itemName={item.item_name}
                        tooltipHtml={item.tooltip_html}
                      />
                    {/each}
                    {#if quest.reward_alchemy_skill > 0}
                      <span class="text-green-600 dark:text-green-400"
                        >+{Math.round(quest.reward_alchemy_skill * 100)}%
                        Alchemy</span
                      >
                    {/if}
                    {#if quest.reward_gold === 0 && quest.reward_items.length === 0 && quest.reward_alchemy_skill === 0}
                      <span class="text-muted-foreground">—</span>
                    {/if}
                  </div>
                </td>
                <td class="p-3 text-right">{quest.level_recommended}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}

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
        <label for="skill-slider" class="shrink-0">Alchemy Skill:</label>
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
    </div>
    <div class="rounded-lg border overflow-hidden">
      <table class="w-full">
        <thead class="bg-muted/50">
          <tr>
            <th class="text-left p-3 font-medium">Tier</th>
            <th class="text-left p-3 font-medium">Success</th>
            <th class="text-left p-3 font-medium">Skill Gain</th>
            <th class="text-right p-3 font-medium">Recipes</th>
          </tr>
        </thead>
        <tbody>
          {#each [0, 1, 2, 3, 4] as tier (tier)}
            {@const successChance = getSuccessChance(tier)}
            {@const effortless = isEffortless(tier)}
            {@const [minGain, maxGain] = getSkillGainAmount(successChance)}
            {@const recipeCount = recipeCountMap.get(tier) ?? 0}
            <tr class="border-t hover:bg-muted/30">
              <td class="p-3 font-medium">{romanNumerals[tier]}</td>
              <td class="p-3">
                <span class="font-mono {getSuccessChanceColor(successChance)}">
                  {successChance.toFixed(2)}%
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
              <td class="p-3 text-right">{recipeCount}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  <!-- Recipes Table -->
  <section class="space-y-4">
    <h2 class="text-xl font-semibold flex items-center gap-2">
      <ScrollIcon class="h-5 w-5 text-orange-500" />
      Recipes ({data.recipes.length})
    </h2>
    <div class="rounded-lg border overflow-hidden">
      <table class="w-full">
        <thead class="bg-muted/50">
          <tr>
            <th class="text-left p-3 font-medium">Tier</th>
            <th class="text-left p-3 font-medium">Output</th>
            <th class="text-left p-3 font-medium">Ingredients</th>
            <th class="text-left p-3 font-medium">Success</th>
            <th class="text-left p-3 font-medium">Skill Gain</th>
          </tr>
        </thead>
        <tbody>
          {#each data.recipes as recipe (recipe.id)}
            {@const successChance = getSuccessChance(recipe.level_required)}
            {@const effortless = isEffortless(recipe.level_required)}
            {@const [minGain, maxGain] = getSkillGainAmount(successChance)}
            {@const isExpanded = expandedRecipes.has(recipe.id)}
            {@const canExpand = hasIngredients(recipe)}
            <tr
              class="border-t hover:bg-muted/30 {canExpand
                ? 'cursor-pointer'
                : ''}"
              onclick={() => canExpand && toggleRecipe(recipe.id)}
            >
              <td class="p-3 font-medium">
                <div class="flex items-center gap-1">
                  {#if canExpand}
                    <button
                      class="p-0.5 rounded hover:bg-muted transition-colors"
                      aria-label={isExpanded ? "Collapse" : "Expand"}
                    >
                      {#if isExpanded}
                        <ChevronDown class="h-4 w-4 text-muted-foreground" />
                      {:else}
                        <ChevronRight class="h-4 w-4 text-muted-foreground" />
                      {/if}
                    </button>
                  {:else}
                    <span class="w-5"></span>
                  {/if}
                  {romanNumerals[recipe.level_required] ??
                    recipe.level_required}
                </div>
              </td>
              <td class="p-3">
                <a
                  href="/recipes/{recipe.id}"
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                  onclick={(e) => e.stopPropagation()}
                >
                  <ItemLink
                    itemId={recipe.result_item_id}
                    itemName={recipe.result_item_name}
                    tooltipHtml={recipe.result_tooltip_html}
                  />
                </a>
              </td>
              <td class="p-3">
                {#if recipe.obtainabilityTree.recipe?.materials}
                  <div class="flex flex-wrap gap-x-3 gap-y-1">
                    {#each recipe.obtainabilityTree.recipe.materials as mat (mat.item_id)}
                      <span class="whitespace-nowrap">
                        <ItemLink
                          itemId={mat.item_id}
                          itemName={mat.item_name}
                          tooltipHtml={mat.tooltip_html}
                        />
                        <span class="text-muted-foreground">×{mat.amount}</span>
                      </span>
                    {/each}
                  </div>
                {:else}
                  <span class="text-muted-foreground">—</span>
                {/if}
              </td>
              <td class="p-3">
                <span class="font-mono {getSuccessChanceColor(successChance)}">
                  {successChance.toFixed(2)}%
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
            {#if isExpanded && canExpand}
              <tr class="bg-muted/20">
                <td colspan="5" class="p-4">
                  <div class="text-muted-foreground mb-2">
                    How to obtain ingredients:
                  </div>
                  <div
                    class="bg-background rounded-md p-3 border overflow-x-auto"
                  >
                    <ObtainabilityTree
                      node={recipe.obtainabilityTree}
                      defaultExpanded={true}
                      hideRootLink={true}
                    />
                  </div>
                </td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    </div>
  </section>
</div>

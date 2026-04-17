<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import MechanicsLink from "$lib/components/MechanicsLink.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import ObtainabilityTree from "$lib/components/ObtainabilityTree.svelte";
  import MapLink from "$lib/components/MapLink.svelte";
  import Scroll from "@lucide/svelte/icons/scroll";
  import Trophy from "@lucide/svelte/icons/trophy";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import CalculatorIcon from "@lucide/svelte/icons/calculator";
  import MapPin from "@lucide/svelte/icons/map-pin";
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

  function handleCellKeydown(e: KeyboardEvent, recipeId: string) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleRecipe(recipeId);
    }
  }

  function cellProps(canExpand: boolean, recipeId: string, extraClass = "") {
    return {
      class:
        `p-3 border-t ${canExpand ? "cursor-pointer" : ""} ${extraClass}`.trim(),
      role: canExpand ? ("button" as const) : undefined,
      tabindex: canExpand ? 0 : undefined,
      onclick: () => canExpand && toggleRecipe(recipeId),
      onkeydown: (e: KeyboardEvent) =>
        canExpand && handleCellKeydown(e, recipeId),
    };
  }

  function hasIngredients(recipe: (typeof data.recipes)[0]): boolean {
    return (
      !!recipe.obtainabilityTree.recipe &&
      recipe.obtainabilityTree.recipe.materials.length > 0
    );
  }

  // Skill level state (0–100%)
  let skillLevel = $state(0);

  // Source: server-scripts/Utils.cs:473-483 — GetSuccessChanceProb
  // Scribing uses scrollMasteryLevel for success (same formula as alchemy).
  // All current recipes are tier 0, so success is always 100%.
  function getSuccessChance(levelRequired: number): number {
    const skill = skillLevel / 100;
    switch (levelRequired) {
      case 0:
        return 100;
      case 1:
        return Math.min(100, (0.4 + skill * 2) * 100);
      case 2:
        return Math.min(100, (0.2 + skill) * 100);
      case 3:
        return Math.min(100, skill * 95);
      default:
        return Math.min(100, skill * 90);
    }
  }

  function getSuccessChanceColor(chance: number): string {
    if (chance >= 100) return "text-green-500";
    if (chance >= 75) return "text-lime-500";
    if (chance >= 50) return "text-yellow-500";
    if (chance >= 25) return "text-orange-500";
    return "text-red-500";
  }

  // Source: server-scripts/Player.cs:10282 — isScribingTable craft path
  // Gain chance = max(0, 1 − (0.5 + scrollMasteryLevel / 2)) per successful craft
  function getMasteryCraftGainChance(): number {
    const skill = skillLevel / 100;
    return Math.max(0, (0.5 - skill / 2) * 100);
  }

  // Source: server-scripts/ScrollItem.cs:82 — scroll use path
  // Gain chance = max(0, 1 − (0.3 + scrollMasteryLevel / 2)) per scroll use
  function getMasteryUseGainChance(): number {
    const skill = skillLevel / 100;
    return Math.max(0, (0.7 - skill / 2) * 100);
  }

  // Source: server-scripts/Player.cs:10284 — Random.Range(1, 4) / 10000f
  const MASTERY_CRAFT_GAIN_MIN = 0.01; // 1/10000 * 100
  const MASTERY_CRAFT_GAIN_MAX = 0.03; // 3/10000 * 100
  // Source: server-scripts/ScrollItem.cs:84 — Random.Range(1, 3) / 10000f
  const MASTERY_USE_GAIN_MIN = 0.01; // 1/10000 * 100
  const MASTERY_USE_GAIN_MAX = 0.02; // 2/10000 * 100
</script>

<svelte:head>
  <title>{data.profession.name} - Ancient Kingdoms Compendium</title>
  <meta
    name="description"
    content="{data.profession
      .description} View all scrolls you can craft with the Scroll Mastery skill."
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
      <Scroll class="h-8 w-8 text-purple-500 dark:text-purple-400" />
    </div>
    <div>
      <div class="flex items-center gap-2">
        <h1 class="text-3xl font-bold">{data.profession.name}</h1>
        <span
          class="px-2 py-0.5 text-xs rounded-full bg-muted text-purple-500 dark:text-purple-400 font-medium"
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
            Achievement: {data.profession.steam_achievement_name}
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
        Scribing Table Locations ({data.locations.length})
      </h2>
      <div class="rounded-lg border overflow-x-auto">
        <table class="w-full whitespace-nowrap">
          <thead class="bg-muted/50">
            <tr>
              <th class="text-left p-3 font-medium">Zone</th>
              <th class="text-left p-3 font-medium">Sub-zone</th>
              <th class="text-left p-3 font-medium">Map</th>
            </tr>
          </thead>
          <tbody>
            {#each data.locations as location (location.id)}
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
                <td class="p-3">
                  <MapLink
                    entityId={location.id}
                    entityType="scribing_table"
                    compact
                  />
                </td>
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
        <label for="skill-slider" class="shrink-0">Scroll Mastery:</label>
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
        <span>Gain chance (crafting):</span>
        <span class="font-mono text-foreground"
          >{getMasteryCraftGainChance().toFixed(0)}%</span
        >
        <span class="text-xs">(per craft)</span>
      </div>
      <div class="flex items-center gap-2 text-muted-foreground">
        <span>Gain chance (using):</span>
        <span class="font-mono text-foreground"
          >{getMasteryUseGainChance().toFixed(0)}%</span
        >
        <span class="text-xs">(per scroll use)</span>
      </div>
    </div>
    <div class="rounded-lg border overflow-x-auto">
      <div
        class="grid whitespace-nowrap"
        style="grid-template-columns: repeat(5, 1fr);"
      >
        <div class="bg-muted/50 p-3 font-medium">Success</div>
        <div class="bg-muted/50 p-3 font-medium">Craft Gain</div>
        <div class="bg-muted/50 p-3 font-medium">Use Gain</div>

        <div class="bg-muted/50 p-3 font-medium">XP</div>

        <div class="bg-muted/50 p-3 font-medium text-right">Recipes</div>
        {#each data.recipeCounts as { tier, count } (tier)}
          {@const successChance = getSuccessChance(tier)}
          {@const craftGainChance = getMasteryCraftGainChance()}
          {@const useGainChance = getMasteryUseGainChance()}
          <div class="p-3 border-t">
            <span class="font-mono {getSuccessChanceColor(successChance)}">
              {successChance.toFixed(0)}%
            </span>
          </div>
          <div class="p-3 border-t">
            {#if craftGainChance > 0}
              <span class="font-mono"
                >{MASTERY_CRAFT_GAIN_MIN.toFixed(2)}% – {MASTERY_CRAFT_GAIN_MAX.toFixed(
                  2,
                )}%</span
              >
            {:else}
              <span class="text-muted-foreground">—</span>
            {/if}
          </div>
          <div class="p-3 border-t">
            {#if useGainChance > 0}
              <span class="font-mono"
                >{MASTERY_USE_GAIN_MIN.toFixed(2)}% – {MASTERY_USE_GAIN_MAX.toFixed(
                  2,
                )}%</span
              >
            {:else}
              <span class="text-muted-foreground">—</span>
            {/if}
          </div>
          <div class="p-3 border-t">
            <MechanicsLink section="experience#scribing-xp"
              >PlayerLvl &times; 100</MechanicsLink
            >
          </div>
          <div class="p-3 text-right border-t">{count}</div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Recipes Table -->
  <section class="space-y-4">
    <h2 class="text-xl font-semibold flex items-center gap-2">
      <Scroll class="h-5 w-5 text-purple-500" />
      Recipes ({data.recipes.length})
    </h2>
    <div class="rounded-lg border overflow-x-auto">
      <div
        class="grid whitespace-nowrap"
        style="grid-template-columns: 2fr 4fr 1fr 2fr;"
      >
        <div class="bg-muted/50 p-3 font-medium">Output</div>
        <div class="bg-muted/50 p-3 font-medium">Ingredients</div>
        <div class="bg-muted/50 p-3 font-medium">Success</div>
        <div class="bg-muted/50 p-3 font-medium">Craft Gain</div>
        {#each data.recipes as recipe (recipe.id)}
          {@const successChance = getSuccessChance(recipe.level_required)}
          {@const gainChance = getMasteryCraftGainChance()}
          {@const isExpanded = expandedRecipes.has(recipe.id)}
          {@const canExpand = hasIngredients(recipe)}
          <div {...cellProps(canExpand, recipe.id, "font-medium")}>
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
              <ItemLink
                itemId={recipe.result_item_id}
                itemName={recipe.result_item_name}
                tooltipHtml={recipe.result_tooltip_html}
              />
            </div>
          </div>
          <div {...cellProps(canExpand, recipe.id)}>
            {#if recipe.obtainabilityTree.recipe?.materials}
              <div class="flex gap-3">
                {#each recipe.obtainabilityTree.recipe.materials as mat (mat.item_id)}
                  <span>
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
          </div>
          <div {...cellProps(canExpand, recipe.id)}>
            <span class="font-mono {getSuccessChanceColor(successChance)}">
              {successChance.toFixed(0)}%
            </span>
          </div>
          <div {...cellProps(canExpand, recipe.id)}>
            {#if gainChance > 0}
              <span class="font-mono">
                {MASTERY_CRAFT_GAIN_MIN.toFixed(2)}% – {MASTERY_CRAFT_GAIN_MAX.toFixed(
                  2,
                )}%
              </span>
            {:else}
              <span class="text-muted-foreground">—</span>
            {/if}
          </div>
          {#if isExpanded && canExpand}
            <div class="bg-muted/20 p-4" style="grid-column: 1 / -1;">
              <div class="text-muted-foreground mb-2">
                How to obtain ingredients:
              </div>
              <div class="bg-background rounded-md p-3 border overflow-x-auto">
                <ObtainabilityTree
                  node={recipe.obtainabilityTree}
                  defaultExpanded={true}
                  hideRootLink={true}
                />
              </div>
            </div>
          {/if}
        {/each}
      </div>
    </div>
  </section>
</div>

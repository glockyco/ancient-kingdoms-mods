<script lang="ts">
  import Seo from "$lib/components/Seo.svelte";
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
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let expandedRecipes = new SvelteSet<string>();

  // Skill level state (0–100%)
  let skillLevel = $state(0);

  const selectedScrollRank = $derived(getScrollRank(20));

  function toggleRecipe(recipeId: string) {
    if (expandedRecipes.has(recipeId)) {
      expandedRecipes.delete(recipeId);
    } else {
      expandedRecipes.add(recipeId);
    }
  }

  function handleRecipeKeydown(e: KeyboardEvent, recipeId: string) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleRecipe(recipeId);
    }
  }

  function hasIngredients(recipe: (typeof data.recipes)[number]): boolean {
    return (
      !!recipe.obtainabilityTree.recipe &&
      recipe.obtainabilityTree.recipe.materials.length > 0
    );
  }

  // Source: server-scripts/Player.cs:10307 — isScribingTable craft path
  // Source: server-scripts/ScrollItem.cs:82 — scroll use path
  // Both paths share the same gain chance:
  //   Mathf.Lerp(0.9, 0.02, scrollMasteryLevel^2) > Random.value, only while level < 1.
  function getMasteryGainChance(): number {
    const skill = skillLevel / 100;
    if (skill >= 1) return 0;
    const t = skill * skill;
    return (0.9 + (0.02 - 0.9) * t) * 100;
  }

  // Source: server-scripts/Player.cs:10309 and ScrollItem.cs:84 — Random.Range(5, 10) / 10000f
  // Unity int Random.Range upper bound is exclusive: integers 5-9 -> 0.05% to 0.09%.
  const MASTERY_GAIN_MIN = 0.05;
  const MASTERY_GAIN_MAX = 0.09;

  function getScrollRank(maxLevel: number): number {
    if (maxLevel <= 1) return 1;
    return Math.min(maxLevel, Math.max(1, Math.round(skillLevel / 5)));
  }

  function formatSkillType(skillType: string): string {
    const labels: Record<string, string> = {
      area_damage: "Area Damage",
      target_projectile: "Target Projectile",
      target_buff: "Target Buff",
      target_debuff: "Target Debuff",
      target_heal: "Target Heal",
    };

    return labels[skillType] ?? skillType.replace(/_/g, " ");
  }

  function formatScalingSummary(
    scroll: Pick<
      (typeof data.recipes)[number],
      "scaling_labels" | "skill_max_level"
    >,
  ): string {
    if (scroll.skill_max_level <= 1) return "";
    if (scroll.scaling_labels.length === 0) return "See skill details";
    return scroll.scaling_labels.join(", ");
  }
</script>

<Seo
  title={`${data.profession.name} - Ancient Kingdoms`}
  description={`${data.profession.description} View scroll recipes, scribing table locations, Scroll Mastery rank scaling, mastery gain chance, and Dispel Resist rules.`}
  path="/professions/scroll_mastery"
/>

<div class="container mx-auto space-y-8 p-8">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Professions", href: "/professions" },
      { label: data.profession.name },
    ]}
  />

  <section class="rounded-lg border p-6 md:p-8">
    <div class="flex flex-wrap items-start gap-4">
      <div class="rounded-lg bg-purple-500/10 p-3">
        <Scroll class="h-7 w-7 text-purple-500 dark:text-purple-400" />
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <h1 class="text-3xl font-bold tracking-tight md:text-4xl">
            {data.profession.name}
          </h1>
        </div>
        <p class="mt-2 max-w-3xl text-muted-foreground">
          Craft scrolls and improve scaling scroll effects.
        </p>
      </div>
    </div>

    <div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-lg border p-4">
        <div class="text-2xl font-semibold">
          {data.stats.craftable_scroll_count}
        </div>
        <div class="text-sm text-muted-foreground">Craftable scrolls</div>
      </div>
      <div class="rounded-lg border p-4">
        <div class="text-2xl font-semibold">
          {data.stats.scaling_scroll_count}
        </div>
        <div class="text-sm text-muted-foreground">Scaling scrolls</div>
      </div>
      <div class="rounded-lg border p-4">
        <div class="text-2xl font-semibold">
          {data.stats.fixed_rank_scroll_count}
        </div>
        <div class="text-sm text-muted-foreground">Fixed-rank scrolls</div>
      </div>
      <div class="rounded-lg border p-4">
        <div class="text-2xl font-semibold">
          {data.stats.scribing_table_count}
        </div>
        <div class="text-sm text-muted-foreground">Scribing tables</div>
      </div>
    </div>
  </section>

  <section class="rounded-lg border p-5">
    <h2 class="text-xl font-semibold">How It Works</h2>

    <div class="mt-4 divide-y">
      <div class="grid gap-3 py-4 first:pt-0 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">1</div>
        <div>
          <div>
            Find a
            <a
              href="#scribing-tables"
              class="text-blue-600 hover:underline dark:text-blue-400"
              >Scribing Table</a
            >.
          </div>
          <p class="mt-1 text-sm leading-6 text-muted-foreground">
            Craftable scroll recipes are made at Scribing Tables.
          </p>
        </div>
      </div>

      <div class="grid gap-3 py-4 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">2</div>
        <div>
          <div>Craft scrolls.</div>
          <p class="mt-1 text-sm leading-6 text-muted-foreground">
            All current scroll recipes have 100% crafting success chance.
            Crafting grants
            <MechanicsLink section="experience#scribing-xp"
              >Player Level × 100 XP</MechanicsLink
            >.
          </p>
        </div>
      </div>

      <div class="grid gap-3 py-4 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">3</div>
        <div>
          <div>Use scrolls.</div>
          <p class="mt-1 text-sm leading-6 text-muted-foreground">
            Scaling scrolls use rank = clamp(round(Scroll Mastery% ÷ 5), 1, max
            rank). Fixed-rank scrolls stay rank 1.
          </p>
        </div>
      </div>

      <div class="grid gap-3 py-4 last:pb-0 md:grid-cols-[2rem_1fr]">
        <div class="text-sm text-muted-foreground">4</div>
        <div>
          <div>Gain Scroll Mastery.</div>
          <p class="mt-1 text-sm leading-6 text-muted-foreground">
            Crafting a scroll or using a scroll can raise Scroll Mastery. The
            chance to gain mastery decreases as mastery approaches 100%.
          </p>
          <p
            class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm leading-6 text-muted-foreground"
          >
            <span>Max Level: {data.profession.max_level}%</span>
            {#if data.profession.steam_achievement_id}
              <span class="flex items-center gap-1">
                Achievement:
                <Trophy class="h-4 w-4" />
                {data.profession.steam_achievement_name}
              </span>
            {/if}
          </p>
        </div>
      </div>
    </div>
  </section>

  <section id="calculator" class="space-y-4">
    <h2 class="flex items-center gap-2 text-xl font-semibold">
      <CalculatorIcon class="h-5 w-5 text-cyan-500" />
      Scroll Mastery Calculator
    </h2>

    <div class="rounded-lg border bg-muted/15 p-4">
      <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
        <label for="scroll-mastery-slider" class="shrink-0">
          Scroll Mastery
        </label>
        <input
          id="scroll-mastery-slider"
          type="range"
          min="0"
          max="100"
          step="1"
          bind:value={skillLevel}
          class="h-2 w-48 cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
        />
        <span class="w-14 font-mono">{skillLevel}%</span>
      </div>

      <div class="mt-4 grid gap-3 sm:grid-cols-3">
        <div class="rounded-lg border bg-background p-3">
          <div class="text-sm text-muted-foreground">Scaling scroll rank</div>
          <div class="text-xl font-semibold">{selectedScrollRank}</div>
        </div>
        <div class="rounded-lg border bg-background p-3">
          <div class="text-sm text-muted-foreground">
            Gain chance per craft/use
          </div>
          <div class="text-xl font-semibold">
            {getMasteryGainChance().toFixed(0)}%
          </div>
        </div>
        <div class="rounded-lg border bg-background p-3">
          <div class="text-sm text-muted-foreground">Gain amount per proc</div>
          <div class="text-xl font-semibold">
            {MASTERY_GAIN_MIN.toFixed(2)}%–{MASTERY_GAIN_MAX.toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  </section>

  <section id="craftable-scrolls" class="space-y-4">
    <div>
      <h2 class="flex items-center gap-2 text-xl font-semibold">
        <Scroll class="h-5 w-5 text-purple-500" />
        Craftable Scrolls ({data.recipes.length})
      </h2>
    </div>

    <div class="overflow-hidden rounded-lg border">
      <div class="overflow-x-auto">
        <table class="w-full whitespace-nowrap">
          <thead class="bg-muted/50">
            <tr>
              <th class="p-3 text-left font-medium">Scroll</th>
              <th class="p-3 text-left font-medium">Ingredients</th>
              <th class="p-3 text-left font-medium">Casts</th>
              <th class="p-3 text-left font-medium">Scaling</th>
            </tr>
          </thead>
          <tbody>
            {#each data.recipes as recipe (recipe.recipe_id)}
              {@const canExpand = hasIngredients(recipe)}
              {@const isExpanded = expandedRecipes.has(recipe.recipe_id)}
              <tr
                class="border-t hover:bg-muted/25 {canExpand
                  ? 'cursor-pointer'
                  : ''}"
                role={canExpand ? "button" : undefined}
                tabindex={canExpand ? 0 : undefined}
                onclick={() => canExpand && toggleRecipe(recipe.recipe_id)}
                onkeydown={(e) =>
                  canExpand && handleRecipeKeydown(e, recipe.recipe_id)}
              >
                <td class="p-3">
                  <div class="flex items-center gap-1">
                    {#if canExpand}
                      <button
                        type="button"
                        class="rounded p-0.5 transition-colors hover:bg-muted"
                        aria-label={isExpanded
                          ? "Collapse ingredients"
                          : "Expand ingredients"}
                        onclick={(e) => {
                          e.stopPropagation();
                          toggleRecipe(recipe.recipe_id);
                        }}
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
                      itemId={recipe.item_id}
                      itemName={recipe.item_name}
                      tooltipHtml={recipe.tooltip_html}
                    />
                  </div>
                </td>
                <td class="p-3">
                  {#if recipe.obtainabilityTree.recipe?.materials}
                    <div class="flex flex-wrap gap-x-3 gap-y-1">
                      {#each recipe.obtainabilityTree.recipe.materials as mat (mat.item_id)}
                        <span>
                          <ItemLink
                            itemId={mat.item_id}
                            itemName={mat.item_name}
                            tooltipHtml={mat.tooltip_html}
                          />
                          <span class="text-muted-foreground"
                            >×{mat.amount}</span
                          >
                        </span>
                      {/each}
                    </div>
                  {:else}
                    <span class="text-muted-foreground">—</span>
                  {/if}
                </td>
                <td class="p-3">
                  <a
                    href="/skills/{recipe.skill_id}"
                    class="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {recipe.skill_name}
                  </a>
                  <div class="text-sm text-muted-foreground">
                    {formatSkillType(recipe.skill_type)}
                  </div>
                </td>
                <td class="p-3">
                  {#if formatScalingSummary(recipe)}
                    {formatScalingSummary(recipe)}
                  {:else}
                    <span class="text-muted-foreground">—</span>
                  {/if}
                </td>
              </tr>
              {#if isExpanded && canExpand}
                <tr class="border-t bg-muted/20">
                  <td class="p-4" colspan="4">
                    <div class="mb-2 text-muted-foreground">
                      How to obtain ingredients:
                    </div>
                    <div
                      class="overflow-x-auto rounded-md border bg-background p-3"
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
    </div>
  </section>

  {#if data.locations.length > 0}
    <section id="scribing-tables" class="space-y-4">
      <h2 class="flex items-center gap-2 text-xl font-semibold">
        <MapPin class="h-5 w-5 text-emerald-500" />
        Scribing Table Locations ({data.locations.length})
      </h2>
      <div class="overflow-x-auto rounded-lg border">
        <table class="w-full whitespace-nowrap">
          <thead class="bg-muted/50">
            <tr>
              <th class="p-3 text-left font-medium">Zone</th>
              <th class="p-3 text-left font-medium">Sub-zone</th>
              <th class="p-3 text-left font-medium">Map</th>
            </tr>
          </thead>
          <tbody>
            {#each data.locations as location (location.id)}
              <tr class="border-t hover:bg-muted/30">
                <td class="p-3">
                  <a
                    href="/zones/{location.zone_id}"
                    class="text-blue-600 hover:underline dark:text-blue-400"
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
</div>

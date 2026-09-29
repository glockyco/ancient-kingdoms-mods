<script lang="ts">
  import Seo from "$lib/components/Seo.svelte";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import MechanicsLink from "$lib/components/MechanicsLink.svelte";
  import * as Card from "$lib/components/ui/card";
  import GuideFacts from "$lib/components/GuideFacts.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import ObtainabilityTree from "$lib/components/ObtainabilityTree.svelte";
  import MapLink from "$lib/components/MapLink.svelte";
  import Scroll from "@lucide/svelte/icons/scroll";
  import AchievementLink from "$lib/components/AchievementLink.svelte";
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

  function isInteractiveEvent(e: Event): boolean {
    const target = e.target as HTMLElement | null;
    if (!target) return false;
    const interactive = target.closest("a, button, [role='button']");
    return !!interactive && interactive !== e.currentTarget;
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

  // Source: server-scripts/Player.cs:UserCode_CmdMakePotion__Int32 — isScribingTable craft path
  // Source: server-scripts/ScrollItem.cs:67-105 — scroll use path
  // Both paths share the same gain chance:
  //   Mathf.Lerp(0.9, 0.02, scrollMasteryLevel^2) > Random.value, only while level < 1.
  function getMasteryGainChance(): number {
    const skill = skillLevel / 100;
    if (skill >= 1) return 0;
    const t = skill * skill;
    return (0.9 + (0.02 - 0.9) * t) * 100;
  }

  // Source: server-scripts/Player.cs:UserCode_CmdMakePotion__Int32 — crafting: Random.Range(5, 10) / 10000f
  // Source: server-scripts/ScrollItem.cs:86 — use: Random.Range(10, 20) / 10000f
  const CRAFT_MASTERY_GAIN_MIN = 0.05;
  const CRAFT_MASTERY_GAIN_MAX = 0.09;
  const USE_MASTERY_GAIN_MIN = 0.1;
  const USE_MASTERY_GAIN_MAX = 0.19;

  function getScrollRank(maxLevel: number): number {
    if (maxLevel <= 1) return 1;
    return Math.min(maxLevel, Math.max(1, Math.round(skillLevel / 5)));
  }

  function formatSkillType(skillType: string): string {
    const labels: Record<string, string> = {
      area_damage: "Area damage",
      target_projectile: "Targeted projectile",
      target_buff: "Targeted buff",
      target_debuff: "Targeted debuff",
      target_heal: "Targeted heal",
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
  description={`${data.profession.description} View scroll recipes, Scribing Table locations, rank scaling, and Scroll Mastery gains.`}
  path="/professions/scroll_mastery"
/>

<div class="container mx-auto max-w-6xl space-y-10 p-8">
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
          Craft scrolls and raise Scroll Mastery to strengthen their effects.
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
          <div class="text-sm text-muted-foreground">
            Gain amount per increase
          </div>
          <div class="text-sm leading-6">
            <div>
              Craft: {CRAFT_MASTERY_GAIN_MIN.toFixed(
                2,
              )}%–{CRAFT_MASTERY_GAIN_MAX.toFixed(2)}%
            </div>
            <div>
              Use: {USE_MASTERY_GAIN_MIN.toFixed(
                2,
              )}%–{USE_MASTERY_GAIN_MAX.toFixed(2)}%
            </div>
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
                onclick={(e) => {
                  if (!canExpand || isInteractiveEvent(e)) return;
                  toggleRecipe(recipe.recipe_id);
                }}
                onkeydown={(e) => {
                  if (!canExpand || isInteractiveEvent(e)) return;
                  handleRecipeKeydown(e, recipe.recipe_id);
                }}
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
                      imageAvailable={recipe.obtainabilityTree
                        .visual_public_path}
                    />
                  </div>
                </td>
                <td class="p-3">
                  {#if recipe.obtainabilityTree.recipe?.materials}
                    <div
                      class="flex flex-col gap-1 2xl:flex-row 2xl:flex-wrap 2xl:gap-x-3 2xl:gap-y-1"
                    >
                      {#each recipe.obtainabilityTree.recipe.materials as mat (mat.item_id)}
                        <span>
                          <ItemLink
                            itemId={mat.item_id}
                            itemName={mat.item_name}
                            tooltipHtml={mat.tooltip_html}
                            imageAvailable={mat.visual_public_path}
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

  <Card.Root id="how-it-works" class="bg-muted/30">
    <Card.Header
      ><Card.Title class="text-xl">How scroll mastery works</Card.Title
      ></Card.Header
    >
    <Card.Content class="space-y-6">
      <!-- Source: server-scripts/Player.cs:13230-13250,13289-13294; server-scripts/Utils.cs:541-550; website/data/compendium.db:scribing_recipes — listed level-zero recipes succeed at 100% and grant player level × 100 XP. -->
      <GuideFacts
        facts={[
          { value: "100%", label: "Listed scroll craft chance" },
          { value: "Level × 100", label: "XP per craft" },
        ]}
      />
      <ol class="divide-y divide-border text-sm">
        <!-- Source: server-scripts/Player.cs:13230-13250,13289-13294 — scribing consumes ingredients and grants XP on success. -->
        <li class="grid grid-cols-[1.5rem_1fr] gap-3 py-3 first:pt-0">
          <span class="tabular-nums text-muted-foreground">1</span>
          <div>
            <p class="font-medium">Craft at a Scribing Table.</p>
            <p class="mt-0.5 text-muted-foreground">
              Each listed recipe succeeds. A double-XP effect doubles the <MechanicsLink
                section="experience#scribing-xp">craft XP</MechanicsLink
              >.
            </p>
          </div>
        </li>
        <!-- Source: server-scripts/ScrollItem.cs:67-112 — scrolls require valid targets, apply skills without teaching them, and consume a charge unless unlimited. -->
        <li class="grid grid-cols-[1.5rem_1fr] gap-3 py-3">
          <span class="tabular-nums text-muted-foreground">2</span>
          <div>
            <p class="font-medium">Use the scroll on a valid target.</p>
            <p class="mt-0.5 text-muted-foreground">
              It casts the skill without teaching it. Use consumes one charge
              unless charges are unlimited.
            </p>
          </div>
        </li>
      </ol>
      <!-- Source: server-scripts/ScrollItem.cs:100-104 — scroll rank scales with mastery but cannot exceed the skill's maximum rank. -->
      <ul class="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>
          Fixed-rank scrolls stay at rank 1. Scaling scrolls use your mastery,
          up to the skill's maximum rank.
        </li>
      </ul>
      {#if data.profession.achievement_id}
        <AchievementLink
          achievementId={data.profession.achievement_id}
          achievementName={data.profession.achievement_name}
        />
      {/if}
    </Card.Content>
  </Card.Root>
</div>

<script lang="ts">
  import { formatNumber, formatPercent } from "$lib/utils/format";
  import Seo from "$lib/components/Seo.svelte";
  import { detailTitle } from "$lib/seo/title";
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import MechanicsLink from "$lib/components/MechanicsLink.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import MapLink from "$lib/components/MapLink.svelte";
  import RecipeIngredients from "$lib/components/RecipeIngredients.svelte";
  import MethodList from "$lib/components/acquisition/MethodList.svelte";
  import Requirements from "$lib/components/acquisition/Requirements.svelte";
  import {
    describeRequirement,
    evaluateRequirement,
  } from "$lib/acquisition/conditions";
  import {
    BASELINE_ASSUMPTIONS,
    calculateMethodProbabilities,
  } from "$lib/acquisition/rules";
  import type { MethodView } from "$lib/acquisition/types";
  import type { PageData } from "./$types";
  import QuestTypeBadge from "$lib/components/QuestTypeBadge.svelte";
  import QuestFlagBadges from "$lib/components/QuestFlagBadges.svelte";
  import FlaskConical from "@lucide/svelte/icons/flask-conical";
  import AchievementLink from "$lib/components/AchievementLink.svelte";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import CalculatorIcon from "@lucide/svelte/icons/calculator";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import ScrollIcon from "@lucide/svelte/icons/scroll";
  import { SvelteSet } from "svelte/reactivity";
  import {
    alchemySkillGainChancePercent,
    alchemySkillGainRange,
    alchemySuccessPercent,
  } from "$lib/utils/alchemy";
  import { Input } from "$lib/components/ui/input";

  let { data }: { data: PageData } = $props();

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

  const methodDefinitions = $derived(
    new Map(data.acquisitionRows.methods.map((method) => [method.id, method])),
  );

  function enteredMethods(
    methods: readonly MethodView[],
  ): readonly MethodView[] {
    return methods.map((method) => ({
      ...method,
      probabilityResults: calculateMethodProbabilities(
        data.acquisitionRows,
        methodDefinitions.get(method.methodId)!,
        method.detail,
        {
          assumptions: {
            ...BASELINE_ASSUMPTIONS,
            scenario: "entered",
            professionFraction: skillLevel / 100,
          },
        },
      ),
    }));
  }

  // Skill level state (0-100%)
  let skillLevel = $state(0);
  function qualifies(tier: number): boolean {
    return (
      evaluateRequirement(
        {
          phase: "attempt",
          subject: "player",
          enforcement: "both",
          expression: {
            kind: "predicate",
            predicate: {
              kind: "profession_floor",
              subject: "player",
              profession: "alchemy",
              tier,
            },
          },
        },
        {
          subjects: {
            player: {
              professions: {
                alchemy: {
                  known: true,
                  value: skillLevel / 100,
                  provenance: "entered",
                },
              },
            },
          },
        },
      ).status === "met"
    );
  }

  // Recipe list filters
  let nameFilter = $state("");
  let tierFilter = new SvelteSet<number>();

  function toggleTier(tier: number) {
    if (tierFilter.has(tier)) {
      tierFilter.delete(tier);
    } else {
      tierFilter.add(tier);
    }
  }

  const tiersPresent = $derived(
    [...new Set(data.recipes.map((r) => r.level_required))].sort(
      (a, b) => a - b,
    ),
  );

  const filteredRecipes = $derived(
    data.recipes.filter((recipe) => {
      const matchesName = recipe.result_item_name
        .toLowerCase()
        .includes(nameFilter.trim().toLowerCase());
      const matchesTier =
        tierFilter.size === 0 || tierFilter.has(recipe.level_required);
      return matchesName && matchesTier;
    }),
  );

  const recipeCountLabel = $derived(
    filteredRecipes.length === data.recipes.length
      ? `${data.recipes.length}`
      : `${filteredRecipes.length} of ${data.recipes.length}`,
  );

  // Roman numerals for tier display
  const romanNumerals = ["I", "II", "III", "IV", "V"];

  // Create a map of tier -> recipe count
  const recipeCountMap = $derived(
    new Map(data.recipeCounts.map((rc) => [rc.tier, rc.count])),
  );

  // Create a map of tier -> XP
  const xpByTierMap = $derived(
    new Map(data.xpByTier.map((tx) => [tx.tier, tx.xp])),
  );

  function getSuccessChanceColor(chance: number): string {
    if (chance >= 100) return "text-green-500";
    if (chance >= 75) return "text-lime-500";
    if (chance >= 50) return "text-yellow-500";
    if (chance >= 25) return "text-orange-500";
    return "text-red-500";
  }
</script>

<Seo
  title={detailTitle(data.profession.name, { family: "Profession" })}
  description={`${data.profession.description} Recipe ingredients, success chances, skill gains, Alchemy Table locations and the Alchemy quest line.`}
  path="/professions/alchemy"
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
      <FlaskConical class="h-8 w-8 text-purple-500 dark:text-purple-400" />
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
    <h2 class="text-xl font-semibold">How Alchemy works</h2>
    <!-- Source: server-scripts/uMMORPG.Scripts.ScriptableItems/RecipeItem.cs:10-27 — a known recipe cannot be learned again; learning consumes one recipe item. -->
    <p class="text-muted-foreground">
      Learn a potion recipe by using its recipe item. This consumes the item.
      Recipes you already know cannot be learned again.
    </p>
    <!-- Source: server-scripts/Player.cs:13563-13574,13587-13607 — brewing requires a learned recipe, output space, and at least 10% success chance; ingredients are consumed before the roll. -->
    <p class="text-muted-foreground">
      <span class="block"
        >Brewing requires a learned recipe, inventory space for the potion, and
        at least a 10% success chance.</span
      >
      <span class="block">A failed brew still uses up the ingredients.</span>
    </p>
    <p class="text-muted-foreground">
      Tier I recipes stop raising Alchemy above 25%, Tier II above 50% and Tier
      III above 75%.
    </p>
  </section>

  <!-- Station Locations -->
  {#if data.locations.length > 0}
    <section class="space-y-4">
      <h2 class="text-xl font-semibold flex items-center gap-2">
        <MapPin class="h-5 w-5 text-emerald-500" />
        Alchemy Table Locations ({data.locations.length})
      </h2>
      <div class="rounded-lg border overflow-x-auto">
        <table class="w-full whitespace-nowrap">
          <thead class="bg-muted/50">
            <tr>
              <th class="text-left p-3 font-medium">Zone</th>
              <th class="text-left p-3 font-medium">Area</th>
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
                    entityType="alchemy_table"
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

  <!-- Quest Line -->
  {#if data.quests.length > 0}
    <section class="space-y-4">
      <h2 class="text-xl font-semibold flex items-center gap-2">
        <ScrollIcon class="h-5 w-5 text-orange-500" />
        Quest Line ({data.quests.length})
      </h2>
      <div class="rounded-lg border overflow-x-auto">
        <table class="w-full min-w-[56rem] table-fixed">
          <thead class="bg-muted/50">
            <tr>
              <th class="text-left p-3 font-medium w-10">#</th>
              <th class="text-left p-3 font-medium w-20">Type</th>
              <th class="text-left p-3 font-medium w-52">Quest</th>
              <th class="text-left p-3 font-medium w-72">Objective</th>
              <th class="text-left p-3 font-medium w-40">Rewards</th>
              <th class="text-right p-3 font-medium w-28">Recommended level</th>
            </tr>
          </thead>
          <tbody>
            {#each data.quests as quest, i (quest.id)}
              <tr class="border-t align-top hover:bg-muted/30">
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
                    {#if quest.conditions.length}
                      <details class="mt-2">
                        <summary
                          class="cursor-pointer text-sm text-blue-600 dark:text-blue-400"
                          >Access requirements</summary
                        >
                        <div class="mt-2">
                          <Requirements
                            roots={quest.conditions}
                            names={data.acquisitionNames}
                          />
                        </div>
                      </details>
                    {/if}
                  </div>
                </td>
                <td class="p-3">
                  <div class="space-y-2 leading-6">
                    {#each quest.objectives as root, rootIndex (rootIndex)}
                      {#each describeRequirement(root, data.acquisitionNames) as objective, objectiveIndex (objectiveIndex)}
                        <p>{objective.text}</p>
                      {/each}
                    {/each}
                  </div>
                  {#if quest.display_type === "Find"}
                    {#each quest.completion_npcs as npc (npc.npc_id)}
                      <a
                        href="/npcs/{npc.npc_id}"
                        class="block text-blue-600 dark:text-blue-400 hover:underline"
                        >{npc.npc_name}</a
                      >
                    {/each}
                  {/if}
                </td>
                <td class="p-3">
                  <div class="flex flex-col gap-1">
                    {#if quest.reward_gold > 0}
                      <span class="text-amber-600 dark:text-amber-400"
                        >{formatNumber(quest.reward_gold)} Gold</span
                      >
                    {/if}
                    {#each quest.reward_items as item (item.item_id)}
                      <ItemLink
                        itemId={item.item_id}
                        itemName={item.item_name}
                        tooltipHtml={item.tooltip_html}
                        imageAvailable={data.itemIconPaths[item.item_id]}
                      />
                    {/each}
                    {#if quest.reward_alchemy_skill > 0}
                      <span class="text-green-600 dark:text-green-400"
                        >+{formatPercent(quest.reward_alchemy_skill, {
                          decimals: 0,
                        })}
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
        <label for="skill-slider" class="shrink-0">Alchemy skill</label>
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
          >{formatPercent(alchemySkillGainChancePercent(skillLevel) / 100, {
            decimals: 0,
            trailingZeros: true,
          })}</span
        >
        <span class="text-xs">(per success)</span>
      </div>
    </div>
    <div class="rounded-lg border overflow-x-auto">
      <div
        class="grid whitespace-nowrap"
        style="grid-template-columns: repeat(5, 1fr);"
      >
        <div class="bg-muted/50 p-3 font-medium">Tier</div>
        <div class="bg-muted/50 p-3 font-medium">Success</div>
        <div class="bg-muted/50 p-3 font-medium">Skill Gain</div>
        <div class="bg-muted/50 p-3 font-medium text-right">XP</div>
        <div class="bg-muted/50 p-3 font-medium text-right">Recipes</div>
        {#each [0, 1, 2, 3, 4] as tier (tier)}
          {@const successChance = alchemySuccessPercent(tier, skillLevel)}
          {@const skillGain = alchemySkillGainRange(tier, skillLevel)}
          {@const recipeCount = recipeCountMap.get(tier) ?? 0}
          {@const xp = xpByTierMap.get(tier)}
          <div class="p-3 font-medium border-t">{romanNumerals[tier]}</div>
          <div class="p-3 border-t">
            {#if !qualifies(tier)}
              <span class="text-muted-foreground">Below attempt floor</span>
            {:else}
              <span class="font-mono {getSuccessChanceColor(successChance)}">
                {formatPercent(successChance / 100, {
                  decimals: 0,
                  trailingZeros: true,
                })}
              </span>
            {/if}
          </div>
          <div class="p-3 border-t">
            {#if skillGain}
              <span class="font-mono"
                >{formatNumber(skillGain.min, {
                  decimals: 2,
                  trailingZeros: true,
                })} to {formatPercent(skillGain.max / 100, {
                  decimals: 2,
                  trailingZeros: true,
                })}</span
              >
            {:else}
              <span class="text-muted-foreground">No skill gain</span>
            {/if}
          </div>
          <div class="p-3 text-right border-t">
            {#if xp}
              <MechanicsLink section="experience"
                >{formatNumber(xp)}</MechanicsLink
              >
            {:else}
              <span class="text-muted-foreground">—</span>
            {/if}
          </div>
          <div class="p-3 text-right border-t">{recipeCount}</div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Recipes Table -->
  <section class="space-y-4">
    <h2 class="text-xl font-semibold flex items-center gap-2">
      <FlaskConical class="h-5 w-5 text-purple-500" />
      Recipes ({recipeCountLabel})
    </h2>
    <div class="flex flex-wrap items-center gap-3">
      <Input
        type="search"
        placeholder="Filter by name…"
        bind:value={nameFilter}
        class="max-w-xs"
      />
      {#if tiersPresent.length > 1}
        <div class="flex flex-wrap items-center gap-1">
          {#each tiersPresent as tier (tier)}
            <button
              type="button"
              onclick={() => toggleTier(tier)}
              aria-pressed={tierFilter.has(tier)}
              class="rounded px-2 py-1 text-xs font-medium transition-colors {tierFilter.has(
                tier,
              )
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 hover:bg-muted'}"
            >
              Tier {romanNumerals[tier] ?? tier}
            </button>
          {/each}
        </div>
      {/if}
    </div>
    <div class="rounded-lg border overflow-x-auto">
      <div
        class="grid whitespace-nowrap"
        style="grid-template-columns: 1fr 2fr 4fr 1fr 2fr;"
      >
        <div class="bg-muted/50 p-3 font-medium">Tier</div>
        <div class="bg-muted/50 p-3 font-medium">Output</div>
        <div class="bg-muted/50 p-3 font-medium">Ingredients</div>
        <div class="bg-muted/50 p-3 font-medium">Success</div>
        <div class="bg-muted/50 p-3 font-medium">Skill Gain</div>
        {#each filteredRecipes as recipe (recipe.id)}
          {@const successChance = alchemySuccessPercent(
            recipe.level_required,
            skillLevel,
          )}
          {@const skillGain = alchemySkillGainRange(
            recipe.level_required,
            skillLevel,
          )}
          {@const isExpanded = expandedRecipes.has(recipe.id)}
          {@const canExpand = recipe.methods.length > 0}
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
              {romanNumerals[recipe.level_required] ?? recipe.level_required}
            </div>
          </div>
          <div {...cellProps(canExpand, recipe.id)}>
            <ItemLink
              itemId={recipe.result_item_id}
              itemName={recipe.result_item_name}
              tooltipHtml={recipe.result_tooltip_html}
            />
          </div>
          <div {...cellProps(canExpand, recipe.id)}>
            <div class="flex flex-col gap-1">
              {#each recipe.methods as method (method.methodId)}
                {#each method.costGroups as group (group.id)}
                  <div class="flex flex-col gap-1">
                    {#each group.inputs as input (input.id)}
                      <span class="inline-flex items-baseline gap-1">
                        {#if input.resource_kind === "gold"}
                          Gold
                        {:else if input.item_id}
                          <ItemLink
                            itemId={input.item_id}
                            itemName={data.acquisitionItems[input.item_id]
                              ?.name}
                          />
                        {:else}
                          Unpublished required item
                        {/if}
                        <span class="text-muted-foreground"
                          >×{formatNumber(input.amount)}</span
                        >
                      </span>
                    {/each}
                  </div>
                {/each}
              {/each}
            </div>
          </div>
          <div {...cellProps(canExpand, recipe.id)}>
            {#if !qualifies(recipe.level_required)}
              <span class="text-muted-foreground">Below attempt floor</span>
            {:else}
              <span class="font-mono {getSuccessChanceColor(successChance)}">
                {formatPercent(successChance / 100, {
                  decimals: 0,
                  trailingZeros: true,
                })}
              </span>
            {/if}
          </div>
          <div {...cellProps(canExpand, recipe.id)}>
            {#if qualifies(recipe.level_required) && skillGain}
              <span class="font-mono">
                {formatPercent(skillGain.min / 100, {
                  decimals: 2,
                  trailingZeros: true,
                })} – {formatPercent(skillGain.max / 100, {
                  decimals: 2,
                  trailingZeros: true,
                })}
              </span>
            {:else}
              <span class="text-muted-foreground">—</span>
            {/if}
          </div>
          {#if isExpanded && canExpand}
            <div
              class="bg-muted/20 p-4 space-y-4 whitespace-normal"
              style="grid-column: 1 / -1;"
            >
              <div class="max-w-[calc(100vw-6rem-2px)] space-y-4">
                <MethodList
                  methods={enteredMethods(recipe.methods)}
                  items={data.acquisitionItems}
                  names={data.acquisitionNames}
                  selectedItemId={recipe.result_item_id}
                />
                <div class="text-muted-foreground">
                  How to obtain ingredients:
                </div>
                <RecipeIngredients
                  methods={recipe.methods}
                  items={data.acquisitionItems}
                  names={data.acquisitionNames}
                />
              </div>
            </div>
          {/if}
        {/each}
        {#if filteredRecipes.length === 0}
          <div class="text-muted-foreground p-3" style="grid-column: 1 / -1;">
            No recipes match your filters.
          </div>
        {/if}
      </div>
    </div>
  </section>
</div>

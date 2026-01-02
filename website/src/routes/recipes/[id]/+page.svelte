<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import ObtainabilityTree from "$lib/components/ObtainabilityTree.svelte";
  import Hammer from "@lucide/svelte/icons/hammer";
  import FlaskConical from "@lucide/svelte/icons/flask-conical";
  import ChefHat from "@lucide/svelte/icons/chef-hat";
  import Package from "@lucide/svelte/icons/package";
  import ListTree from "@lucide/svelte/icons/list-tree";
  let { data } = $props();

  function getRecipeIcon(type: string) {
    switch (type) {
      case "Alchemy":
        return FlaskConical;
      case "Cooking":
        return ChefHat;
      default:
        return Hammer;
    }
  }

  function getTypeColor(type: string) {
    switch (type) {
      case "Alchemy":
        return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200";
      case "Cooking":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      default:
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    }
  }

  function formatStationType(station: string | null): string {
    if (!station) return "Unknown";
    const mapping: Record<string, string> = {
      cooking: "Cooking Station",
      alchemy_table: "Alchemy Table",
      unknown: "Crafting Station",
    };
    return mapping[station] ?? station;
  }

  function formatTier(tier: number): string {
    const romanNumerals = ["I", "II", "III", "IV", "V"];
    return `Tier ${romanNumerals[tier] ?? tier}`;
  }

  const hasIngredients = $derived(
    data.obtainabilityTree.recipe &&
      data.obtainabilityTree.recipe.materials.length > 0,
  );

  const RecipeIcon = $derived(getRecipeIcon(data.recipe.type));
</script>

<svelte:head>
  <title
    >{data.recipe.result_item_name} Recipe - Ancient Kingdoms Compendium</title
  >
  <meta name="description" content={data.description} />
</svelte:head>

<div class="container mx-auto p-8 space-y-6 max-w-5xl">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Recipes", href: "/recipes" },
      { label: data.recipe.result_item_name },
    ]}
  />

  <div>
    <div class="flex items-center gap-3 flex-wrap">
      <RecipeIcon class="h-8 w-8 text-muted-foreground" />
      <h1 class="text-3xl font-bold">{data.recipe.result_item_name}</h1>
      <span
        class="px-2 py-1 rounded text-sm font-medium {getTypeColor(
          data.recipe.type,
        )}"
      >
        {data.recipe.type}
      </span>
      <span class="px-2 py-1 rounded text-sm font-medium bg-muted">
        {formatTier(data.recipe.tier)}
      </span>
    </div>
    <p class="text-muted-foreground mt-2">
      Crafted at: {formatStationType(data.recipe.station_type)}
    </p>
  </div>

  <section class="bg-muted/30 rounded-md border p-4 space-y-4">
    <h2 class="text-lg font-semibold flex items-center gap-2">
      <Package class="h-5 w-5 text-muted-foreground" />
      Recipe
    </h2>

    <div class="grid gap-4 lg:grid-cols-3">
      {#if data.recipe.taught_by_recipe_id && data.recipe.taught_by_recipe_name}
        <div>
          <div class="text-sm text-muted-foreground mb-1">Taught by</div>
          <ItemLink
            itemId={data.recipe.taught_by_recipe_id}
            itemName={data.recipe.taught_by_recipe_name}
            tooltipHtml={data.recipe.taught_by_recipe_tooltip_html}
          />
        </div>
      {/if}

      {#if hasIngredients}
        <div>
          <div class="text-sm text-muted-foreground mb-1">Requires</div>
          <div class="space-y-1">
            {#each data.obtainabilityTree.recipe?.materials ?? [] as mat (mat.item_id)}
              <div class="flex items-center gap-2">
                <ItemLink
                  itemId={mat.item_id}
                  itemName={mat.item_name}
                  tooltipHtml={mat.tooltip_html}
                />
                <span class="text-muted-foreground">x{mat.amount}</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <div>
        <div class="text-sm text-muted-foreground mb-1">Creates</div>
        <div class="flex items-center gap-2">
          <ItemLink
            itemId={data.recipe.result_item_id}
            itemName={data.recipe.result_item_name}
            tooltipHtml={data.recipe.result_tooltip_html}
          />
          {#if data.recipe.result_amount > 1}
            <span class="text-muted-foreground"
              >x{data.recipe.result_amount}</span
            >
          {/if}
        </div>
      </div>
    </div>
  </section>

  {#if hasIngredients}
    <section class="bg-muted/30 rounded-md border p-4">
      <h2 class="text-lg font-semibold flex items-center gap-2 mb-4">
        <ListTree class="h-5 w-5 text-muted-foreground" />
        How to Obtain Ingredients
      </h2>

      <div class="bg-background rounded-md p-4 border overflow-x-auto">
        <div class="w-fit pr-2">
          <ObtainabilityTree node={data.obtainabilityTree} />
        </div>
      </div>
    </section>
  {/if}
</div>

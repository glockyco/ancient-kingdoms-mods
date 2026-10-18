<script lang="ts">
  import Breadcrumb from "$lib/components/Breadcrumb.svelte";
  import ItemLink from "$lib/components/ItemLink.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import { detailTitle } from "$lib/seo/title";
  import RecipeIngredients from "$lib/components/RecipeIngredients.svelte";
  import MethodList from "$lib/components/acquisition/MethodList.svelte";
  import Hammer from "@lucide/svelte/icons/hammer";
  import FlaskConical from "@lucide/svelte/icons/flask-conical";
  import ChefHat from "@lucide/svelte/icons/chef-hat";
  import Scroll from "@lucide/svelte/icons/scroll";
  import ListTree from "@lucide/svelte/icons/list-tree";
  import type { PageData } from "./$types";
  import type { MethodView } from "$lib/acquisition/types";
  let { data }: { data: PageData } = $props();
  const kind = $derived(String(data.variants[0].detail.display_kind));
  const RecipeIcon = $derived(
    kind === "alchemy"
      ? FlaskConical
      : kind === "cooking"
        ? ChefHat
        : kind === "scribing"
          ? Scroll
          : Hammer,
  );
  function ingredientLabel(method: MethodView): string {
    return method.costGroups
      .flatMap((group) => group.inputs)
      .map((input) => {
        const name =
          input.resource_kind === "gold"
            ? "Gold"
            : input.withheld
              ? "Unpublished required item"
              : data.acquisitionItems[input.item_id ?? ""]?.name;
        return `${name} ×${input.amount}`;
      })
      .join(" + ");
  }
</script>

<Seo
  title={detailTitle(data.recipe.result_item_name, { family: "Recipe" })}
  description={data.description}
  path={`/recipes/${data.recipe.id}`}
/>
<div class="container mx-auto p-8 space-y-6 max-w-5xl">
  <Breadcrumb
    items={[
      { label: "Home", href: "/" },
      { label: "Recipes", href: "/recipes" },
      { label: data.recipe.result_item_name },
    ]}
  />
  <div class="flex items-center gap-3 flex-wrap">
    <RecipeIcon class="h-8 w-8 text-muted-foreground" />
    <h1 class="text-3xl font-bold">{data.recipe.result_item_name}</h1>
    <span class="px-2 py-1 rounded text-sm font-medium bg-muted capitalize"
      >{kind}</span
    >
  </div>
  <section class="bg-muted/30 rounded-md border p-4 space-y-4">
    <h2 class="text-lg font-semibold">Recipe</h2>
    {#if data.teachers.length}
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-muted-foreground">Taught by</span
        >{#each data.teachers as teacher (teacher.id)}<ItemLink
            itemId={teacher.id}
            itemName={teacher.name}
            imageAvailable={teacher.icon_path}
            tooltipHtml={teacher.tooltip_html}
            variant="reference"
          />{/each}
      </div>
    {/if}
    {#each data.variants as variant, index (variant.methodId)}
      <div class="space-y-2">
        {#if data.variants.length > 1}<h3 class="font-semibold">
            Alternative {index + 1}: {ingredientLabel(variant)}
          </h3>{/if}
        <div class="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {#if variant.detail.display_kind !== "scribing"}<span
              >Tier {["I", "II", "III", "IV", "V"][
                Number(variant.detail.tier)
              ] ?? String(variant.detail.tier)}</span
            >{/if}{#if variant.detail.experience !== null}<span
              >XP: {Number(variant.detail.experience).toLocaleString(
                "en-US",
              )}</span
            >{/if}
        </div>
        <MethodList
          methods={[variant]}
          items={data.acquisitionItems}
          names={data.acquisitionNames}
        />
      </div>
    {/each}
  </section>
  <section class="bg-muted/30 rounded-md border p-4 space-y-4">
    <h2 class="text-lg font-semibold flex items-center gap-2">
      <ListTree class="h-5 w-5 text-muted-foreground" />How to obtain
      ingredients
    </h2>
    <RecipeIngredients
      methods={data.variants}
      items={data.acquisitionItems}
      names={data.acquisitionNames}
    />
  </section>
</div>

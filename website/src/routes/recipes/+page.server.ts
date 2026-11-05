import { getDb } from "$lib/db.server";
import { createListPagination } from "$lib/server/list-pagination";
import type { PageServerLoad } from "./$types";
import type { RecipesPageData, RecipeType } from "$lib/types/recipes";
import { getRecipeDefinitions } from "$lib/server/obtainability";

export const prerender = true;

const loadData = async (): Promise<RecipesPageData> => {
  const db = getDb();

  const routes = db
    .prepare(
      "SELECT id FROM crafting_recipes UNION SELECT id FROM alchemy_recipes UNION SELECT id FROM scribing_recipes",
    )
    .all() as { id: string }[];
  const definitions = await getRecipeDefinitions(
    db,
    routes.map((route) => route.id),
  );
  const seenRoutes = new Set<string>();
  const representatives = definitions.filter((definition) => {
    if (seenRoutes.has(definition.id)) return false;
    seenRoutes.add(definition.id);
    return true;
  });
  const order: Record<RecipeType, number> = {
    Alchemy: 0,
    Cooking: 1,
    Crafting: 2,
    Scribing: 3,
  };
  return {
    recipes: representatives
      .flatMap((definition) =>
        definition.outputs[0]?.item_id && definition.outputs[0].amount !== null
          ? [
              {
                id: definition.id,
                result_item_id: definition.outputs[0].item_id,
                result_item_name: definition.outputs[0].item_name,
                result_visual_public_path:
                  definition.outputs[0].visual_public_path,
                result_quality: definition.outputs[0].quality,
                result_amount: definition.outputs[0].amount,
                ingredients: definition.materials,
                type: definition.type,
                tier: definition.tier,
              },
            ]
          : [],
      )
      .sort(
        (a, b) =>
          order[a.type] - order[b.type] ||
          a.result_item_name.localeCompare(b.result_item_name),
      ),
  };
};

export const _pagination = createListPagination(
  "/recipes",
  20,
  loadData,
  (data) => data.recipes.length,
);
export const load = _pagination.load satisfies PageServerLoad;

import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import type {
  RecipesPageData,
  RecipeListView,
  RecipeType,
} from "$lib/types/recipes";
import { loadAcquisition } from "$lib/server/acquisition";
import { loadAcquisitionItems } from "$lib/acquisition/items";

export const prerender = true;
export const load: PageServerLoad = async (): Promise<RecipesPageData> => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });
  try {
    const anchors = db
      .prepare(
        "SELECT id FROM crafting_recipes UNION SELECT id FROM alchemy_recipes UNION SELECT id FROM scribing_recipes",
      )
      .all() as { id: string }[];
    const execute = async (
      sql: string,
      bindings: readonly (string | number | null)[],
    ) => db.prepare(sql).all(...bindings) as Record<string, unknown>[];
    const model = await loadAcquisition(execute, {
      kind: "recipes",
      recipeIds: anchors.map((row) => row.id),
    });
    const acquisitionItems = await loadAcquisitionItems(execute, model);
    const recipes: RecipeListView[] = [...model.methodViews.values()]
      .filter((method) => method.kind === "recipe")
      .map((method) => {
        const detail = method.detail;
        const resultId = String(detail.declared_result_item_id);
        const item = acquisitionItems[resultId];
        const kind = String(detail.display_kind);
        return {
          id: String(
            detail.crafting_recipe_id ??
              detail.alchemy_recipe_id ??
              detail.scribing_recipe_id,
          ),
          methodId: method.methodId,
          result_item_id: resultId,
          result_item_name: item.name,
          result_visual_public_path: item.icon_path,
          result_quality: item.quality,
          result_amount: Number(detail.result_amount),
          type: (kind[0].toUpperCase() + kind.slice(1)) as RecipeType,
          tier: Number(detail.tier),
          method,
          ingredients: method.costGroups
            .flatMap((group) => group.inputs)
            .filter((input) => input.resource_kind === "item")
            .map((input) => ({
              item_id: input.item_id,
              item_name: input.item_id
                ? (acquisitionItems[input.item_id]?.name ?? input.item_id)
                : "Unpublished required item",
              visual_public_path: input.item_id
                ? (acquisitionItems[input.item_id]?.icon_path ?? null)
                : null,
              amount: input.amount,
            })),
        };
      });
    recipes.sort(
      (a, b) =>
        a.type.localeCompare(b.type) ||
        a.result_item_name.localeCompare(b.result_item_name) ||
        a.methodId.localeCompare(b.methodId),
    );
    return { recipes, acquisitionItems };
  } finally {
    db.close();
  }
};

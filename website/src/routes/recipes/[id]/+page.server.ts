import Database from "better-sqlite3";
import { error } from "@sveltejs/kit";
import type { PageServerLoad, EntryGenerator } from "./$types";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import type {
  RecipeDetailInfo,
  RecipeDetailPageData,
} from "$lib/types/recipes";
import { loadAcquisition } from "$lib/server/acquisition";
import { loadAcquisitionItems } from "$lib/acquisition/items";
import { quantityText } from "$lib/components/acquisition/display";
import {
  projectAcquisitionNames,
  projectRecipeTeachers,
} from "$lib/acquisition/projections";

export const prerender = true;
export const entries: EntryGenerator = () => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });
  try {
    return db
      .prepare(
        "SELECT id FROM crafting_recipes UNION SELECT id FROM alchemy_recipes UNION SELECT id FROM scribing_recipes",
      )
      .all() as { id: string }[];
  } finally {
    db.close();
  }
};

export const load: PageServerLoad = async ({
  params,
}): Promise<RecipeDetailPageData> => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });
  try {
    const execute = async (
      sql: string,
      bindings: readonly (string | number | null)[],
    ) => db.prepare(sql).all(...bindings) as Record<string, unknown>[];
    const model = await loadAcquisition(execute, {
      kind: "recipes",
      recipeIds: [params.id],
    });
    const variants = [...model.methodViews.values()].filter(
      (method) =>
        method.kind === "recipe" &&
        [
          method.detail.crafting_recipe_id,
          method.detail.alchemy_recipe_id,
          method.detail.scribing_recipe_id,
        ].includes(params.id),
    );
    if (!variants.length) throw error(404, `Recipe not found: ${params.id}`);
    const resultItemId = String(variants[0].detail.declared_result_item_id);
    const recipe = db
      .prepare(
        `SELECT ? AS id, i.id AS result_item_id, i.name AS result_item_name, i.quality AS result_quality,
      i.tooltip_html AS result_tooltip_html, v.public_path AS result_visual_public_path
      FROM items i LEFT JOIN visual_assets v ON v.domain='item' AND v.entity_id=i.id AND v.kind='icon'
      WHERE i.id=?`,
      )
      .get(params.id, resultItemId) as RecipeDetailInfo;
    const teachers = projectRecipeTeachers(model, resultItemId);
    const acquisitionItems = await loadAcquisitionItems(execute, model);
    const kinds = [
      ...new Set(variants.map((method) => String(method.detail.display_kind))),
    ];
    const outcomes = [
      ...new Set(
        variants.map((method) =>
          method.outputs
            .map(
              (output) =>
                `${output.resource_kind === "gold" ? "gold" : (acquisitionItems[output.item_id ?? ""]?.name ?? "unpublished item")} × ${quantityText(output.quantity)}`,
            )
            .join(" + "),
        ),
      ),
    ];
    const description = `${recipe.result_item_name} ${kinds.join(" / ")} recipe. On success: ${outcomes.join(" or ")}. ${variants.length} ${variants.length === 1 ? "option" : "alternatives"} with exact ingredients, costs and requirements.`;
    return {
      recipe,
      variants,
      teachers,
      description,
      acquisitionItems,
      acquisitionNames: projectAcquisitionNames(model),
    };
  } finally {
    db.close();
  }
};

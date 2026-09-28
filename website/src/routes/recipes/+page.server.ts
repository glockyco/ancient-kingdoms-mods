import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import type {
  RecipesPageData,
  RecipeListView,
  RecipeIngredient,
} from "$lib/types/recipes";

export const prerender = true;

interface RawRecipe {
  id: string;
  result_item_id: string;
  result_item_name: string;
  result_visual_public_path: string | null;
  result_quality: number;
  result_amount: number;
  type: "Alchemy" | "Cooking" | "Crafting" | "Scribing";
  tier: number;
}

export const load: PageServerLoad = (): RecipesPageData => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });

  const rawRecipes = db
    .prepare(
      `
      WITH all_recipes AS (
        -- Alchemy recipes
        SELECT
          ar.id,
          ar.result_item_id,
          i.name as result_item_name,
          va.public_path as result_visual_public_path,
          i.quality as result_quality,
          1 as result_amount,
          'Alchemy' as type,
          ar.level_required as tier
        FROM alchemy_recipes ar
        JOIN items i ON i.id = ar.result_item_id
        LEFT JOIN visual_assets va
          ON va.domain = 'item' AND va.entity_id = i.id AND va.kind = 'icon'

        UNION ALL

        -- Crafting recipes (cooking and other)
        SELECT
          cr.id,
          cr.result_item_id,
          i.name as result_item_name,
          va.public_path as result_visual_public_path,
          i.quality as result_quality,
          cr.result_amount,
          CASE WHEN cr.station_type = 'cooking' THEN 'Cooking' ELSE 'Crafting' END as type,
          i.quality as tier
        FROM crafting_recipes cr
        JOIN items i ON i.id = cr.result_item_id
        LEFT JOIN visual_assets va
          ON va.domain = 'item' AND va.entity_id = i.id AND va.kind = 'icon'

        UNION ALL

        -- Scribing recipes (scrolls)
        SELECT
          sr.id,
          sr.result_item_id,
          i.name as result_item_name,
          va.public_path as result_visual_public_path,
          i.quality as result_quality,
          1 as result_amount,
          'Scribing' as type,
          sr.level_required as tier
        FROM scribing_recipes sr
        JOIN items i ON i.id = sr.result_item_id
        LEFT JOIN visual_assets va
          ON va.domain = 'item' AND va.entity_id = i.id AND va.kind = 'icon'
      )
      SELECT * FROM all_recipes
      ORDER BY
        CASE type
          WHEN 'Alchemy' THEN 1
          WHEN 'Cooking' THEN 2
          WHEN 'Crafting' THEN 3
          WHEN 'Scribing' THEN 4
        END,
        result_item_name
    `,
    )
    .all() as RawRecipe[];

  const ingredientRows = db
    .prepare(
      `SELECT u.recipe_id, u.item_id, i.name AS item_name, u.amount,
            va.public_path AS visual_public_path
     FROM item_usages_recipe u
     JOIN items i ON i.id = u.item_id
     LEFT JOIN visual_assets va
       ON va.domain = 'item' AND va.entity_id = i.id AND va.kind = 'icon'
     ORDER BY u.recipe_id, i.name COLLATE BINARY, i.id, u.id`,
    )
    .all() as Array<RecipeIngredient & { recipe_id: string }>;
  db.close();

  const ingredientsByRecipe = new Map<string, RecipeIngredient[]>();
  for (const { recipe_id, ...ingredient } of ingredientRows) {
    const ingredients = ingredientsByRecipe.get(recipe_id);
    if (ingredients) ingredients.push(ingredient);
    else ingredientsByRecipe.set(recipe_id, [ingredient]);
  }
  const recipes: RecipeListView[] = rawRecipes.map((raw) => ({
    id: raw.id,
    result_item_id: raw.result_item_id,
    result_item_name: raw.result_item_name,
    result_visual_public_path: raw.result_visual_public_path,
    result_quality: raw.result_quality,
    result_amount: raw.result_amount,
    ingredients: ingredientsByRecipe.get(raw.id) ?? [],
    type: raw.type,
    tier: raw.tier,
  }));

  return { recipes };
};

import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
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
  result_tooltip_html: string | null;
  result_quality: number;
  result_amount: number;
  materials: string;
  type: "Alchemy" | "Cooking" | "Crafting";
  tier: number;
}

interface RawMaterial {
  item_id: string;
  amount: number;
}

export const load: PageServerLoad = (): RecipesPageData => {
  const db = new Database("static/compendium.db", { readonly: true });

  const rawRecipes = db
    .prepare(
      `
      WITH all_recipes AS (
        -- Alchemy recipes
        SELECT
          ar.id,
          ar.result_item_id,
          i.name as result_item_name,
          i.tooltip_html as result_tooltip_html,
          i.quality as result_quality,
          1 as result_amount,
          ar.materials,
          'Alchemy' as type,
          ar.level_required as tier
        FROM alchemy_recipes ar
        JOIN items i ON i.id = ar.result_item_id

        UNION ALL

        -- Crafting recipes (cooking and other)
        SELECT
          cr.id,
          cr.result_item_id,
          i.name as result_item_name,
          i.tooltip_html as result_tooltip_html,
          i.quality as result_quality,
          cr.result_amount,
          cr.materials,
          CASE WHEN cr.station_type = 'cooking' THEN 'Cooking' ELSE 'Crafting' END as type,
          i.quality as tier
        FROM crafting_recipes cr
        JOIN items i ON i.id = cr.result_item_id
      )
      SELECT * FROM all_recipes
      ORDER BY
        CASE type
          WHEN 'Alchemy' THEN 1
          WHEN 'Cooking' THEN 2
          WHEN 'Crafting' THEN 3
        END,
        result_item_name
    `,
    )
    .all() as RawRecipe[];

  // Collect all unique ingredient item_ids
  const allIngredientIds = new Set<string>();
  for (const recipe of rawRecipes) {
    if (recipe.materials) {
      const materials = JSON.parse(recipe.materials) as RawMaterial[];
      for (const m of materials) {
        allIngredientIds.add(m.item_id);
      }
    }
  }

  // Batch query ingredient names
  const ingredientNames = new Map<string, string>();
  if (allIngredientIds.size > 0) {
    const placeholders = Array.from(allIngredientIds)
      .map(() => "?")
      .join(",");
    const ingredientRows = db
      .prepare(`SELECT id, name FROM items WHERE id IN (${placeholders})`)
      .all(Array.from(allIngredientIds)) as { id: string; name: string }[];
    for (const row of ingredientRows) {
      ingredientNames.set(row.id, row.name);
    }
  }

  db.close();

  // Transform raw recipes to RecipeListView with resolved ingredient names
  const recipes: RecipeListView[] = rawRecipes.map((raw) => {
    const materials = raw.materials
      ? (JSON.parse(raw.materials) as RawMaterial[])
      : [];
    const ingredients: RecipeIngredient[] = materials.map((m) => ({
      item_id: m.item_id,
      item_name: ingredientNames.get(m.item_id) ?? m.item_id,
      amount: m.amount,
    }));

    return {
      id: raw.id,
      result_item_id: raw.result_item_id,
      result_item_name: raw.result_item_name,
      result_tooltip_html: raw.result_tooltip_html,
      result_quality: raw.result_quality,
      result_amount: raw.result_amount,
      ingredients,
      type: raw.type,
      tier: raw.tier,
    };
  });

  return { recipes };
};

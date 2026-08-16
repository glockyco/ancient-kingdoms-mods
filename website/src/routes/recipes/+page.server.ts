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
  materials: string;
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
          ar.materials,
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
          cr.materials,
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
          sr.materials,
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

  const itemVisualRows = db
    .prepare(
      `SELECT entity_id, public_path
       FROM visual_assets
       WHERE domain = 'item' AND kind = 'icon'`,
    )
    .all() as Array<{ entity_id: string; public_path: string | null }>;
  const itemVisuals = new Map(
    itemVisualRows.map((row) => [row.entity_id, row.public_path] as const),
  );

  db.close();

  // Materials JSON is pre-enriched with item_name by the build pipeline.
  // Artwork is joined by item ID from the canonical visual_assets table.
  const recipes: RecipeListView[] = rawRecipes.map((raw) => ({
    id: raw.id,
    result_item_id: raw.result_item_id,
    result_item_name: raw.result_item_name,
    result_visual_public_path: raw.result_visual_public_path,
    result_quality: raw.result_quality,
    result_amount: raw.result_amount,
    ingredients: raw.materials
      ? (
          JSON.parse(raw.materials) as Array<
            Omit<RecipeIngredient, "visual_public_path">
          >
        ).map((ingredient) => ({
          ...ingredient,
          visual_public_path: itemVisuals.get(ingredient.item_id) ?? null,
        }))
      : [],
    type: raw.type,
    tier: raw.tier,
  }));

  return { recipes };
};

import Database from "better-sqlite3";
import { error } from "@sveltejs/kit";
import type { PageServerLoad, EntryGenerator } from "./$types";
import { DB_STATIC_PATH } from "$lib/constants/constants";
import type {
  RecipeDetailPageData,
  RecipeDetailInfo,
  RecipeType,
} from "$lib/types/recipes";
import { buildObtainabilityTree } from "$lib/server/obtainability";
import { recipeDescription } from "$lib/server/meta-description";

export const prerender = true;

// Generate entries for all recipes at build time
export const entries: EntryGenerator = () => {
  const db = new Database(DB_STATIC_PATH, { readonly: true });

  const craftingRecipes = db
    .prepare("SELECT id FROM crafting_recipes")
    .all() as Array<{ id: string }>;

  const alchemyRecipes = db
    .prepare("SELECT id FROM alchemy_recipes")
    .all() as Array<{ id: string }>;

  const scribingRecipes = db
    .prepare("SELECT id FROM scribing_recipes")
    .all() as Array<{ id: string }>;

  db.close();

  return [
    ...craftingRecipes.map((r) => ({ id: r.id })),
    ...alchemyRecipes.map((r) => ({ id: r.id })),
    ...scribingRecipes.map((r) => ({ id: r.id })),
  ];
};

export const load: PageServerLoad = ({ params }): RecipeDetailPageData => {
  const db = new Database(DB_STATIC_PATH, { readonly: true });

  // Try crafting_recipes, then alchemy_recipes, then scribing_recipes
  let recipe = loadCraftingRecipe(db, params.id);
  if (!recipe) {
    recipe = loadAlchemyRecipe(db, params.id);
  }
  if (!recipe) {
    recipe = loadScribingRecipe(db, params.id);
  }

  if (!recipe) {
    db.close();
    throw error(404, `Recipe not found: ${params.id}`);
  }

  // Build the obtainability tree for the result item
  const visited = new Set<string>();
  const obtainabilityTree = buildObtainabilityTree(
    db,
    recipe.result_item_id,
    recipe.result_amount,
    0,
    visited,
    true,
  );

  // Build ingredients list for meta description
  const ingredients =
    obtainabilityTree.recipe?.materials.map((mat) => ({
      item_name: mat.item_name,
      amount: mat.amount,
    })) ?? [];

  const description = recipeDescription(
    { result_item_name: recipe.result_item_name, type: recipe.type },
    ingredients,
  );

  db.close();

  return {
    recipe,
    description,
    obtainabilityTree,
  };
};

function loadCraftingRecipe(
  db: Database.Database,
  recipeId: string,
): RecipeDetailInfo | null {
  const raw = db
    .prepare(
      `
      SELECT
        cr.id,
        cr.result_item_id,
        i.name as result_item_name,
        i.tooltip_html as result_tooltip_html,
        i.quality as result_quality,
        cr.result_amount,
        cr.station_type,
        cr.crafting_exp,
        cr.materials
      FROM crafting_recipes cr
      JOIN items i ON i.id = cr.result_item_id
      WHERE cr.id = ?
    `,
    )
    .get(recipeId) as
    | {
        id: string;
        result_item_id: string;
        result_item_name: string;
        result_tooltip_html: string | null;
        result_quality: number;
        result_amount: number;
        station_type: string | null;
        crafting_exp: number;
        materials: string;
      }
    | undefined;

  if (!raw) return null;

  const type: RecipeType =
    raw.station_type === "cooking" ? "Cooking" : "Crafting";

  return {
    id: raw.id,
    result_item_id: raw.result_item_id,
    result_item_name: raw.result_item_name,
    result_tooltip_html: raw.result_tooltip_html,
    result_quality: raw.result_quality,
    result_amount: raw.result_amount,
    type,
    tier: raw.result_quality,
    station_type: raw.station_type,
    xp: raw.crafting_exp,
    taught_by_recipe_id: null,
    taught_by_recipe_name: null,
    taught_by_recipe_tooltip_html: null,
  };
}

function loadAlchemyRecipe(
  db: Database.Database,
  recipeId: string,
): RecipeDetailInfo | null {
  const raw = db
    .prepare(
      `
      SELECT
        ar.id,
        ar.result_item_id,
        i.name as result_item_name,
        i.tooltip_html as result_tooltip_html,
        i.quality as result_quality,
        i.taught_by_recipe_id,
        i.taught_by_recipe_name,
        ar.level_required,
        ar.alchemy_exp,
        ar.materials
      FROM alchemy_recipes ar
      JOIN items i ON i.id = ar.result_item_id
      WHERE ar.id = ?
    `,
    )
    .get(recipeId) as
    | {
        id: string;
        result_item_id: string;
        result_item_name: string;
        result_tooltip_html: string | null;
        result_quality: number;
        taught_by_recipe_id: string | null;
        taught_by_recipe_name: string | null;
        level_required: number;
        alchemy_exp: number;
        materials: string;
      }
    | undefined;

  if (!raw) return null;

  // Get tooltip for the recipe item if it exists
  let taught_by_recipe_tooltip_html: string | null = null;
  if (raw.taught_by_recipe_id) {
    const recipeItem = db
      .prepare(`SELECT tooltip_html FROM items WHERE id = ?`)
      .get(raw.taught_by_recipe_id) as
      | { tooltip_html: string | null }
      | undefined;
    taught_by_recipe_tooltip_html = recipeItem?.tooltip_html ?? null;
  }

  return {
    id: raw.id,
    result_item_id: raw.result_item_id,
    result_item_name: raw.result_item_name,
    result_tooltip_html: raw.result_tooltip_html,
    result_quality: raw.result_quality,
    result_amount: 1,
    type: "Alchemy",
    tier: raw.level_required,
    station_type: "alchemy_table",
    xp: raw.alchemy_exp,
    taught_by_recipe_id: raw.taught_by_recipe_id,
    taught_by_recipe_name: raw.taught_by_recipe_name,
    taught_by_recipe_tooltip_html,
  };
}

function loadScribingRecipe(
  db: Database.Database,
  recipeId: string,
): RecipeDetailInfo | null {
  const raw = db
    .prepare(
      `
      SELECT
        sr.id,
        sr.result_item_id,
        i.name as result_item_name,
        i.tooltip_html as result_tooltip_html,
        i.quality as result_quality,
        sr.level_required,
        sr.materials
      FROM scribing_recipes sr
      JOIN items i ON i.id = sr.result_item_id
      WHERE sr.id = ?
    `,
    )
    .get(recipeId) as
    | {
        id: string;
        result_item_id: string;
        result_item_name: string;
        result_tooltip_html: string | null;
        result_quality: number;
        level_required: number;
        materials: string;
      }
    | undefined;

  if (!raw) return null;

  return {
    id: raw.id,
    result_item_id: raw.result_item_id,
    result_item_name: raw.result_item_name,
    result_tooltip_html: raw.result_tooltip_html,
    result_quality: raw.result_quality,
    result_amount: 1,
    type: "Scribing",
    tier: raw.level_required,
    station_type: "scribing_table",
    xp: 0,
    taught_by_recipe_id: null,
    taught_by_recipe_name: null,
    taught_by_recipe_tooltip_html: null,
  };
}

import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import type { AcquisitionQuery, MethodView } from "$lib/acquisition/types";
import { loadAcquisition } from "$lib/server/acquisition";
import {
  loadAcquisitionItems,
  type AcquisitionItem,
} from "$lib/acquisition/items";

import { DB_SOURCE_PATH } from "$lib/constants/constants";

import { projectAcquisitionNames } from "$lib/acquisition/projections";
export const prerender = true;

interface CookingRecipe {
  id: string;
  recipe_id: string;
  result_item_id: string;
  result_amount: number;
  result_item_name: string;
  result_tooltip_html: string | null;
  result_quality: number;
  result_item_type: string | null;
  methods: readonly MethodView[];
}

interface StationLocation {
  id: string;
  zone_id: string;
  zone_name: string;
  sub_zone_name: string | null;
}

interface TierCount {
  tier: number;
  count: number;
}

interface TierXp {
  tier: number;
  xp: number;
}

interface CookingPageData {
  profession: {
    id: string;
    name: string;
    description: string;
    category: string;
    max_level: number;
    achievement_id: string;
    achievement_name: string;
  };
  recipes: CookingRecipe[];
  acquisitionItems: Record<string, AcquisitionItem>;
  acquisitionNames: Readonly<Record<string, string>>;
  locations: StationLocation[];
  recipeCounts: TierCount[];
  xpByTier: TierXp[];
}

export const load: PageServerLoad = async (): Promise<CookingPageData> => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });
  const execute: AcquisitionQuery = async (sql, params) =>
    db.prepare(sql).all(...params) as Record<string, unknown>[];

  const profession = db
    .prepare(
      `
    SELECT
      id,
      name,
      description,
      category,
      max_level,
      achievement_id,
      (SELECT name FROM achievements WHERE id = achievement_id) AS achievement_name
    FROM professions
    WHERE id = 'cooking'
  `,
    )
    .get() as CookingPageData["profession"];

  // Cooking recipes use item quality as the tier (same formula as alchemy)
  const rawRecipes = db
    .prepare(
      `
    SELECT
      d.id,
      cr.id as recipe_id,
      cr.result_item_id,
      d.result_amount,
      i.name as result_item_name,
      i.tooltip_html as result_tooltip_html,
      i.quality as result_quality,
      i.item_type as result_item_type
    FROM acquisition_recipe_details d
    JOIN crafting_recipes cr ON cr.id = d.crafting_recipe_id
    JOIN items i ON i.id = cr.result_item_id
    WHERE d.display_kind = 'cooking'
    ORDER BY i.quality, i.name, cr.id
  `,
    )
    .all() as Omit<CookingRecipe, "methods">[];

  const recipeModel = await loadAcquisition(execute, {
    kind: "recipes",
    recipeIds: rawRecipes.map((recipe) => recipe.recipe_id),
  });
  const recipes: CookingRecipe[] = rawRecipes.map((recipe) => {
    const method = recipeModel.methodViews.get(recipe.id);
    if (!method) throw new Error(`Missing cooking method ${recipe.id}`);
    return { ...recipe, methods: [method] };
  });
  const acquisitionItems = await loadAcquisitionItems(execute, recipeModel);

  const locations = db
    .prepare(
      `
    SELECT DISTINCT s.id, s.zone_id, s.zone_name, s.sub_zone_name
    FROM crafting_stations s
    JOIN acquisition_providers_crafting_stations p ON p.crafting_station_id = s.id
    JOIN acquisition_recipe_details d ON d.id = p.method_id
    WHERE d.display_kind = 'cooking'
    ORDER BY s.zone_name, s.sub_zone_name
  `,
    )
    .all() as StationLocation[];

  // Get recipe counts per tier (using item quality as tier)
  const recipeCounts = db
    .prepare(
      `
    SELECT d.tier, COUNT(*) as count
    FROM acquisition_recipe_details d
    WHERE d.display_kind = 'cooking'
    GROUP BY d.tier
    ORDER BY d.tier
  `,
    )
    .all() as TierCount[];

  // Get XP per tier (cooking uses item quality as tier)
  const xpByTier = db
    .prepare(
      `
    SELECT d.tier, MAX(d.experience) as xp
    FROM acquisition_recipe_details d
    WHERE d.display_kind = 'cooking'
    GROUP BY d.tier
    ORDER BY d.tier
  `,
    )
    .all() as TierXp[];

  db.close();

  return {
    profession,
    recipes,
    acquisitionItems,
    acquisitionNames: projectAcquisitionNames(recipeModel),
    locations,
    recipeCounts,
    xpByTier,
  };
};

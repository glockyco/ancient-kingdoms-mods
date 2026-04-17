import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import type { ObtainabilityNode } from "$lib/types/recipes";
import { buildObtainabilityTree } from "$lib/server/obtainability";

import { DB_STATIC_PATH } from "$lib/constants/constants";

export const prerender = true;

interface CookingRecipe {
  id: string;
  result_item_id: string;
  result_item_name: string;
  result_tooltip_html: string | null;
  result_quality: number;
  obtainabilityTree: ObtainabilityNode;
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
    steam_achievement_id: string | null;
    steam_achievement_name: string | null;
  };
  recipes: CookingRecipe[];
  locations: StationLocation[];
  recipeCounts: TierCount[];
  xpByTier: TierXp[];
}

export const load: PageServerLoad = (): CookingPageData => {
  const db = new Database(DB_STATIC_PATH, { readonly: true });

  const profession = db
    .prepare(
      `
    SELECT
      id,
      name,
      description,
      category,
      max_level,
      steam_achievement_id,
      steam_achievement_name
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
      cr.id,
      cr.result_item_id,
      i.name as result_item_name,
      i.tooltip_html as result_tooltip_html,
      i.quality as result_quality
    FROM crafting_recipes cr
    JOIN items i ON i.id = cr.result_item_id
    WHERE cr.station_type = 'cooking'
    ORDER BY i.quality, i.name
  `,
    )
    .all() as Omit<CookingRecipe, "obtainabilityTree">[];

  const recipes: CookingRecipe[] = rawRecipes.map((recipe) => {
    const visited = new Set<string>();
    const obtainabilityTree = buildObtainabilityTree(
      db,
      recipe.result_item_id,
      1,
      0,
      visited,
      true,
    );
    return { ...recipe, obtainabilityTree };
  });

  const locations = db
    .prepare(
      `
    SELECT id, zone_id, zone_name, sub_zone_name
    FROM crafting_stations
    WHERE is_cooking_oven = 1
    ORDER BY zone_name, sub_zone_name
  `,
    )
    .all() as StationLocation[];

  // Get recipe counts per tier (using item quality as tier)
  const recipeCounts = db
    .prepare(
      `
    SELECT i.quality as tier, COUNT(*) as count
    FROM crafting_recipes cr
    JOIN items i ON i.id = cr.result_item_id
    WHERE cr.station_type = 'cooking'
    GROUP BY i.quality
    ORDER BY i.quality
  `,
    )
    .all() as TierCount[];

  // Get XP per tier (cooking uses item quality as tier)
  const xpByTier = db
    .prepare(
      `
    SELECT i.quality as tier, MAX(cr.crafting_exp) as xp
    FROM crafting_recipes cr
    JOIN items i ON i.id = cr.result_item_id
    WHERE cr.station_type = 'cooking'
    GROUP BY i.quality
    ORDER BY i.quality
  `,
    )
    .all() as TierXp[];

  db.close();

  return { profession, recipes, locations, recipeCounts, xpByTier };
};

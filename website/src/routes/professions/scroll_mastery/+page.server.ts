import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import { DB_STATIC_PATH } from "$lib/constants/constants";
import type { ObtainabilityNode } from "$lib/types/recipes";
import { buildObtainabilityTree } from "$lib/server/obtainability";

export const prerender = true;

interface ScribingRecipe {
  id: string;
  result_item_id: string;
  result_item_name: string;
  result_tooltip_html: string | null;
  result_quality: number;
  level_required: number;
  obtainabilityTree: ObtainabilityNode;
}

interface StationLocation {
  zone_id: string;
  zone_name: string;
  sub_zone_name: string | null;
  position_x: number;
  position_y: number;
}

interface TierCount {
  tier: number;
  count: number;
}

interface ScrollMasteryPageData {
  profession: {
    id: string;
    name: string;
    description: string;
    category: string;
    max_level: number;
    steam_achievement_id: string | null;
    steam_achievement_name: string | null;
  };
  recipes: ScribingRecipe[];
  locations: StationLocation[];
  recipeCounts: TierCount[];
}

export const load: PageServerLoad = (): ScrollMasteryPageData => {
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
    WHERE id = 'scroll_mastery'
  `,
    )
    .get() as ScrollMasteryPageData["profession"];

  interface RawRecipe {
    id: string;
    result_item_id: string;
    result_item_name: string;
    result_tooltip_html: string | null;
    result_quality: number;
    level_required: number;
  }

  const rawRecipes = db
    .prepare(
      `
    SELECT
      sr.id,
      sr.result_item_id,
      i.name AS result_item_name,
      i.tooltip_html AS result_tooltip_html,
      i.quality AS result_quality,
      sr.level_required
    FROM scribing_recipes sr
    JOIN items i ON i.id = sr.result_item_id
    ORDER BY sr.level_required, i.name
  `,
    )
    .all() as RawRecipe[];

  const recipes: ScribingRecipe[] = rawRecipes.map((recipe) => {
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
    SELECT zone_id, zone_name, sub_zone_name, position_x, position_y
    FROM scribing_tables
    ORDER BY zone_name, sub_zone_name
  `,
    )
    .all() as StationLocation[];

  // Recipe counts per mastery tier (level_required is mastery %, e.g. 0, 25, 50)
  const recipeCounts = db
    .prepare(
      `
    SELECT level_required AS tier, COUNT(*) AS count
    FROM scribing_recipes
    GROUP BY level_required
    ORDER BY level_required
  `,
    )
    .all() as TierCount[];

  db.close();

  return { profession, recipes, locations, recipeCounts };
};

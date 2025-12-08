import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import type { ObtainabilityNode } from "$lib/types/recipes";
import { buildObtainabilityTree } from "$lib/server/obtainability";

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
  zone_id: string;
  zone_name: string;
  sub_zone_name: string | null;
  position_x: number;
  position_y: number;
}

interface CookingPageData {
  profession: {
    id: string;
    name: string;
    description: string;
    category: string;
    max_level: number;
    steam_achievement_id: string | null;
  };
  recipes: CookingRecipe[];
  locations: StationLocation[];
}

export const load: PageServerLoad = (): CookingPageData => {
  const db = new Database("static/compendium.db", { readonly: true });

  const profession = db
    .prepare(
      `
    SELECT
      id,
      name,
      description,
      category,
      max_level,
      steam_achievement_id
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
    SELECT zone_id, zone_name, sub_zone_name, position_x, position_y
    FROM crafting_stations
    WHERE is_cooking_oven = 1
    ORDER BY zone_name, sub_zone_name
  `,
    )
    .all() as StationLocation[];

  db.close();

  return { profession, recipes, locations };
};

import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import type { ObtainabilityNode } from "$lib/types/recipes";
import { buildObtainabilityTree } from "$lib/server/obtainability";

export const prerender = true;

interface AlchemyRecipe {
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

interface AlchemyPageData {
  profession: {
    id: string;
    name: string;
    description: string;
    category: string;
    max_level: number;
    steam_achievement_id: string | null;
  };
  recipes: AlchemyRecipe[];
  locations: StationLocation[];
}

export const load: PageServerLoad = (): AlchemyPageData => {
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
    WHERE id = 'alchemy'
  `,
    )
    .get() as AlchemyPageData["profession"];

  const rawRecipes = db
    .prepare(
      `
    SELECT
      ar.id,
      ar.result_item_id,
      i.name as result_item_name,
      i.tooltip_html as result_tooltip_html,
      i.quality as result_quality,
      ar.level_required
    FROM alchemy_recipes ar
    JOIN items i ON i.id = ar.result_item_id
    ORDER BY ar.level_required, i.name
  `,
    )
    .all() as Omit<AlchemyRecipe, "obtainabilityTree">[];

  const recipes: AlchemyRecipe[] = rawRecipes.map((recipe) => {
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
    FROM alchemy_tables
    ORDER BY zone_name, sub_zone_name
  `,
    )
    .all() as StationLocation[];

  db.close();

  return { profession, recipes, locations };
};

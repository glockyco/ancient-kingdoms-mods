import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import {
  getRecipeDefinitions,
  buildRecipeObtainabilityTree,
} from "$lib/server/obtainability";

export const prerender = true;

export const load: PageServerLoad = async () => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });
  try {
    const profession = db
      .prepare(
        `SELECT p.*, a.name AS achievement_name FROM professions p
      LEFT JOIN achievements a ON a.id=p.achievement_id WHERE p.id='cooking'`,
      )
      .get() as {
      id: string;
      name: string;
      description: string;
      category: string;
      max_level: number;
      achievement_id: string;
      achievement_name: string;
    };
    const routes = db
      .prepare(
        `SELECT DISTINCT crafting_recipe_id AS id FROM acquisition_recipe_details WHERE display_kind='cooking'`,
      )
      .all() as { id: string }[];
    const definitions = (
      await getRecipeDefinitions(
        db,
        routes.map((r) => r.id),
      )
    ).filter((d) => d.type === "Cooking");
    const recipes = [];
    for (const definition of definitions) {
      const item = db
        .prepare("SELECT item_type FROM items WHERE id=?")
        .get(definition.result_item_id) as { item_type: string | null };
      recipes.push({
        id: definition.method_id,
        result_item_id: definition.result_item_id,
        result_item_name: definition.result_item_name,
        result_tooltip_html: definition.result_tooltip_html,
        result_quality: definition.tier,
        result_item_type: item.item_type,
        obtainabilityTree: await buildRecipeObtainabilityTree(db, definition),
      });
    }
    recipes.sort(
      (a, b) =>
        a.result_quality - b.result_quality ||
        a.result_item_name.localeCompare(b.result_item_name),
    );
    const locations = db
      .prepare(
        `SELECT DISTINCT s.id, s.zone_id, s.zone_name, s.sub_zone_name
      FROM crafting_stations s JOIN acquisition_providers_crafting_stations p ON p.crafting_station_id=s.id
      JOIN acquisition_recipe_details d ON d.id=p.method_id WHERE d.display_kind='cooking'
      ORDER BY s.zone_name, s.sub_zone_name`,
      )
      .all() as {
      id: string;
      zone_id: string;
      zone_name: string;
      sub_zone_name: string | null;
    }[];
    const recipeCounts = db
      .prepare(
        `SELECT tier, COUNT(*) AS count FROM acquisition_recipe_details
      WHERE display_kind='cooking' GROUP BY tier ORDER BY tier`,
      )
      .all() as { tier: number; count: number }[];
    const xpByTier = db
      .prepare(
        `SELECT tier, MAX(experience) AS xp FROM acquisition_recipe_details
      WHERE display_kind='cooking' GROUP BY tier ORDER BY tier`,
      )
      .all() as { tier: number; xp: number }[];
    return {
      profession: {
        ...profession,
        description: "Prepare food at cooking stations.",
      },
      recipes,
      locations,
      recipeCounts,
      xpByTier,
    };
  } finally {
    db.close();
  }
};

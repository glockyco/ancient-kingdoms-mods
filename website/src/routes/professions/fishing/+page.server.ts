import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import { DB_STATIC_PATH } from "$lib/constants/constants";

export const prerender = true;

interface FishingSpot {
  id: string;
  name: string;
  level: number;
  tool_required_id: string | null;
  tool_required_name: string | null;
  spawn_count: number;
  zone_count: number;
  zones: Array<{ id: string; name: string }>;
  drops: FishDrop[];
}

interface FishDrop {
  item_id: string;
  item_name: string;
  quality: number;
  tooltip_html: string | null;
  configured_drop_rate: number;
  actual_drop_chance: number | null;
}

interface FishItem {
  item_id: string;
  item_name: string;
  quality: number;
  tooltip_html: string | null;
  is_trash: boolean;
  cooked_recipe_count: number;
}

interface FishingRod {
  item_id: string;
  item_name: string;
  quality: number;
  level_required: number;
  tooltip_html: string | null;
}

interface FishCookingRecipe {
  recipe_id: string;
  result_item_id: string;
  result_item_name: string;
  result_quality: number;
  ingredient_item_id: string;
  ingredient_item_name: string;
  ingredient_amount: number;
}

interface FishingPageData {
  profession: {
    id: string;
    name: string;
    description: string;
    category: string;
    max_level: number;
    steam_achievement_id: string | null;
    steam_achievement_name: string | null;
  };
  spots: FishingSpot[];
  fish: FishItem[];
  rods: FishingRod[];
  recipes: FishCookingRecipe[];
  stats: {
    spot_count: number;
    fish_count: number;
    trash_fish_count: number;
    rod_count: number;
    recipe_count: number;
    zone_count: number;
  };
}

export const load: PageServerLoad = (): FishingPageData => {
  const db = new Database(DB_STATIC_PATH, { readonly: true });

  const profession = db
    .prepare(
      `
      SELECT id, name, description, category, max_level, steam_achievement_id, steam_achievement_name
      FROM professions
      WHERE id = 'fishing'
    `,
    )
    .get() as FishingPageData["profession"];

  const spotRows = db
    .prepare(
      `
      SELECT
        gr.id,
        gr.name,
        gr.level,
        gr.tool_required_id,
        tool.name AS tool_required_name,
        COUNT(DISTINCT grs.id) AS spawn_count,
        COUNT(DISTINCT grs.zone_id) AS zone_count
      FROM gathering_resources gr
      LEFT JOIN gathering_resource_spawns grs ON grs.resource_id = gr.id
      LEFT JOIN items tool ON tool.id = gr.tool_required_id
      WHERE gr.is_fishing_spot = 1
      GROUP BY gr.id
      ORDER BY gr.level, gr.name
    `,
    )
    .all() as Omit<FishingSpot, "zones" | "drops">[];

  const zoneRows = db
    .prepare(
      `
      SELECT DISTINCT gr.id AS spot_id, z.id AS zone_id, z.name AS zone_name
      FROM gathering_resources gr
      JOIN gathering_resource_spawns grs ON grs.resource_id = gr.id
      JOIN zones z ON z.id = grs.zone_id
      WHERE gr.is_fishing_spot = 1
      ORDER BY z.name
    `,
    )
    .all() as Array<{ spot_id: string; zone_id: string; zone_name: string }>;

  const dropRows = db
    .prepare(
      `
      SELECT
        isg.resource_id,
        i.id AS item_id,
        i.name AS item_name,
        i.quality,
        i.tooltip_html,
        isg.drop_rate AS configured_drop_rate,
        isg.actual_drop_chance
      FROM item_sources_gather isg
      JOIN gathering_resources gr ON gr.id = isg.resource_id
      JOIN items i ON i.id = isg.item_id
      WHERE gr.is_fishing_spot = 1
      ORDER BY gr.level, isg.actual_drop_chance DESC, i.name
    `,
    )
    .all() as Array<FishDrop & { resource_id: string }>;

  const fish = db
    .prepare(
      `
      SELECT
        f.item_id,
        i.name AS item_name,
        i.quality,
        i.tooltip_html,
        f.is_trash,
        COUNT(DISTINCT iur.recipe_id) AS cooked_recipe_count
      FROM fish f
      JOIN items i ON i.id = f.item_id
      LEFT JOIN item_usages_recipe iur ON iur.item_id = f.item_id AND iur.recipe_type = 'crafting'
      GROUP BY f.item_id
      ORDER BY f.is_trash, i.quality, i.name
    `,
    )
    .all() as FishItem[];

  const rods = db
    .prepare(
      `
      SELECT id AS item_id, name AS item_name, quality, level_required, tooltip_html
      FROM items
      WHERE weapon_category = 'Fishing Rod'
      ORDER BY quality, level_required, name
    `,
    )
    .all() as FishingRod[];

  const recipes = db
    .prepare(
      `
      SELECT
        cr.id AS recipe_id,
        result.id AS result_item_id,
        result.name AS result_item_name,
        result.quality AS result_quality,
        ingredient.id AS ingredient_item_id,
        ingredient.name AS ingredient_item_name,
        iur.amount AS ingredient_amount
      FROM item_usages_recipe iur
      JOIN fish f ON f.item_id = iur.item_id
      JOIN crafting_recipes cr ON cr.id = iur.recipe_id
      JOIN items result ON result.id = cr.result_item_id
      JOIN items ingredient ON ingredient.id = iur.item_id
      WHERE iur.recipe_type = 'crafting'
        AND cr.station_type = 'cooking'
      ORDER BY result.quality, result.name, ingredient.name
    `,
    )
    .all() as FishCookingRecipe[];

  db.close();

  const zonesBySpot = new Map<string, FishingSpot["zones"]>();
  for (const row of zoneRows) {
    const zones = zonesBySpot.get(row.spot_id) ?? [];
    zones.push({ id: row.zone_id, name: row.zone_name });
    zonesBySpot.set(row.spot_id, zones);
  }

  const dropsBySpot = new Map<string, FishDrop[]>();
  for (const row of dropRows) {
    const drops = dropsBySpot.get(row.resource_id) ?? [];
    drops.push({
      item_id: row.item_id,
      item_name: row.item_name,
      quality: row.quality,
      tooltip_html: row.tooltip_html,
      configured_drop_rate: row.configured_drop_rate,
      actual_drop_chance: row.actual_drop_chance,
    });
    dropsBySpot.set(row.resource_id, drops);
  }

  const spots = spotRows.map((spot) => ({
    ...spot,
    zones: zonesBySpot.get(spot.id) ?? [],
    drops: dropsBySpot.get(spot.id) ?? [],
  }));

  return {
    profession,
    spots,
    fish,
    rods,
    recipes,
    stats: {
      spot_count: spots.length,
      fish_count: fish.filter((item) => !item.is_trash).length,
      trash_fish_count: fish.filter((item) => item.is_trash).length,
      rod_count: rods.length,
      recipe_count: recipes.length,
      zone_count: new Set(zoneRows.map((row) => row.zone_id)).size,
    },
  };
};

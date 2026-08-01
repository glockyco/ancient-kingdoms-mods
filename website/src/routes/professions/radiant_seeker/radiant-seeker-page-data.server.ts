import Database from "better-sqlite3";
import { DB_STATIC_PATH } from "$lib/constants/constants";

interface SparkZone {
  zone_id: string;
  zone_name: string;
  node_count: number;
}

interface RadiantSparkResource {
  id: string;
  name: string;
  description: string;
  gathering_exp: number;
  reward_item_id: string;
  reward_item_name: string;
  reward_tooltip_html: string | null;
  node_count: number;
  zones: SparkZone[];
}

export interface RadiantSeekerPageData {
  profession: {
    id: string;
    name: string;
    description: string;
    category: string;
    max_level: number;
    achievement_id: string;
    achievement_name: string;
  };
  resource: RadiantSparkResource;
  recipe_count: number;
}

export function getRadiantSeekerPageData(
  dbPath = DB_STATIC_PATH,
): RadiantSeekerPageData {
  const db = new Database(dbPath, { readonly: true });

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
      WHERE id = 'radiant_seeker'
    `,
    )
    .get() as RadiantSeekerPageData["profession"];

  const rawResource = db
    .prepare(
      `
      SELECT
        gr.id,
        gr.name,
        gr.description,
        gr.gathering_exp,
        gr.item_reward_id AS reward_item_id,
        reward.name AS reward_item_name,
        reward.tooltip_html AS reward_tooltip_html
      FROM gathering_resources gr
      JOIN items reward ON reward.id = gr.item_reward_id
      WHERE gr.is_radiant_spark = 1
    `,
    )
    .get() as Omit<RadiantSparkResource, "node_count" | "zones">;

  const zones = db
    .prepare(
      `
      SELECT
        z.id AS zone_id,
        z.name AS zone_name,
        COUNT(*) AS node_count
      FROM gathering_resource_spawns spawn
      JOIN zones z ON z.id = spawn.zone_id
      WHERE spawn.resource_id = ?
      GROUP BY z.id, z.name
      ORDER BY node_count DESC, z.name
    `,
    )
    .all(rawResource.id) as SparkZone[];

  const recipeCount = db
    .prepare(
      `
      SELECT COUNT(DISTINCT recipe_id) AS count
      FROM item_usages_recipe
      WHERE item_id = ?
    `,
    )
    .get(rawResource.reward_item_id) as { count: number };

  db.close();

  return {
    profession,
    resource: {
      ...rawResource,
      zones,
      node_count: zones.reduce((total, zone) => total + zone.node_count, 0),
    },
    recipe_count: recipeCount.count,
  };
}

import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import { DB_STATIC_PATH } from "$lib/constants/constants";

export const prerender = true;

interface TreasureMap {
  id: string;
  name: string;
  quality: number;
  tooltip_html: string | null;
  // Destination
  treasure_location_id: string;
  destination_zone_id: string;
  destination_zone_name: string;
  position_x: number;
  position_y: number;
  // Reward
  reward_item_id: string;
  reward_item_name: string;
  reward_item_tooltip: string | null;
}

interface TreasureHunterPageData {
  profession: {
    id: string;
    name: string;
    description: string;
    category: string;
    max_level: number;
    steam_achievement_id: string | null;
    steam_achievement_name: string | null;
  };
  chestMaps: TreasureMap[];
  uniqueMaps: TreasureMap[];
}

interface RawTreasureMap {
  id: string;
  name: string;
  quality: number;
  tooltip_html: string | null;
  treasure_location_id: string;
  treasure_map_reward_id: string;
  treasure_map_zone_id: string;
  treasure_map_zone_name: string;
  treasure_map_position_x: number;
  treasure_map_position_y: number;
}

export const load: PageServerLoad = (): TreasureHunterPageData => {
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
    WHERE id = 'treasure_hunter'
  `,
    )
    .get() as TreasureHunterPageData["profession"];

  const rawMaps = db
    .prepare(
      `
    SELECT
      i.id,
      i.name,
      i.quality,
      i.tooltip_html,
      tl.id as treasure_location_id,
      i.treasure_map_reward_id,
      i.treasure_map_zone_id,
      i.treasure_map_zone_name,
      i.treasure_map_position_x,
      i.treasure_map_position_y
    FROM items i
    JOIN treasure_locations tl ON tl.required_map_id = i.id
    WHERE i.treasure_map_reward_id IS NOT NULL
    ORDER BY i.quality DESC, i.name
  `,
    )
    .all() as RawTreasureMap[];

  const chestMaps: TreasureMap[] = [];
  const uniqueMaps: TreasureMap[] = [];

  for (const map of rawMaps) {
    const rewardItem = db
      .prepare(
        `
      SELECT id, name, tooltip_html
      FROM items
      WHERE id = ?
    `,
      )
      .get(map.treasure_map_reward_id) as {
      id: string;
      name: string;
      tooltip_html: string | null;
    } | null;

    const treasureMap: TreasureMap = {
      id: map.id,
      name: map.name,
      quality: map.quality,
      tooltip_html: map.tooltip_html,
      treasure_location_id: map.treasure_location_id,
      destination_zone_id: map.treasure_map_zone_id,
      destination_zone_name: map.treasure_map_zone_name,
      position_x: map.treasure_map_position_x,
      position_y: map.treasure_map_position_y,
      reward_item_id: rewardItem?.id ?? map.treasure_map_reward_id,
      reward_item_name: rewardItem?.name ?? "Unknown",
      reward_item_tooltip: rewardItem?.tooltip_html ?? null,
    };

    // Split based on reward type
    if (map.treasure_map_reward_id === "buried_treasure_chest") {
      chestMaps.push(treasureMap);
    } else {
      uniqueMaps.push(treasureMap);
    }
  }

  db.close();

  return { profession, chestMaps, uniqueMaps };
};

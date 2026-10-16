import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import { getItemIconPaths } from "$lib/server/item-icon-paths";
import {
  CHEST_REWARDS_QUERY,
  assembleChests,
  type ChestRewardRow,
} from "$lib/queries/chest-rewards";
import type { ChestDefinition } from "$lib/calculation/chest-rewards";

export const prerender = true;

interface TreasureMapRow {
  id: string;
  name: string;
  quality: number;
  tooltip_html: string | null;
  treasure_map_image_location: string | null;
  treasure_location_id: string;
  destination_zone_id: string;
  destination_zone_name: string;
  destination_sub_zone_name: string | null;
  position_x: number;
  position_y: number;
  reward_item_id: string;
  reward_item_name: string;
  reward_item_type: string | null;
  reward_item_tooltip: string | null;
}

interface TreasureHunterStats {
  map_count: number;
  relic_reward_count: number;
  zone_count: number;
  skill_gain_percent: number;
}

interface KeyItem {
  id: string;
  name: string;
  tooltip_html: string | null;
}

interface TreasureHunterPageData {
  profession: {
    id: string;
    name: string;
    description: string;
    category: string;
    max_level: number;
    achievement_id: string;
    achievement_name: string;
  };
  stats: TreasureHunterStats;
  treasureMaps: TreasureMapRow[];
  buriedChestRewards: ChestRewardRow[];
  buriedChestRewardLimit: number;
  buriedChest: ChestDefinition<ChestRewardRow>;
  keyItems: Record<"random_map" | "buried_treasure_chest" | "shovel", KeyItem>;
  itemIconPaths: Record<string, string | null>;
}

interface RawTreasureMap {
  id: string;
  name: string;
  quality: number;
  tooltip_html: string | null;
  treasure_map_image_location: string | null;
  treasure_location_id: string;
  reward_id: string;
  reward_name: string | null;
  reward_item_type: string | null;
  reward_tooltip: string | null;
  zone_id: string;
  zone_name: string;
  sub_zone_name: string | null;
  position_x: number;
  position_y: number;
}

export const load: PageServerLoad = (): TreasureHunterPageData => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });

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
      i.treasure_map_image_location,
      tl.id as treasure_location_id,
      tl.reward_id,
      tl.zone_id,
      z.name as zone_name,
      zt.name as sub_zone_name,
      tl.position_x,
      tl.position_y,
      reward.name as reward_name,
      reward.item_type as reward_item_type,
      reward.tooltip_html as reward_tooltip
    FROM items i
    JOIN treasure_locations tl ON tl.required_map_id = i.id
    JOIN zones z ON z.id = tl.zone_id
    LEFT JOIN zone_triggers zt ON zt.id = tl.sub_zone_id
    LEFT JOIN items reward ON reward.id = tl.reward_id
    WHERE tl.reward_id = 'buried_treasure_chest'
    ORDER BY i.quality DESC, i.name
  `,
    )
    .all() as RawTreasureMap[];

  const treasureMaps: TreasureMapRow[] = rawMaps.map((map) => ({
    id: map.id,
    name: map.name,
    quality: map.quality,
    tooltip_html: map.tooltip_html,
    treasure_map_image_location: map.treasure_map_image_location,
    treasure_location_id: map.treasure_location_id,
    destination_zone_id: map.zone_id,
    destination_zone_name: map.zone_name,
    destination_sub_zone_name: map.sub_zone_name,
    position_x: map.position_x,
    position_y: map.position_y,
    reward_item_id: map.reward_id,
    reward_item_name: map.reward_name ?? "Unknown",
    reward_item_type: map.reward_item_type,
    reward_item_tooltip: map.reward_tooltip,
  }));

  const [buriedChest] = assembleChests(
    db
      .prepare(
        `${CHEST_REWARDS_QUERY} WHERE r.chest_item_id = 'buried_treasure_chest' ORDER BY r.roll_order`,
      )
      .all() as ChestRewardRow[],
  );
  if (!buriedChest)
    throw new Error("Missing chest_item_rewards for buried_treasure_chest");
  const buriedChestRewards = buriedChest.rewards;
  const buriedChestRewardLimit = buriedChest.num_items;

  const stats: TreasureHunterStats = {
    map_count: treasureMaps.length,
    relic_reward_count: buriedChestRewards.filter(
      (reward) => reward.scales_with_treasure_hunter,
    ).length,
    zone_count: new Set(treasureMaps.map((map) => map.destination_zone_id))
      .size,
    // Source: server-scripts/TreasureLocation.cs:87-90 — successful treasure dig grants +0.5% Treasure Hunter.
    skill_gain_percent: 0.5,
  };

  const keyItemRows = db
    .prepare(
      `
    SELECT id, name, tooltip_html
    FROM items
    WHERE id IN ('random_map', 'buried_treasure_chest', 'shovel')
  `,
    )
    .all() as KeyItem[];

  const keyItemsById = Object.fromEntries(
    keyItemRows.map((item) => [item.id, item]),
  ) as Record<string, KeyItem | undefined>;

  const requiredKeyItemIds = [
    "random_map",
    "buried_treasure_chest",
    "shovel",
  ] as const;
  for (const id of requiredKeyItemIds) {
    if (!keyItemsById[id]) {
      throw new Error(`Treasure Hunter key item is missing: ${id}`);
    }
  }

  const keyItems: TreasureHunterPageData["keyItems"] = {
    random_map: keyItemsById.random_map!,
    buried_treasure_chest: keyItemsById.buried_treasure_chest!,
    shovel: keyItemsById.shovel!,
  };

  const itemIconPaths = getItemIconPaths(db, [
    ...requiredKeyItemIds,
    ...treasureMaps.flatMap((map) => [map.id, map.reward_item_id]),
    ...buriedChestRewards.map((reward) => reward.item_id),
  ]);
  db.close();

  return {
    profession,
    stats,
    treasureMaps,
    buriedChestRewards,
    buriedChestRewardLimit,
    buriedChest,
    keyItems,
    itemIconPaths,
  };
};

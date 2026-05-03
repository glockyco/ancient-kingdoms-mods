import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import { DB_STATIC_PATH } from "$lib/constants/constants";

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

interface ChestRewardRow {
  item_id: string;
  item_name: string;
  item_type: string | null;
  quality: number;
  tooltip_html: string | null;
  roll_order: number;
  base_roll_chance: number;
  baseline_open_chance: number;
  scales_with_treasure_hunter: boolean;
  relic_buff_id: string | null;
  relic_buff_name: string | null;
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
    steam_achievement_id: string | null;
    steam_achievement_name: string | null;
  };
  stats: TreasureHunterStats;
  treasureMaps: TreasureMapRow[];
  buriedChestRewards: ChestRewardRow[];
  buriedChestRewardLimit: number;
  keyItems: Record<"random_map" | "buried_treasure_chest" | "shovel", KeyItem>;
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

interface ChestRewardJson {
  item_id: string;
  item_name: string;
  probability: number;
  actual_drop_chance: number;
  roll_order: number;
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

  const buriedChestRow = db
    .prepare(
      `
    SELECT chest_rewards, chest_num_items
    FROM items
    WHERE id = 'buried_treasure_chest'
  `,
    )
    .get() as
    | { chest_rewards: string | null; chest_num_items: number | null }
    | undefined;

  if (!buriedChestRow?.chest_rewards) {
    throw new Error("Buried Treasure Chest reward data is missing");
  }

  const buriedChestRewardLimit = buriedChestRow.chest_num_items ?? 0;
  if (buriedChestRewardLimit <= 0) {
    throw new Error("Buried Treasure Chest is missing chest_num_items");
  }

  const rewardItemLookup = db.prepare(
    `SELECT id, name, item_type, quality, tooltip_html, relic_buff_id, relic_buff_name FROM items WHERE id = ?`,
  );

  const buriedChestRewards = (
    JSON.parse(buriedChestRow.chest_rewards) as ChestRewardJson[]
  )
    .map((reward): ChestRewardRow => {
      if (typeof reward.roll_order !== "number") {
        throw new Error(
          "Buried Treasure Chest reward is missing roll_order; rebuild compendium data",
        );
      }

      const item = rewardItemLookup.get(reward.item_id) as {
        id: string;
        name: string;
        item_type: string | null;
        quality: number;
        tooltip_html: string | null;
        relic_buff_id: string | null;
        relic_buff_name: string | null;
      } | null;

      if (!item) {
        throw new Error(
          `Buried Treasure Chest reward item is missing: ${reward.item_id}`,
        );
      }

      return {
        item_id: reward.item_id,
        item_name: reward.item_name,
        item_type: item.item_type,
        quality: item.quality,
        tooltip_html: item.tooltip_html,
        roll_order: reward.roll_order,
        base_roll_chance: reward.probability,
        baseline_open_chance: reward.actual_drop_chance,
        scales_with_treasure_hunter: item.item_type === "relic",
        relic_buff_id: item.relic_buff_id,
        relic_buff_name: item.relic_buff_name,
      };
    })
    .sort((a, b) => a.roll_order - b.roll_order);

  const stats: TreasureHunterStats = {
    map_count: treasureMaps.length,
    relic_reward_count: buriedChestRewards.filter(
      (reward) => reward.scales_with_treasure_hunter,
    ).length,
    zone_count: new Set(treasureMaps.map((map) => map.destination_zone_id))
      .size,
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

  db.close();

  return {
    profession,
    stats,
    treasureMaps,
    buriedChestRewards,
    buriedChestRewardLimit,
    keyItems,
  };
};

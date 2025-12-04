/**
 * Minimal gather item data for list view
 */
export interface GatherItemListView {
  id: string;
  name: string;
  type: string; // "Plant" | "Mineral" | "Radiant Spark" | "Chest"
  level: number | null;
  respawn_time: number;
  tool_or_key_id: string | null;
  tool_or_key_name: string | null;
  zone_count: number;
  item_reward_id: string | null;
  item_reward_name: string | null;
  item_reward_amount: number;
}

/**
 * Data structure returned by the gather items page load function
 */
export interface GatherItemsPageData {
  gatherItems: GatherItemListView[];
}

/**
 * Full gathering resource data for detail page
 */
export interface GatheringResource {
  id: string;
  name: string;
  is_plant: boolean;
  is_mineral: boolean;
  is_radiant_spark: boolean;
  level: number;
  tool_required_id: string | null;
  tool_required_name: string | null;
  respawn_time: number;
  item_reward_id: string | null;
  item_reward_name: string | null;
  item_reward_amount: number;
  gathering_exp: number | null;
  description: string | null;
}

/**
 * Drop info for gathering resources
 */
export interface GatheringResourceDrop {
  item_id: string;
  item_name: string;
  drop_rate: number;
  actual_drop_chance: number | null;
}

/**
 * Resource drop info for list view (includes resource_id)
 */
export interface ResourceDropListView {
  resource_id: string;
  item_id: string;
  item_name: string;
}

/**
 * Spawn location info
 */
export interface GatheringResourceSpawn {
  zone_id: string;
  zone_name: string;
  spawn_count: number;
}

/**
 * Full chest data for detail page
 */
export interface Chest {
  id: string;
  name: string;
  zone_id: string;
  zone_name: string;
  position_x: number | null;
  position_y: number | null;
  key_required_id: string | null;
  key_required_name: string | null;
  gold_min: number;
  gold_max: number;
  item_reward_id: string | null;
  item_reward_name: string | null;
  item_reward_amount: number;
  respawn_time: number;
}

/**
 * Combined detail data - either a resource or a chest
 */
export type GatherItemDetail =
  | {
      type: "resource";
      resource: GatheringResource;
      drops: GatheringResourceDrop[];
      spawns: GatheringResourceSpawn[];
    }
  | {
      type: "chest";
      chest: Chest;
    };

/**
 * Data structure returned by the gather item detail page load function
 */
export interface GatherItemDetailPageData {
  gatherItem: GatherItemDetail;
}

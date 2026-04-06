import type { Item } from "$lib/queries/items";
import type { ItemSources, ItemUsages } from "$lib/types/item-sources";

/**
 * Full item data from SQL query (includes JSON fields for parsing)
 */
export interface ItemListView {
  id: string;
  name: string;
  item_type: string;
  quality: number;
  level_required: number;
  item_level: number;
  slot: string | null;
  backpack_slots: number;
  class_required: string;
  stats: string | null;
  stat_count: number;
  stat_keys: string;
  alchemy_recipe_level_required: number | null;
  mount_speed: number;
  augment_is_defensive: boolean | null;
}

/**
 * Item data for client-side rendering (bulky JSON fields stripped)
 */
export type ItemListViewClient = Omit<
  ItemListView,
  "stats" | "stat_keys" | "class_required"
>;

/**
 * Zone info for item obtainability (overview page filtering)
 */
export interface ItemZoneInfo {
  item_id: string;
  zone_id: string;
  zone_name: string;
  is_dungeon: boolean;
}

/**
 * Data structure returned by the items page load function
 */
export interface ItemsPageData {
  items: ItemListView[];
  itemZones: ItemZoneInfo[];
}

/**
 * Data structure returned by the item detail page load function
 */
export interface ItemDetailPageData {
  item: Item;
  description: string;
  sources: ItemSources;
  usages: ItemUsages;
  recipeMaterials: Record<
    string,
    Array<{ item_id: string; item_name: string; amount: number }>
  >;
  randomOutcomes: Array<{
    item_id: string;
    item_name: string;
    quality: number;
    probability: number;
  }>;
  packContents: Array<{
    item_id: string;
    item_name: string;
    quality: number;
    amount: number;
  }>;
  treasureLocation: {
    location_id: string;
    zone_id: string;
    zone_name: string;
    reward_id: string | null;
    reward_name: string | null;
    position_x: number;
    position_y: number;
  } | null;
  essenceTraders: Array<{ id: string; name: string }>;
  veteranMasters: Array<{ id: string; name: string }>;
  augmenters: Array<{ id: string; name: string }>;
  priestesses: Array<{ id: string; name: string }>;
  worldBossRenewalSages: Array<{
    id: string;
    name: string;
    gold_required: number;
  }>;
}

import type { Item } from "$lib/queries/items";

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
}

/**
 * Item data for client-side rendering (bulky JSON fields stripped)
 */
export type ItemListViewClient = Omit<
  ItemListView,
  "stats" | "stat_keys" | "class_required"
>;

/**
 * Data structure returned by the items page load function
 */
export interface ItemsPageData {
  items: ItemListView[];
}

/**
 * Data structure returned by the item detail page load function
 */
export interface ItemDetailPageData {
  item: Item;
  description: string;
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

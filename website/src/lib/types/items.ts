import type { Item } from "$lib/queries/items";

/**
 * Minimal item data for list view - only fields displayed on items page
 */
export interface ItemListView {
  id: string;
  name: string;
  item_type: string;
  quality: number;
  level_required: number;
  slot: string | null;
  backpack_slots: number;
  class_required: string;
  stats_count: number;
  alchemy_recipe_level_required: number | null;
}

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
  essenceTraders: Array<{ id: string; name: string }>;
  veteranMasters: Array<{ id: string; name: string }>;
  augmenters: Array<{ id: string; name: string }>;
}

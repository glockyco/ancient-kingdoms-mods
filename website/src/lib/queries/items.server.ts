import { query, queryOne } from "$lib/db.server";
import type { Item } from "./items";
import type { ItemListView } from "$lib/types/items";

/**
 * Get all items with minimal fields for list view (server-side, for prerendering).
 */
export function getItems(): ItemListView[] {
  return query<ItemListView>(
    `SELECT
      id,
      name,
      item_type,
      quality,
      level_required,
      slot,
      backpack_slots,
      class_required,
      COALESCE((SELECT COUNT(*) FROM json_each(stats)), 0) as stats_count
    FROM items
    ORDER BY name`,
  );
}

/**
 * Get a single item by ID (server-side, for prerendering).
 */
export function getItemById(id: string): Item | null {
  return queryOne<Item>("SELECT * FROM items WHERE id = ?", [id]);
}

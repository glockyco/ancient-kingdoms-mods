import { query, queryOne } from "$lib/db.server";
import type { Item } from "./items";
import type { ItemListView } from "$lib/types/items";

/**
 * Get all items with minimal fields for list view (server-side, for prerendering).
 * Computes stat_count in SQL to avoid sending full stats JSON to client.
 */
export function getItems(): ItemListView[] {
  return query<ItemListView>(
    `SELECT
      id,
      name,
      item_type,
      quality,
      level_required,
      item_level,
      slot,
      backpack_slots,
      class_required,
      alchemy_recipe_level_required,
      mount_speed,
      (
        SELECT COUNT(*)
        FROM json_each(stats)
        WHERE json_each.key NOT IN ('max_durability', 'has_serenity', 'is_costume', 'augment_bonus_set')
          AND json_each.value != 0
          AND json_each.value != 0.0
          AND json_each.value != 'false'
      ) as stat_count
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

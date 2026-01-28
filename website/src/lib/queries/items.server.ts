import { query, queryOne } from "$lib/db.server";
import type { Item } from "./items";
import type { ItemListView, ItemZoneInfo } from "$lib/types/items";

/**
 * Get all items with fields for list view (server-side, for prerendering).
 * Includes stats JSON for client-side filtering.
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
      stats,
      (
        SELECT COUNT(*)
        FROM json_each(stats)
        WHERE json_each.key NOT IN ('max_durability', 'has_serenity', 'is_costume', 'augment_bonus_set')
          AND json_each.value != 0
          AND json_each.value != 0.0
          AND json_each.value != 'false'
      ) as stat_count,
      (
        SELECT json_group_array(json_each.key)
        FROM json_each(stats)
        WHERE json_each.key NOT IN ('max_durability', 'has_serenity', 'is_costume', 'augment_bonus_set')
          AND json_each.value != 0
          AND json_each.value != 0.0
          AND json_each.value != 'false'
      ) as stat_keys
    FROM items
    ORDER BY name`,
  );
}

/**
 * Get zones where items can be obtained (server-side, for overview page filtering).
 * Uses the precomputed item_zones_obtainable junction table.
 */
export function getItemZones(): ItemZoneInfo[] {
  return query<ItemZoneInfo>(
    `SELECT DISTINCT
      izo.item_id,
      z.id as zone_id,
      z.name as zone_name,
      z.is_dungeon
    FROM item_zones_obtainable izo
    JOIN zones z ON z.id = izo.zone_id
    ORDER BY z.name`,
  );
}

/**
 * Get a single item by ID (server-side, for prerendering).
 */
export function getItemById(id: string): Item | null {
  return queryOne<Item>("SELECT * FROM items WHERE id = ?", [id]);
}

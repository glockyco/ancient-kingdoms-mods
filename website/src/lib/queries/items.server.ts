import { query, queryOne } from "$lib/db.server";
import type { Item } from "./items";
import type { ItemListView } from "$lib/types/items";
import { STATS_METADATA_FIELDS } from "$lib/constants/items";

const METADATA_FIELDS = new Set<string>(STATS_METADATA_FIELDS);

/**
 * Count stats displayed on detail page (excludes metadata and zero values).
 */
function countDisplayedStats(statsJson: string | null): number {
  if (!statsJson) return 0;

  try {
    const stats = JSON.parse(statsJson) as Record<string, unknown>;
    return Object.entries(stats).filter(([key, value]) => {
      if (METADATA_FIELDS.has(key)) return false;
      return value !== 0 && value !== 0.0 && value !== false;
    }).length;
  } catch {
    return 0;
  }
}

/**
 * Get all items with minimal fields for list view (server-side, for prerendering).
 */
export function getItems(): ItemListView[] {
  const rows = query<
    Omit<ItemListView, "stats_count"> & { stats: string | null }
  >(
    `SELECT
      id,
      name,
      item_type,
      quality,
      level_required,
      slot,
      backpack_slots,
      class_required,
      stats,
      alchemy_recipe_level_required
    FROM items
    ORDER BY name`,
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    item_type: row.item_type,
    quality: row.quality,
    level_required: row.level_required,
    slot: row.slot,
    backpack_slots: row.backpack_slots,
    class_required: row.class_required,
    stats_count: countDisplayedStats(row.stats),
    alchemy_recipe_level_required: row.alchemy_recipe_level_required,
  }));
}

/**
 * Get a single item by ID (server-side, for prerendering).
 */
export function getItemById(id: string): Item | null {
  return queryOne<Item>("SELECT * FROM items WHERE id = ?", [id]);
}

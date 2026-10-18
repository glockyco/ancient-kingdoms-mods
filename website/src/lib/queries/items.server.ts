import { getDb, query, queryOne } from "$lib/db.server";
import type { Item } from "./items";
import type { ItemListView, ItemZoneInfo } from "$lib/types/items";
import { loadAcquisition } from "$lib/server/acquisition";
import type { AcquisitionQuery } from "$lib/acquisition/types";
import { projectDirectGeometry } from "$lib/acquisition/projections";

/**
 * Get all items with fields for list view (server-side, for prerendering).
 * Includes stats JSON for client-side filtering.
 */
export function getItems(): ItemListView[] {
  return query<
    Omit<ItemListView, "alchemy_recipe_tiers"> & {
      alchemy_recipe_tiers: string;
    }
  >(
    `SELECT
      i.id,
      i.name,
      va.public_path as visual_public_path,
      item_type,
      quality,
      level_required,
      item_level,
      slot,
      backpack_slots,
      backpack_is_unique,
      (SELECT json_group_array(CASE WHEN cr.withheld = 1 THEN 'withheld' ELSE cr.class_id END)
       FROM item_class_requirements cr
       WHERE cr.item_id = i.id) AS class_required,
      (SELECT json_group_array(tier) FROM (
        SELECT DISTINCT d.tier FROM acquisition_recipe_details d
        WHERE d.display_kind = 'alchemy'
          AND (d.declared_result_item_id = i.id OR d.declared_result_item_id = i.recipe_potion_learned_id)
        ORDER BY d.tier
      )) AS alchemy_recipe_tiers,
      mount_speed,
      augment_is_defensive,
      augment_armor_set_name,
      stats,
      (
        SELECT COUNT(*)
        FROM json_each(stats)
        WHERE json_each.key NOT IN ('max_durability', 'has_serenity', 'is_costume', 'augment_bonus_set', 'augment_bonus_set_id')
          AND json_each.value != 0
          AND json_each.value != 0.0
          AND json_each.value != 'false'
      ) as stat_count,
      (
        SELECT json_group_array(json_each.key)
        FROM json_each(stats)
        WHERE json_each.key NOT IN ('max_durability', 'has_serenity', 'is_costume', 'augment_bonus_set', 'augment_bonus_set_id')
          AND json_each.value != 0
          AND json_each.value != 0.0
          AND json_each.value != 'false'
      ) as stat_keys
    FROM items i
    LEFT JOIN visual_assets va
      ON va.domain = 'item'
     AND va.entity_id = i.id
     AND va.kind = 'icon'
    ORDER BY i.name`,
  ).map((item) => ({
    ...item,
    alchemy_recipe_tiers: JSON.parse(item.alchemy_recipe_tiers) as number[],
  }));
}

/** Get direct award locations for the item overview's zone filter. */
export async function getItemZones(): Promise<ItemZoneInfo[]> {
  const db = getDb();
  const execute: AcquisitionQuery = async (sql, params) =>
    db.prepare(sql).all(...params) as Record<string, unknown>[];
  const items = query<{ id: string }>("SELECT id FROM items ORDER BY id");
  const model = await loadAcquisition(execute, {
    kind: "items",
    itemIds: items.map((item) => item.id),
  });
  const zones = new Map(
    query<{ id: string; name: string; is_dungeon: boolean }>(
      "SELECT id, name, is_dungeon FROM zones ORDER BY name",
    ).map((zone) => [zone.id, zone]),
  );
  const result: ItemZoneInfo[] = [];
  for (const item of items) {
    const zoneIds = new Set<string>();
    for (const location of projectDirectGeometry(model, item.id)) {
      if (location.zoneId) zoneIds.add(location.zoneId);
    }
    for (const zoneId of zoneIds) {
      const zone = zones.get(zoneId);
      if (zone)
        result.push({
          item_id: item.id,
          zone_id: zone.id,
          zone_name: zone.name,
          is_dungeon: zone.is_dungeon,
        });
    }
  }
  return result.sort(
    (a, b) =>
      a.zone_name.localeCompare(b.zone_name) ||
      a.item_id.localeCompare(b.item_id),
  );
}

/**
 * Get a single item by ID (server-side, for prerendering).
 */
export function getItemById(id: string): Item | null {
  return queryOne<Item>("SELECT * FROM items WHERE id = ?", [id]);
}

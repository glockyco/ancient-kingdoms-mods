import { getDb, query, queryOne } from "$lib/db.server";
import { ITEM_DETAIL_SELECT, type Item } from "./items";
import type { ItemListView, ItemZoneInfo } from "$lib/types/items";
import { itemListType } from "$lib/utils/format";
import type { ItemListPayload } from "$lib/utils/item-list";
import { loadAcquisition } from "$lib/server/acquisition";
import type { AcquisitionQuery } from "$lib/acquisition/types";
import {
  projectDirectGeometry,
  projectItemSeasons,
} from "$lib/acquisition/projections";
import type { Season } from "$lib/data/seasonal-events";

/**
 * Get all items with fields for list view (server-side, for prerendering).
 * Includes stats JSON for client-side filtering.
 */
export function getItems(): ItemListView[] {
  return query<ItemListView>(
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
      (SELECT MIN(d.tier) FROM acquisition_recipe_details d
       WHERE d.display_kind = 'alchemy'
         AND (d.declared_result_item_id = i.id OR d.declared_result_item_id = i.recipe_potion_learned_id)
      ) AS alchemy_recipe_level_required,
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
  );
}

/** The item overview's complete row data, with JSON fields parsed once on the server. */
export async function getItemListPayload(): Promise<ItemListPayload> {
  const rawItems = getItems();
  const itemStatKeys: Record<string, string[]> = {};
  const itemStatValues: Record<string, Record<string, number>> = {};
  const itemClassKeys: Record<string, string[]> = {};
  for (const item of rawItems) {
    itemStatKeys[item.id] = JSON.parse(item.stat_keys) as string[];
    itemStatValues[item.id] = Object.fromEntries(
      Object.entries(
        JSON.parse(item.stats || "{}") as Record<string, unknown>,
      ).filter(
        (entry): entry is [string, number] => typeof entry[1] === "number",
      ),
    );
    try {
      const classes = JSON.parse(item.class_required);
      itemClassKeys[item.id] = Array.isArray(classes) ? classes : [];
    } catch {
      itemClassKeys[item.id] = [];
    }
  }
  const items = rawItems.map((item) => ({
    id: item.id,
    name: item.name,
    visual_public_path: item.visual_public_path,
    item_type: itemListType(item),
    quality: item.quality,
    level_required: item.level_required,
    item_level: item.item_level,
    slot: item.slot,
    backpack_slots: item.backpack_slots,
    backpack_is_unique: item.backpack_is_unique,
    stat_count: item.stat_count,
    alchemy_recipe_level_required: item.alchemy_recipe_level_required,
    mount_speed: item.mount_speed,
    augment_is_defensive: item.augment_is_defensive,
    augment_armor_set_name: item.augment_armor_set_name,
  }));
  const locations = await (itemLocations ??= computeItemLocations());
  return {
    items,
    itemStatKeys,
    itemStatValues,
    itemClassKeys,
    itemZones: locations.zones,
    itemSeasons: locations.seasons,
  };
}

// getDb() keeps one connection per process, so these projections share one model load.
let itemLocations: Promise<{
  zones: ItemZoneInfo[];
  seasons: Record<string, readonly Season[]>;
}> | null = null;

/** Get direct award locations for the item overview's zone filter. */
export async function getItemZones(): Promise<ItemZoneInfo[]> {
  return (await (itemLocations ??= computeItemLocations())).zones;
}

async function computeItemLocations() {
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
  return {
    zones: result.sort(
      (a, b) =>
        a.zone_name.localeCompare(b.zone_name) ||
        a.item_id.localeCompare(b.item_id),
    ),
    seasons: Object.fromEntries(
      [
        ...new Set(
          (model.rows.facts.item_seasons ?? []).map((row) =>
            String(row.item_id),
          ),
        ),
      ].map((id) => [id, projectItemSeasons(model, id)]),
    ),
  };
}

/**
 * Get a single item by ID (server-side, for prerendering).
 */
export function getItemById(id: string): Item | null {
  return queryOne<Item>(`${ITEM_DETAIL_SELECT} WHERE i.id = ?`, [id]);
}

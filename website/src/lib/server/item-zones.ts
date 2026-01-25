/**
 * Item zone query utilities
 *
 * Functions for querying items by zone - which items can be obtained or used
 * in specific zones.
 */

import type Database from "better-sqlite3";
import type {
  ItemSourceType,
  ItemUsageType,
  ZoneInfo,
  ItemInfo,
} from "$lib/types/item-sources";

/**
 * Get all zones where an item can be obtained
 */
export function getItemObtainableZones(
  db: Database.Database,
  itemId: string,
): Array<ZoneInfo & { sourceTypes: ItemSourceType[] }> {
  const stmt = db.prepare(`
		SELECT DISTINCT
			z.id as zone_id,
			z.name as zone_name,
			GROUP_CONCAT(DISTINCT izo.source_type, ',') as source_types
		FROM item_zones_obtainable izo
		JOIN zones z ON izo.zone_id = z.id
		WHERE izo.item_id = ?
		GROUP BY z.id, z.name
		ORDER BY z.name ASC
	`);

  const results = stmt.all(itemId) as Array<{
    zone_id: string;
    zone_name: string;
    source_types: string;
  }>;

  return results.map((r) => ({
    zone_id: r.zone_id,
    zone_name: r.zone_name,
    sourceTypes: r.source_types.split(",") as ItemSourceType[],
  }));
}

/**
 * Get all zones where an item can be used
 */
export function getItemUsableZones(
  db: Database.Database,
  itemId: string,
): Array<ZoneInfo & { usageTypes: ItemUsageType[] }> {
  const stmt = db.prepare(`
		SELECT DISTINCT
			z.id as zone_id,
			z.name as zone_name,
			GROUP_CONCAT(DISTINCT izu.usage_type, ',') as usage_types
		FROM item_zones_usable izu
		JOIN zones z ON izu.zone_id = z.id
		WHERE izu.item_id = ?
		GROUP BY z.id, z.name
		ORDER BY z.name ASC
	`);

  const results = stmt.all(itemId) as Array<{
    zone_id: string;
    zone_name: string;
    usage_types: string;
  }>;

  return results.map((r) => ({
    zone_id: r.zone_id,
    zone_name: r.zone_name,
    usageTypes: r.usage_types.split(",") as ItemUsageType[],
  }));
}

/**
 * Get all items obtainable in a specific zone, optionally filtered by source type
 */
export function getItemsObtainableInZone(
  db: Database.Database,
  zoneId: string,
  sourceType?: ItemSourceType,
): ItemInfo[] {
  const query = `
		SELECT DISTINCT
			i.id as item_id,
			i.name as item_name,
			i.quality,
			i.item_type
		FROM item_zones_obtainable izo
		JOIN items i ON izo.item_id = i.id
		WHERE izo.zone_id = ?
		${sourceType ? "AND izo.source_type = ?" : ""}
		ORDER BY i.name ASC
	`;

  const stmt = db.prepare(query);
  const params = sourceType ? [zoneId, sourceType] : [zoneId];

  return stmt.all(...params) as ItemInfo[];
}

/**
 * Get all items usable in a specific zone, optionally filtered by usage type
 */
export function getItemsUsableInZone(
  db: Database.Database,
  zoneId: string,
  usageType?: ItemUsageType,
): ItemInfo[] {
  const query = `
		SELECT DISTINCT
			i.id as item_id,
			i.name as item_name,
			i.quality,
			i.item_type
		FROM item_zones_usable izu
		JOIN items i ON izu.item_id = i.id
		WHERE izu.zone_id = ?
		${usageType ? "AND izu.usage_type = ?" : ""}
		ORDER BY i.name ASC
	`;

  const stmt = db.prepare(query);
  const params = usageType ? [zoneId, usageType] : [zoneId];

  return stmt.all(...params) as ItemInfo[];
}

/**
 * Get items grouped by whether they're obtainable or usable in a zone
 */
export function getZoneItemsBreakdown(
  db: Database.Database,
  zoneId: string,
): {
  obtainable: ItemInfo[];
  usable: ItemInfo[];
  both: ItemInfo[];
} {
  const obtainableSet = new Set(
    getItemsObtainableInZone(db, zoneId).map((i) => i.item_id),
  );
  const usableSet = new Set(
    getItemsUsableInZone(db, zoneId).map((i) => i.item_id),
  );

  const obtainable: ItemInfo[] = [];
  const usable: ItemInfo[] = [];
  const both: ItemInfo[] = [];

  // Get all items in either category
  const stmt = db.prepare(`
		SELECT DISTINCT
			i.id as item_id,
			i.name as item_name,
			i.quality,
			i.item_type
		FROM items i
		WHERE i.id IN (
			SELECT item_id FROM item_zones_obtainable WHERE zone_id = ?
			UNION
			SELECT item_id FROM item_zones_usable WHERE zone_id = ?
		)
		ORDER BY i.name ASC
	`);

  const allItems = stmt.all(zoneId, zoneId) as ItemInfo[];

  for (const item of allItems) {
    const isObtainable = obtainableSet.has(item.item_id);
    const isUsable = usableSet.has(item.item_id);

    if (isObtainable && isUsable) {
      both.push(item);
    } else if (isObtainable) {
      obtainable.push(item);
    } else if (isUsable) {
      usable.push(item);
    }
  }

  return { obtainable, usable, both };
}

/**
 * Search for items by zone with both obtainability and usability
 */
export function searchItemsByZone(
  db: Database.Database,
  zoneId: string,
  query?: string,
): Array<
  ItemInfo & { obtainableTypes: ItemSourceType[]; usableTypes: ItemUsageType[] }
> {
  const sql = `
		SELECT DISTINCT
			i.id as item_id,
			i.name as item_name,
			i.quality,
			i.item_type,
			GROUP_CONCAT(DISTINCT CASE WHEN izo.source_type IS NOT NULL THEN izo.source_type END, ',') as obtainable_types,
			GROUP_CONCAT(DISTINCT CASE WHEN izu.usage_type IS NOT NULL THEN izu.usage_type END, ',') as usable_types
		FROM items i
		LEFT JOIN item_zones_obtainable izo ON i.id = izo.item_id AND izo.zone_id = ?
		LEFT JOIN item_zones_usable izu ON i.id = izu.item_id AND izu.zone_id = ?
		WHERE (izo.item_id IS NOT NULL OR izu.item_id IS NOT NULL)
		${query ? "AND i.name LIKE ?" : ""}
		GROUP BY i.id, i.name, i.quality, i.item_type
		ORDER BY i.name ASC
	`;

  const stmt = db.prepare(sql);
  const params = query ? [zoneId, zoneId, `%${query}%`] : [zoneId, zoneId];

  const results = stmt.all(...params) as Array<{
    item_id: string;
    item_name: string;
    quality: number;
    item_type: string;
    obtainable_types: string | null;
    usable_types: string | null;
  }>;

  return results.map((r) => ({
    item_id: r.item_id,
    item_name: r.item_name,
    quality: r.quality,
    item_type: r.item_type,
    obtainableTypes: r.obtainable_types
      ? (r.obtainable_types.split(",") as ItemSourceType[])
      : [],
    usableTypes: r.usable_types
      ? (r.usable_types.split(",") as ItemUsageType[])
      : [],
  }));
}

/**
 * Get statistics about items in a zone
 */
export function getZoneItemStats(
  db: Database.Database,
  zoneId: string,
): {
  totalObtainable: number;
  totalUsable: number;
  totalBoth: number;
  sourceTypeBreakdown: Record<ItemSourceType, number>;
  usageTypeBreakdown: Record<ItemUsageType, number>;
} {
  const obtainableStmt = db.prepare(
    "SELECT COUNT(DISTINCT item_id) as count FROM item_zones_obtainable WHERE zone_id = ?",
  );
  const usableStmt = db.prepare(
    "SELECT COUNT(DISTINCT item_id) as count FROM item_zones_usable WHERE zone_id = ?",
  );
  const bothStmt = db.prepare(`
		SELECT COUNT(DISTINCT i.item_id) as count
		FROM item_zones_obtainable i
		JOIN item_zones_usable u ON i.item_id = u.item_id AND i.zone_id = u.zone_id
		WHERE i.zone_id = ?
	`);

  const totalObtainable = (obtainableStmt.get(zoneId) as { count: number })
    .count;
  const totalUsable = (usableStmt.get(zoneId) as { count: number }).count;
  const totalBoth = (bothStmt.get(zoneId) as { count: number }).count;

  const sourceTypeStmt = db.prepare(`
		SELECT source_type, COUNT(*) as count
		FROM item_zones_obtainable
		WHERE zone_id = ?
		GROUP BY source_type
	`);
  const sourceTypeBreakdown = {} as Record<ItemSourceType, number>;
  for (const row of sourceTypeStmt.all(zoneId) as Array<{
    source_type: ItemSourceType;
    count: number;
  }>) {
    sourceTypeBreakdown[row.source_type] = row.count;
  }

  const usageTypeStmt = db.prepare(`
		SELECT usage_type, COUNT(*) as count
		FROM item_zones_usable
		WHERE zone_id = ?
		GROUP BY usage_type
	`);
  const usageTypeBreakdown = {} as Record<ItemUsageType, number>;
  for (const row of usageTypeStmt.all(zoneId) as Array<{
    usage_type: ItemUsageType;
    count: number;
  }>) {
    usageTypeBreakdown[row.usage_type] = row.count;
  }

  return {
    totalObtainable,
    totalUsable,
    totalBoth,
    sourceTypeBreakdown,
    usageTypeBreakdown,
  };
}

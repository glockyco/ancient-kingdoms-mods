import type Database from "better-sqlite3";
import { getDb, query, queryOne } from "$lib/db.server";
import type {
  GatherItemListView,
  GatheringResource,
  GatheringResourceDrop,
  GatheringResourceSpawn,
  Chest,
  GatherItemDetail,
  ResourceDropListView,
} from "$lib/types/gather-items";

/**
 * Get all gather items (resources + chests) for list view.
 */
export function getGatherItemsFromDb(
  db: Database.Database,
): GatherItemListView[] {
  return db
    .prepare(
      `SELECT
      id,
      name,
      type,
      level,
      respawn_time,
      tool_or_key_id,
      tool_or_key_name,
      zone_count,
      item_reward_id,
      item_reward_name,
      item_reward_amount
    FROM (
      -- Non-fishing gathering resources
      SELECT
        gr.id,
        gr.name,
        CASE
          WHEN gr.is_plant = 1 THEN 'Plant'
          WHEN gr.is_mineral = 1 THEN 'Mineral'
          WHEN gr.is_radiant_spark = 1 THEN 'Radiant Spark'
          ELSE 'Resource'
        END as type,
        gr.level,
        gr.respawn_time,
        gr.tool_required_id as tool_or_key_id,
        t.name as tool_or_key_name,
        (SELECT COUNT(DISTINCT zone_id) FROM gathering_resource_spawns WHERE resource_id = gr.id) as zone_count,
        gr.item_reward_id,
        r.name as item_reward_name,
        gr.item_reward_amount
      FROM gathering_resources gr
      LEFT JOIN items t ON gr.tool_required_id = t.id
      LEFT JOIN items r ON gr.item_reward_id = r.id
      WHERE gr.is_fishing_spot = 0

      UNION ALL

      -- Fishing spots, collapsed by stable base id.
      SELECT
        replace(substr(gr.id, 1, length(gr.id) - 9), '__never__', '') as id,
        gr.name,
        'Fishing Spot' as type,
        gr.level,
        MIN(gr.respawn_time) as respawn_time,
        gr.tool_required_id as tool_or_key_id,
        t.name as tool_or_key_name,
        COUNT(DISTINCT grs.zone_id) as zone_count,
        NULL as item_reward_id,
        NULL as item_reward_name,
        0 as item_reward_amount
      FROM gathering_resources gr
      LEFT JOIN gathering_resource_spawns grs ON grs.resource_id = gr.id
      LEFT JOIN items t ON gr.tool_required_id = t.id
      WHERE gr.is_fishing_spot = 1
      GROUP BY replace(substr(gr.id, 1, length(gr.id) - 9), '__never__', ''), gr.name, gr.level, gr.tool_required_id, t.name

      UNION ALL

      -- Chests
      SELECT
        c.id,
        c.name,
        'Chest' as type,
        NULL as level,
        c.respawn_time,
        c.key_required_id as tool_or_key_id,
        k.name as tool_or_key_name,
        1 as zone_count,
        c.item_reward_id,
        r.name as item_reward_name,
        c.item_reward_amount
      FROM chests c
      LEFT JOIN items k ON c.key_required_id = k.id
      LEFT JOIN items r ON c.item_reward_id = r.id
    )
    ORDER BY type, name`,
    )
    .all() as GatherItemListView[];
}

export function getGatherItems(): GatherItemListView[] {
  return getGatherItemsFromDb(getDb());
}

/**
 * Chest info for list view with zone data
 */
export interface ChestListView {
  id: string;
  name: string;
  respawn_time: number;
  tool_or_key_id: string | null;
  tool_or_key_name: string | null;
  zone_id: string;
  zone_name: string;
  is_dungeon: boolean;
  position_x: number | null;
  position_y: number | null;
  gold_min: number;
  gold_max: number;
  item_reward_id: string | null;
  item_reward_name: string | null;
  item_reward_amount: number;
}

/**
 * Get all chests with zone info for list view.
 */
export function getChestsList(): ChestListView[] {
  return query<ChestListView>(
    `SELECT
      c.id,
      c.name,
      c.respawn_time,
      c.key_required_id as tool_or_key_id,
      k.name as tool_or_key_name,
      c.zone_id,
      z.name as zone_name,
      z.is_dungeon,
      c.position_x,
      c.position_y,
      c.gold_min,
      c.gold_max,
      c.item_reward_id,
      r.name as item_reward_name,
      c.item_reward_amount
    FROM chests c
    JOIN zones z ON c.zone_id = z.id
    LEFT JOIN items k ON c.key_required_id = k.id
    LEFT JOIN items r ON c.item_reward_id = r.id
    ORDER BY z.name, c.name`,
  );
}

/**
 * Get a gathering resource by ID.
 */
function fishingSpotBaseId(id: string): string {
  return id.replace(/_[0-9a-f]{8}$/u, "");
}

function fishingSpotVariantGlob(baseId: string): string {
  return `${baseId}_[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]`;
}

const gatheringResourceSelect = `SELECT
      gr.id,
      gr.name,
      gr.is_plant,
      gr.is_fishing_spot,
      gr.is_mineral,
      gr.is_radiant_spark,
      gr.level,
      gr.tool_required_id,
      t.name as tool_required_name,
      gr.respawn_time,
      gr.item_reward_id,
      r.name as item_reward_name,
      gr.item_reward_amount,
      gr.gathering_exp,
      gr.description
    FROM gathering_resources gr
    LEFT JOIN items t ON gr.tool_required_id = t.id
    LEFT JOIN items r ON gr.item_reward_id = r.id`;

export function getGatheringResourceByIdFromDb(
  db: Database.Database,
  id: string,
): GatheringResource | null {
  const exact = db
    .prepare(`${gatheringResourceSelect} WHERE gr.id = ?`)
    .get(id) as GatheringResource | undefined;
  if (exact) return exact;

  return (
    (db
      .prepare(
        `${gatheringResourceSelect}
        WHERE gr.is_fishing_spot = 1
          AND gr.id GLOB ?
        ORDER BY gr.level, gr.name, gr.id
        LIMIT 1`,
      )
      .get(fishingSpotVariantGlob(id)) as GatheringResource | undefined) ?? null
  );
}

export function getGatheringResourceById(id: string): GatheringResource | null {
  return getGatheringResourceByIdFromDb(getDb(), id);
}

/**
 * Get drops for a gathering resource.
 * Excludes the guaranteed reward item (item_reward_id) since that's shown separately.
 */
export function getGatheringResourceDropsFromDb(
  db: Database.Database,
  resourceId: string,
  includeFishingTrash = false,
): GatheringResourceDrop[] {
  const drops = db
    .prepare(
      `SELECT
        isg.item_id,
        i.name as item_name,
        isg.drop_rate,
        isg.actual_drop_chance,
        0 as is_fishing_trash
      FROM item_sources_gather isg
      JOIN items i ON isg.item_id = i.id
      JOIN gathering_resources gr ON gr.id = isg.resource_id
      WHERE isg.resource_id = ?
        AND (gr.item_reward_id IS NULL OR isg.item_id != gr.item_reward_id)
      ORDER BY isg.drop_rate DESC`,
    )
    .all(resourceId) as GatheringResourceDrop[];

  if (!includeFishingTrash) return drops;

  const trashDrops = db
    .prepare(
      `SELECT
        f.item_id,
        i.name as item_name,
        0 as drop_rate,
        NULL as actual_drop_chance,
        1 as is_fishing_trash
      FROM fish f
      JOIN items i ON i.id = f.item_id
      WHERE f.is_trash = 1
      ORDER BY i.name`,
    )
    .all() as GatheringResourceDrop[];

  return [...drops, ...trashDrops];
}

export function getGatheringResourceDrops(
  resourceId: string,
): GatheringResourceDrop[] {
  return getGatheringResourceDropsFromDb(getDb(), resourceId);
}

/**
 * Get all resource drops for list view.
 */
export function getAllResourceDropsFromDb(
  db: Database.Database,
): ResourceDropListView[] {
  return db
    .prepare(
      `SELECT DISTINCT
      CASE
        WHEN gr.is_fishing_spot = 1 THEN replace(substr(gr.id, 1, length(gr.id) - 9), '__never__', '')
        ELSE grd.resource_id
      END as resource_id,
      grd.item_id,
      i.name as item_name
    FROM item_sources_gather grd
    JOIN gathering_resources gr ON gr.id = grd.resource_id
    JOIN items i ON grd.item_id = i.id
    ORDER BY resource_id, i.name`,
    )
    .all() as ResourceDropListView[];
}

export function getAllResourceDrops(): ResourceDropListView[] {
  return getAllResourceDropsFromDb(getDb());
}

/**
 * Get spawn locations for a gathering resource (grouped by zone).
 */
export function getGatheringResourceSpawnsFromDb(
  db: Database.Database,
  resourceId: string,
): GatheringResourceSpawn[] {
  return db
    .prepare(
      `SELECT
        grs.zone_id,
        z.name as zone_name,
        COUNT(*) as spawn_count
      FROM gathering_resource_spawns grs
      JOIN zones z ON grs.zone_id = z.id
      WHERE grs.resource_id = ?
      GROUP BY grs.zone_id, z.name
      ORDER BY spawn_count DESC`,
    )
    .all(resourceId) as GatheringResourceSpawn[];
}

export function getGatheringResourceSpawns(
  resourceId: string,
): GatheringResourceSpawn[] {
  return getGatheringResourceSpawnsFromDb(getDb(), resourceId);
}

export interface FishingSpotVariantDetail {
  resource: GatheringResource;
  drops: GatheringResourceDrop[];
  spawns: GatheringResourceSpawn[];
}

export function getFishingSpotVariantDetails(
  db: Database.Database,
  resource: GatheringResource,
): FishingSpotVariantDetail[] {
  if (!resource.is_fishing_spot) {
    return [
      {
        resource,
        drops: getGatheringResourceDropsFromDb(db, resource.id),
        spawns: getGatheringResourceSpawnsFromDb(db, resource.id),
      },
    ];
  }

  const baseId = fishingSpotBaseId(resource.id);
  const resources = db
    .prepare(
      `${gatheringResourceSelect}
      WHERE gr.id = ?
        OR gr.id GLOB ?
      ORDER BY gr.level, gr.name, gr.id`,
    )
    .all(baseId, fishingSpotVariantGlob(baseId)) as GatheringResource[];

  return resources.map((variant) => ({
    resource: variant,
    drops: getGatheringResourceDropsFromDb(db, variant.id, true),
    spawns: getGatheringResourceSpawnsFromDb(db, variant.id),
  }));
}
/**
 * Zone info for list view
 */
export interface ResourceZoneInfo {
  resource_id: string;
  zone_id: string;
  zone_name: string;
  is_dungeon: boolean;
}

/**
 * Get all resource-zone relationships for list view.
 */
export function getResourceZonesFromDb(
  db: Database.Database,
): ResourceZoneInfo[] {
  return db
    .prepare(
      `SELECT DISTINCT
      CASE
        WHEN gr.is_fishing_spot = 1 THEN replace(substr(gr.id, 1, length(gr.id) - 9), '__never__', '')
        ELSE grs.resource_id
      END as resource_id,
      grs.zone_id,
      z.name as zone_name,
      z.is_dungeon
    FROM gathering_resource_spawns grs
    JOIN gathering_resources gr ON gr.id = grs.resource_id
    JOIN zones z ON grs.zone_id = z.id
    ORDER BY z.name`,
    )
    .all() as ResourceZoneInfo[];
}

export function getResourceZones(): ResourceZoneInfo[] {
  return getResourceZonesFromDb(getDb());
}

/**
 * Drop info for chests
 */
export interface ChestDrop {
  item_id: string;
  item_name: string;
  drop_rate: number;
  actual_drop_chance: number | null;
}

/**
 * Get drops for a chest.
 * Excludes the guaranteed reward item (item_reward_id) since that's shown separately.
 */
export function getChestDrops(chestId: string): ChestDrop[] {
  return query<ChestDrop>(
    `SELECT
      isc.item_id,
      i.name as item_name,
      isc.drop_rate,
      isc.actual_drop_chance
    FROM item_sources_chest isc
    JOIN items i ON isc.item_id = i.id
    JOIN chests c ON c.id = isc.chest_id
    WHERE isc.chest_id = ?
      AND (c.item_reward_id IS NULL OR isc.item_id != c.item_reward_id)
    ORDER BY isc.drop_rate DESC`,
    [chestId],
  );
}

/**
 * Chest drop info for list view (includes chest_id)
 */
export interface ChestDropListView {
  chest_id: string;
  item_id: string;
  item_name: string;
}

/**
 * Get all chest random drops for list view (excludes guaranteed item_reward).
 */
export function getAllChestDrops(): ChestDropListView[] {
  return query<ChestDropListView>(
    `SELECT
      isc.chest_id,
      isc.item_id,
      i.name as item_name
    FROM item_sources_chest isc
    JOIN items i ON isc.item_id = i.id
    JOIN chests c ON c.id = isc.chest_id
    WHERE c.item_reward_id IS NULL OR isc.item_id != c.item_reward_id
    ORDER BY isc.chest_id, i.name`,
  );
}

/**
 * Get a chest by ID.
 */
export function getChestById(id: string): Chest | null {
  return queryOne<Chest>(
    `SELECT
      c.id,
      c.name,
      c.zone_id,
      z.name as zone_name,
      c.position_x,
      c.position_y,
      c.key_required_id,
      k.name as key_required_name,
      c.gold_min,
      c.gold_max,
      c.item_reward_id,
      r.name as item_reward_name,
      c.item_reward_amount,
      c.respawn_time
    FROM chests c
    JOIN zones z ON c.zone_id = z.id
    LEFT JOIN items k ON c.key_required_id = k.id
    LEFT JOIN items r ON c.item_reward_id = r.id
    WHERE c.id = ?`,
    [id],
  );
}

/**
 * Get a gather item by ID (either resource or chest).
 */
export function getGatherItemById(id: string): GatherItemDetail | null {
  // Try resource first
  const resource = getGatheringResourceById(id);
  if (resource) {
    const drops = getGatheringResourceDrops(id);
    const spawns = getGatheringResourceSpawns(id);
    return {
      type: "resource",
      resource,
      drops,
      spawns,
    };
  }

  // Try chest
  const chest = getChestById(id);
  if (chest) {
    return {
      type: "chest",
      chest,
    };
  }

  return null;
}

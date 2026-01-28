import { query, queryOne } from "$lib/db.server";
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
export function getGatherItems(): GatherItemListView[] {
  return query<GatherItemListView>(
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
      -- Gathering resources
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
  );
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
export function getGatheringResourceById(id: string): GatheringResource | null {
  return queryOne<GatheringResource>(
    `SELECT
      gr.id,
      gr.name,
      gr.is_plant,
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
    LEFT JOIN items r ON gr.item_reward_id = r.id
    WHERE gr.id = ?`,
    [id],
  );
}

/**
 * Get drops for a gathering resource.
 * Excludes the guaranteed reward item (item_reward_id) since that's shown separately.
 */
export function getGatheringResourceDrops(
  resourceId: string,
): GatheringResourceDrop[] {
  return query<GatheringResourceDrop>(
    `SELECT
      isg.item_id,
      i.name as item_name,
      isg.drop_rate,
      isg.actual_drop_chance
    FROM item_sources_gather isg
    JOIN items i ON isg.item_id = i.id
    JOIN gathering_resources gr ON gr.id = isg.resource_id
    WHERE isg.resource_id = ?
      AND (gr.item_reward_id IS NULL OR isg.item_id != gr.item_reward_id)
    ORDER BY isg.drop_rate DESC`,
    [resourceId],
  );
}

/**
 * Get all resource drops for list view.
 */
export function getAllResourceDrops(): ResourceDropListView[] {
  return query<ResourceDropListView>(
    `SELECT
      grd.resource_id,
      grd.item_id,
      i.name as item_name
    FROM item_sources_gather grd
    JOIN items i ON grd.item_id = i.id
    ORDER BY grd.resource_id, i.name`,
  );
}

/**
 * Get spawn locations for a gathering resource (grouped by zone).
 */
export function getGatheringResourceSpawns(
  resourceId: string,
): GatheringResourceSpawn[] {
  return query<GatheringResourceSpawn>(
    `SELECT
      grs.zone_id,
      z.name as zone_name,
      COUNT(*) as spawn_count
    FROM gathering_resource_spawns grs
    JOIN zones z ON grs.zone_id = z.id
    WHERE grs.resource_id = ?
    GROUP BY grs.zone_id, z.name
    ORDER BY spawn_count DESC`,
    [resourceId],
  );
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
export function getResourceZones(): ResourceZoneInfo[] {
  return query<ResourceZoneInfo>(
    `SELECT DISTINCT
      grs.resource_id,
      grs.zone_id,
      z.name as zone_name,
      z.is_dungeon
    FROM gathering_resource_spawns grs
    JOIN zones z ON grs.zone_id = z.id
    ORDER BY z.name`,
  );
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

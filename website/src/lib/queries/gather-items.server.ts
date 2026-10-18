import type Database from "better-sqlite3";
import { getDb, query } from "$lib/db.server";
import { loadAcquisition } from "$lib/server/acquisition";
import type { ProviderRef } from "$lib/acquisition/types";
import {
  chestRewardFields,
  primaryRewardFields,
} from "$lib/server/world-acquisition";
import { commonItemProbability } from "$lib/utils/primary-rewards";
import type {
  GatherItemListView,
  GatheringResource,
  GatheringResourceDrop,
  GatheringResourceSpawn,
  Chest,
  GatherItemDetail,
  ResourceDropListView,
} from "$lib/types/gather-items";

function hasVisualAssetsTable(db: Database.Database): boolean {
  return Boolean(
    db
      .prepare(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'visual_assets'",
      )
      .get(),
  );
}

function visualAssetColumns(enabled: boolean): string {
  return enabled
    ? "va.public_path as visual_public_path, va.width as visual_width, va.height as visual_height"
    : "NULL as visual_public_path, NULL as visual_width, NULL as visual_height";
}

function visualAssetJoin(
  enabled: boolean,
  domain: string,
  entityExpression: string,
  kind: string,
): string {
  return enabled
    ? `LEFT JOIN visual_assets va
        ON va.domain = '${domain}'
       AND va.entity_id = ${entityExpression}
       AND va.kind = '${kind}'`
    : "";
}

async function canonicalMethods(
  db: Database.Database,
  providers: readonly ProviderRef[],
) {
  const model = await loadAcquisition(
    async (sql, values) =>
      db.prepare(sql).all(...values) as Record<string, unknown>[],
    { kind: "providers", providers },
  );
  return {
    methods: [...model.methodViews.values()],
    items: Object.fromEntries(
      [...(model.entities.get("items") ?? [])].map(([id, item]) => [
        id,
        { name: String(item.name), quality: Number(item.quality) },
      ]),
    ),
  };
}

/**
 * Get all gather items (resources + chests) for list view.
 */
export async function getGatherItemsFromDb(
  db: Database.Database,
): Promise<GatherItemListView[]> {
  const assetsEnabled = hasVisualAssetsTable(db);
  const assetColumns = visualAssetColumns(assetsEnabled);
  const fishingAssetColumns = assetsEnabled
    ? "MAX(va.public_path) as visual_public_path, MAX(va.width) as visual_width, MAX(va.height) as visual_height"
    : "NULL as visual_public_path, NULL as visual_width, NULL as visual_height";
  const resourceAssetJoin = visualAssetJoin(
    assetsEnabled,
    "gathering_resource",
    "gr.id",
    "icon",
  );
  const chestAssetJoin = visualAssetJoin(
    assetsEnabled,
    "chest",
    "c.id",
    "primary",
  );

  const rows = db
    .prepare(
      `SELECT
      id,
      name,
      type,
      level,
      respawn_time,
      tool_required_id,
      tool_required_name,
      zone_count,
      visual_public_path,
      visual_width,
      visual_height
    FROM (
      -- Non-fishing gathering resources
      SELECT
        gr.id,
        gr.name,
        CASE
          WHEN gr.is_plant = 1 THEN 'Plant'
          WHEN gr.is_mineral = 1 THEN 'Mineral'
          WHEN gr.is_radiant_spark = 1 THEN 'Radiant Spark'
          ELSE 'Other'
        END as type,
        gr.level,
        gr.respawn_time,
        gr.tool_required_id,
        t.name as tool_required_name,
        (SELECT COUNT(DISTINCT zone_id) FROM gathering_resource_spawns WHERE resource_id = gr.id) as zone_count,
        ${assetColumns}
      FROM gathering_resources gr
      LEFT JOIN items t ON gr.tool_required_id = t.id
      ${resourceAssetJoin}
      WHERE gr.is_fishing_spot = 0

      UNION ALL

      -- Fishing spots, collapsed by stable base id.
      SELECT
        replace(substr(gr.id, 1, length(gr.id) - 9), '__never__', '') as id,
        gr.name,
        'Fishing Spot' as type,
        gr.level,
        MIN(gr.respawn_time) as respawn_time,
        gr.tool_required_id,
        t.name as tool_required_name,
        COUNT(DISTINCT grs.zone_id) as zone_count,
        ${fishingAssetColumns}
      FROM gathering_resources gr
      LEFT JOIN gathering_resource_spawns grs ON grs.resource_id = gr.id
      LEFT JOIN items t ON gr.tool_required_id = t.id
      ${resourceAssetJoin}
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
        NULL as tool_required_id,
        NULL as tool_required_name,
        1 as zone_count,
        ${assetColumns}
      FROM chests c
      ${chestAssetJoin}
    )
    ORDER BY type, name`,
    )
    .all() as GatherItemListView[];
  const providers = db
    .prepare("SELECT id FROM gathering_resource_spawns")
    .all() as { id: string }[];
  const chests = rows.filter((row) => row.type === "Chest");
  const { methods, items } = await canonicalMethods(db, [
    ...providers.map(({ id }) => ({ kind: "resource_spawns" as const, id })),
    ...chests.map(({ id }) => ({ kind: "chests" as const, id })),
  ]);
  return rows.map((row) => {
    const exact = methods.filter((method) =>
      row.type === "Chest"
        ? method.kind === "world_chest" && method.detail.chest_id === row.id
        : method.kind === "gather" &&
          (method.detail.resource_id === row.id ||
            (row.type === "Fishing Spot" &&
              fishingSpotBaseId(String(method.detail.resource_id)) === row.id)),
    );
    const chest = row.type === "Chest" ? chestRewardFields(exact, items) : null;
    const tool = row as unknown as {
      tool_required_id: string | null;
      tool_required_name: string | null;
    };
    return {
      ...row,
      ...primaryRewardFields(exact, items),
      tool_or_key_id: chest ? chest.key_required_id : tool.tool_required_id,
      tool_or_key_name: chest
        ? chest.key_required_name
        : tool.tool_required_name,
    };
  });
}

export function getGatherItems(): Promise<GatherItemListView[]> {
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
  chest_reward_probability: number;
  visual_public_path: string | null;
  visual_width: number | null;
  visual_height: number | null;
}

/**
 * Get all chests with zone info for list view.
 */
export async function getChestsListFromDb(
  db: Database.Database,
): Promise<ChestListView[]> {
  const assetsEnabled = hasVisualAssetsTable(db);
  const rows = db
    .prepare(
      `SELECT
      c.id,
      c.name,
      c.respawn_time,
      c.zone_id,
      z.name as zone_name,
      z.is_dungeon,
      c.position_x,
      c.position_y,
      ${visualAssetColumns(assetsEnabled)}
    FROM chests c
    JOIN zones z ON c.zone_id = z.id
    ${visualAssetJoin(assetsEnabled, "chest", "c.id", "primary")}
    ORDER BY z.name, c.name`,
    )
    .all() as ChestListView[];
  const { methods, items } = await canonicalMethods(
    db,
    rows.map(({ id }) => ({ kind: "chests", id })),
  );
  return rows.map((row) => {
    const exact = methods.filter(
      (method) =>
        method.kind === "world_chest" && method.detail.chest_id === row.id,
    );
    const rewards = chestRewardFields(exact, items);
    return {
      ...row,
      ...rewards,
      tool_or_key_id: rewards.key_required_id,
      tool_or_key_name: rewards.key_required_name,
    };
  });
}

export function getChestsList(): Promise<ChestListView[]> {
  return getChestsListFromDb(getDb());
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

function gatheringResourceSelect(db: Database.Database): string {
  const assetsEnabled = hasVisualAssetsTable(db);
  return `SELECT
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
      gr.gathering_exp,
      gr.description,
      ${visualAssetColumns(assetsEnabled)}
    FROM gathering_resources gr
    LEFT JOIN items t ON gr.tool_required_id = t.id
    ${visualAssetJoin(assetsEnabled, "gathering_resource", "gr.id", "icon")}`;
}

export async function getGatheringResourceByIdFromDb(
  db: Database.Database,
  id: string,
): Promise<GatheringResource | null> {
  const exact = db
    .prepare(`${gatheringResourceSelect(db)} WHERE gr.id = ?`)
    .get(id) as GatheringResource | undefined;
  if (exact) return attachResourceRewards(db, exact);

  const variant =
    (db
      .prepare(
        `${gatheringResourceSelect(db)}
        WHERE gr.is_fishing_spot = 1
          AND gr.id GLOB ?
        ORDER BY gr.level, gr.name, gr.id
        LIMIT 1`,
      )
      .get(fishingSpotVariantGlob(id)) as GatheringResource | undefined) ??
    null;
  return variant ? attachResourceRewards(db, variant) : null;
}

async function attachResourceRewards(
  db: Database.Database,
  resource: GatheringResource,
): Promise<GatheringResource> {
  const spawns = db
    .prepare("SELECT id FROM gathering_resource_spawns WHERE resource_id = ?")
    .all(resource.id) as { id: string }[];
  const { methods, items } = await canonicalMethods(
    db,
    spawns.map(({ id }) => ({ kind: "resource_spawns", id })),
  );
  return {
    ...resource,
    ...primaryRewardFields(
      methods.filter(
        (method) =>
          method.kind === "gather" && method.detail.resource_id === resource.id,
      ),
      items,
    ),
  };
}

export function getGatheringResourceById(
  id: string,
): Promise<GatheringResource | null> {
  return getGatheringResourceByIdFromDb(getDb(), id);
}

/** Get canonical pool outcomes, separately from direct primary deliveries. */
export function getGatheringResourceDropsFromDb(
  db: Database.Database,
  resourceId: string,
  includeFishingTrash = false,
): GatheringResourceDrop[] {
  const drops = db
    .prepare(
      `SELECT
        DISTINCT entry.item_id,
        i.name as item_name,
        i.quality,
        entry.probability as drop_rate,
        NULL as actual_drop_chance,
        0 as is_fishing_trash
      FROM acquisition_resource_details detail
      JOIN acquisition_method_pools membership ON membership.method_id = detail.id
      JOIN loot_pools pool ON pool.id = membership.pool_id
      JOIN loot_pool_entries entry ON entry.pool_id = pool.id
      JOIN items i ON entry.item_id = i.id
      WHERE detail.resource_id = ?
        AND pool.kind IN ('resource_secondary', 'fishing_primary')
        AND entry.withheld = 0
      ORDER BY i.name`,
    )
    .all(resourceId) as GatheringResourceDrop[];

  if (!includeFishingTrash) return drops;

  const trashDrops = db
    .prepare(
      `SELECT DISTINCT
        entry.item_id,
        i.name as item_name,
        i.quality,
        entry.probability as drop_rate,
        NULL as actual_drop_chance,
        1 as is_fishing_trash
      FROM loot_pool_entries entry
      JOIN loot_pools pool ON pool.id = entry.pool_id AND pool.kind = 'fishing_trash'
      JOIN items i ON i.id = entry.item_id
      WHERE entry.withheld = 0
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
        ELSE detail.resource_id
      END as resource_id,
      entry.item_id,
      i.name as item_name
    FROM acquisition_resource_details detail
    JOIN acquisition_method_pools membership ON membership.method_id = detail.id
    JOIN loot_pools pool ON pool.id = membership.pool_id
    JOIN loot_pool_entries entry ON entry.pool_id = pool.id
    JOIN gathering_resources gr ON gr.id = detail.resource_id
    JOIN items i ON entry.item_id = i.id
    WHERE pool.kind IN ('resource_secondary', 'fishing_primary')
      AND entry.withheld = 0
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

export async function getFishingSpotVariantDetails(
  db: Database.Database,
  resource: GatheringResource,
): Promise<FishingSpotVariantDetail[]> {
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
      `${gatheringResourceSelect(db)}
      WHERE gr.id = ?
        OR gr.id GLOB ?
      ORDER BY gr.level, gr.name, gr.id`,
    )
    .all(baseId, fishingSpotVariantGlob(baseId)) as GatheringResource[];

  return Promise.all(
    resources.map(async (variant) => ({
      resource: await attachResourceRewards(db, variant),
      drops: getGatheringResourceDropsFromDb(db, variant.id, true),
      spawns: getGatheringResourceSpawnsFromDb(db, variant.id),
    })),
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
  quality: number;
  actual_drop_chance: number | null;
  drop_rate: number | null;
}

/** Get canonical random chest pool outcomes. */
export async function getChestDrops(chestId: string): Promise<ChestDrop[]> {
  const { methods, items } = await canonicalMethods(getDb(), [
    { kind: "chests", id: chestId },
  ]);
  const exact = methods.filter(
    (method) =>
      method.kind === "world_chest" && method.detail.chest_id === chestId,
  );
  const itemIds = new Set(
    exact.flatMap((method) => {
      const fixed = new Set(
        method.outputs
          .filter((output) => output.yield_rule !== "pool")
          .map((output) => output.item_id),
      );
      const pooled = new Set(
        method.outputs
          .filter((output) => output.yield_rule === "pool")
          .map((output) => output.item_id),
      );
      return method.probabilityResults.flatMap((result) =>
        result.target.kind === "item" &&
        (!fixed.has(result.target.itemId) || pooled.has(result.target.itemId))
          ? [result.target.itemId]
          : [],
      );
    }),
  );
  return [...itemIds].map((itemId) => ({
    item_id: itemId,
    item_name: items[itemId]?.name ?? itemId,
    quality: items[itemId].quality,
    drop_rate: commonItemProbability(exact, itemId, "successful_opening"),
    actual_drop_chance: commonItemProbability(
      exact,
      itemId,
      "successful_opening",
    ),
  }));
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
 * Get all canonical chest random pool outcomes for list view.
 */
export function getAllChestDrops(): ChestDropListView[] {
  return query<ChestDropListView>(
    `SELECT
      DISTINCT detail.chest_id,
      entry.item_id,
      i.name as item_name
    FROM acquisition_world_chest_details detail
    JOIN acquisition_method_pools membership ON membership.method_id = detail.id
    JOIN loot_pool_entries entry ON entry.pool_id = membership.pool_id
    JOIN items i ON entry.item_id = i.id
    WHERE entry.withheld = 0
    ORDER BY detail.chest_id, i.name`,
  );
}

/**
 * Get a chest by ID.
 */
export async function getChestByIdFromDb(
  db: Database.Database,
  id: string,
): Promise<Chest | null> {
  const assetsEnabled = hasVisualAssetsTable(db);
  const chest = db
    .prepare(
      `SELECT
      c.id,
      c.name,
      c.zone_id,
      z.name as zone_name,
      c.position_x,
      c.position_y,
      c.respawn_time,
      ${visualAssetColumns(assetsEnabled)}
    FROM chests c
    JOIN zones z ON c.zone_id = z.id
    ${visualAssetJoin(assetsEnabled, "chest", "c.id", "primary")}
    WHERE c.id = ?`,
    )
    .get(id) as Chest | undefined;
  if (!chest) return null;
  const { methods, items } = await canonicalMethods(db, [
    { kind: "chests", id },
  ]);
  const exact = methods.filter(
    (method) => method.kind === "world_chest" && method.detail.chest_id === id,
  );
  return {
    ...chest,
    ...chestRewardFields(exact, items),
  };
}

export function getChestById(id: string): Promise<Chest | null> {
  return getChestByIdFromDb(getDb(), id);
}

/**
 * Get a gather item by ID (either resource or chest).
 */
export async function getGatherItemById(
  id: string,
): Promise<GatherItemDetail | null> {
  const resource = await getGatheringResourceById(id);
  if (resource) {
    const drops = getGatheringResourceDrops(resource.id);
    const spawns = getGatheringResourceSpawns(resource.id);
    return {
      type: "resource",
      resource,
      drops,
      spawns,
    };
  }

  // Try chest
  const chest = await getChestById(id);
  if (chest) {
    return {
      type: "chest",
      chest,
    };
  }

  return null;
}

import { query } from "$lib/db";
import { WORLD_BOSS_DUNGEON_ID } from "$lib/constants/constants";
import { TRAP_TYPE_LABELS, type TrapType } from "$lib/constants/traps";
import {
  searchEntities,
  type SearchKind,
  type SearchResult,
} from "$lib/search/search";
import { loadBrowserAcquisition, itemMapLocations } from "$lib/map/acquisition";
import { browserAcquisitionQuery } from "$lib/acquisition/browser";
import type { AcquisitionQuery } from "$lib/acquisition/types";
import { projectMonsterLoot } from "$lib/acquisition/projections";

export interface MapSearchBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export type MapSearchCategory =
  | "monster"
  | "npc"
  | "zone"
  | "resource"
  | "chest"
  | "treasure"
  | "altar"
  | "house"
  | "trap"
  | "crafting"
  | "portal"
  | "item"
  | "quest";

/** Display order retained for callers which need the legacy map grouping order. */
export const SEARCH_CATEGORY_ORDER: MapSearchCategory[] = [
  "zone",
  "altar",
  "monster",
  "npc",
  "resource",
  "item",
  "quest",
  "crafting",
  "chest",
  "treasure",
  "house",
  "trap",
  "portal",
];

export interface MapSearchResult {
  id: string;
  name: string;
  category: MapSearchCategory;
  image: string | null;
  subcategory?: string;
  quality?: number;
  /** Bounding box containing all spawn locations (null if no mappable location). */
  bounds: MapSearchBounds | null;
  zoneId?: string;
  zoneName?: string;
  level?: number;
  /** Number of physical source locations on the map. */
  spawnCount?: number;
  keywords?: string;
  roles?: Record<string, boolean>;
  renewalDungeonName?: string;
}

type GeometryRow = {
  id: string;
  min_x: number | null;
  max_x: number | null;
  min_y: number | null;
  max_y: number | null;
  zone_id: string | null;
  zone_name: string | null;
  level: number | null;
  spawn_count: number | null;
  subcategory?: string | null;
  keywords?: string | null;
  roles?: string | null;
  renewal_dungeon_name?: string | null;
  quality?: number | null;
  display_name?: string | null;
};

type MapEntityCategory = MapSearchCategory;

const ENTITY_CATEGORY: Partial<Record<SearchKind, MapEntityCategory>> = {
  monster: "monster",
  npc: "npc",
  zone: "zone",
  gathering_resource: "resource",
  chest: "chest",
  treasure: "treasure",
  altar: "altar",
  crafting_station: "crafting",
  alchemy_table: "crafting",
  scribing_table: "crafting",
  house: "house",
  trap: "trap",
  portal: "portal",
  item: "item",
  quest: "quest",
};

/**
 * These queries intentionally enrich the compact search result from the
 * authoritative compendium. Search ranking stays in the search index; these rows
 * only restore the map result contract and physical source geometry.
 */
const GEOMETRY_QUERY: Partial<Record<SearchKind, string>> = {
  npc: `
    SELECT n.id,
      MIN(ns.position_x) min_x, MAX(ns.position_x) max_x,
      MIN(ns.position_y) min_y, MAX(ns.position_y) max_y,
      ns.zone_id, z.name zone_name, n.level, COUNT(ns.id) spawn_count,
      CASE WHEN n.is_notable THEN 'notable'
           WHEN json_extract(n.roles, '$.is_merchant') = 1 THEN 'vendor'
           WHEN json_extract(n.roles, '$.is_quest_giver') = 1
                  OR json_extract(n.roles, '$.isQuestGiver') = 1 THEN 'quest' END subcategory,
      n.keywords, n.roles,
      CASE WHEN n.respawn_dungeon_id = ${WORLD_BOSS_DUNGEON_ID} THEN 'World Bosses'
           ELSE rz.name END renewal_dungeon_name,
      NULL quality, NULL display_name
    FROM npcs n
    LEFT JOIN npc_spawns ns ON ns.npc_id = n.id AND ns.position_x IS NOT NULL
    LEFT JOIN zones z ON z.id = ns.zone_id
    LEFT JOIN zones rz ON rz.zone_id = n.respawn_dungeon_id
    WHERE n.id IN (/*IDS*/)
    GROUP BY n.id
  `,
  zone: `
    SELECT z.id,
      z.bounds_min_x min_x, z.bounds_max_x max_x,
      z.bounds_min_y min_y, z.bounds_max_y max_y,
      z.id zone_id, z.name zone_name, NULL level, NULL spawn_count,
      NULL subcategory, NULL keywords, NULL roles, NULL renewal_dungeon_name,
      NULL quality, NULL display_name
    FROM zones z WHERE z.id IN (/*IDS*/)
  `,
  gathering_resource: `
    SELECT gr.id,
      MIN(gs.position_x) min_x, MAX(gs.position_x) max_x,
      MIN(gs.position_y) min_y, MAX(gs.position_y) max_y,
      gs.zone_id, z.name zone_name, gr.level, COUNT(gs.id) spawn_count,
      NULL subcategory, gr.keywords, NULL roles, NULL renewal_dungeon_name,
      NULL quality, NULL display_name
    FROM gathering_resources gr
    LEFT JOIN gathering_resource_spawns gs ON gs.resource_id = gr.id AND gs.position_x IS NOT NULL
    LEFT JOIN zones z ON z.id = gs.zone_id
    WHERE gr.id IN (/*IDS*/)
    GROUP BY gr.id
  `,
  chest: `
    SELECT c.id, c.position_x min_x, c.position_x max_x,
      c.position_y min_y, c.position_y max_y, c.zone_id, z.name zone_name,
      NULL level, 1 spawn_count, NULL subcategory, NULL keywords,
      NULL roles, NULL renewal_dungeon_name, NULL quality, 'Chest' display_name
    FROM chests c LEFT JOIN zones z ON z.id = c.zone_id
    WHERE c.id IN (/*IDS*/)
  `,
  treasure: `
    SELECT tl.id, tl.position_x min_x, tl.position_x max_x,
      tl.position_y min_y, tl.position_y max_y, tl.zone_id, z.name zone_name,
      NULL level, 1 spawn_count, NULL subcategory, NULL keywords,
      NULL roles, NULL renewal_dungeon_name, NULL quality, i.name display_name
    FROM treasure_locations tl
    LEFT JOIN items i ON i.id = tl.required_map_id
    LEFT JOIN zones z ON z.id = tl.zone_id
    WHERE tl.id IN (/*IDS*/)
  `,
  altar: `
    SELECT a.id, a.position_x min_x, a.position_x max_x,
      a.position_y min_y, a.position_y max_y, a.zone_id, z.name zone_name,
      a.min_level_required level, 1 spawn_count, a.type subcategory,
      NULL keywords, NULL roles, NULL renewal_dungeon_name, NULL quality, NULL display_name
    FROM altars a LEFT JOIN zones z ON z.id = a.zone_id
    WHERE a.id IN (/*IDS*/)
  `,
  house: `
    SELECT h.id, h.position_x min_x, h.position_x max_x,
      h.position_y min_y, h.position_y max_y, h.zone_id,
      COALESCE(h.zone_name, z.name) zone_name, NULL level, 1 spawn_count,
      printf('%d gold', h.base_price) subcategory, NULL keywords,
      NULL roles, NULL renewal_dungeon_name, NULL quality, h.name display_name
    FROM houses h LEFT JOIN zones z ON z.id = h.zone_id
    WHERE h.id IN (/*IDS*/)
  `,
  crafting_station: `
    SELECT c.id, c.position_x min_x, c.position_x max_x,
      c.position_y min_y, c.position_y max_y, c.zone_id, c.zone_name,
      NULL level, 1 spawn_count,
      CASE WHEN c.keywords LIKE '%scribing%' THEN 'scribing'
           WHEN c.keywords LIKE '%alchemy%' THEN 'alchemy'
           WHEN c.is_cooking_oven THEN 'cooking' ELSE 'forge' END subcategory,
      c.keywords, NULL roles, NULL renewal_dungeon_name, NULL quality, c.name display_name
    FROM crafting_stations c WHERE c.id IN (/*IDS*/)
  `,
  alchemy_table: `
    SELECT a.id, a.position_x min_x, a.position_x max_x,
      a.position_y min_y, a.position_y max_y, a.zone_id, a.sub_zone_name zone_name,
      NULL level, 1 spawn_count, 'alchemy' subcategory, a.keywords,
      NULL roles, NULL renewal_dungeon_name, NULL quality, a.name display_name
    FROM alchemy_tables a WHERE a.id IN (/*IDS*/)
  `,
  scribing_table: `
    SELECT s.id, s.position_x min_x, s.position_x max_x,
      s.position_y min_y, s.position_y max_y, s.zone_id, s.sub_zone_name zone_name,
      NULL level, 1 spawn_count, 'scribing' subcategory, s.keywords,
      NULL roles, NULL renewal_dungeon_name, NULL quality, s.name display_name
    FROM scribing_tables s WHERE s.id IN (/*IDS*/)
  `,
  portal: `
    SELECT p.id, p.position_x min_x, p.position_x max_x,
      p.position_y min_y, p.position_y max_y, p.from_zone_id zone_id,
      fz.name zone_name, NULL level, 1 spawn_count, NULL subcategory,
      p.keywords, NULL roles, NULL renewal_dungeon_name, NULL quality,
      CASE WHEN p.is_closed THEN 'Closed Portal'
           WHEN tz.name IS NOT NULL THEN 'Portal to ' || tz.name
           ELSE 'Portal' END display_name
    FROM portals p
    LEFT JOIN zones fz ON fz.id = p.from_zone_id
    LEFT JOIN zones tz ON tz.id = p.to_zone_id
    WHERE p.id IN (/*IDS*/) AND p.is_template = 0
  `,
  trap: `
    SELECT t.id, t.position_x min_x, t.position_x max_x,
      t.position_y min_y, t.position_y max_y, t.zone_id, z.name zone_name,
      NULL level, 1 spawn_count, t.type subcategory, t.keywords,
      NULL roles, NULL renewal_dungeon_name, NULL quality,
      COALESCE(s.name, CASE WHEN tz.name IS NOT NULL THEN 'Teleport to ' || tz.name
                            ELSE NULL END) display_name
    FROM traps t
    LEFT JOIN zones z ON z.id = t.zone_id
    LEFT JOIN skills s ON s.id = t.effect_skill_id
    LEFT JOIN zones tz ON tz.id = t.teleport_zone_id
    WHERE t.id IN (/*IDS*/)
  `,
  quest: `
    SELECT q.id,
      MIN(ns.position_x) min_x, MAX(ns.position_x) max_x,
      MIN(ns.position_y) min_y, MAX(ns.position_y) max_y,
      ns.zone_id, z.name zone_name, q.level_recommended level,
      COUNT(ns.id) spawn_count, q.display_type subcategory,
      NULL keywords, NULL roles, NULL renewal_dungeon_name, NULL quality,
      NULL display_name
    FROM quests q
    LEFT JOIN (SELECT DISTINCT npc_id, quest_id FROM npc_quest_memberships) nq ON nq.quest_id = q.id
    LEFT JOIN npc_spawns ns ON ns.npc_id = nq.npc_id AND ns.position_x IS NOT NULL
    LEFT JOIN zones z ON z.id = ns.zone_id
    WHERE q.id IN (/*IDS*/)
    GROUP BY q.id
  `,
};

function parseRoles(
  value: string | null | undefined,
): Record<string, boolean> | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).filter(([, enabled]) => enabled === true),
    ) as Record<string, boolean>;
  } catch {
    return undefined;
  }
}

async function itemBoundsQuery(
  itemIds: readonly string[],
  execute: AcquisitionQuery = browserAcquisitionQuery,
): Promise<GeometryRow[]> {
  const model = await loadBrowserAcquisition(
    { kind: "items", itemIds },
    execute,
  );
  return [...new Set(itemIds)].map((id) => {
    const locations = itemMapLocations(model, id);
    const positions = locations.flatMap((location) =>
      location.position ? [location.position] : [],
    );
    return {
      id,
      min_x: positions.length ? Math.min(...positions.map((p) => p.x)) : null,
      max_x: positions.length ? Math.max(...positions.map((p) => p.x)) : null,
      min_y: positions.length ? Math.min(...positions.map((p) => p.y)) : null,
      max_y: positions.length ? Math.max(...positions.map((p) => p.y)) : null,
      zone_id: null,
      zone_name: null,
      spawn_count: positions.length,
      level: null,
    };
  });
}

/** Physical locations available when the map selects this item. */
export async function getItemMapBounds(
  itemId: string,
  execute: AcquisitionQuery = browserAcquisitionQuery,
): Promise<MapSearchBounds | null> {
  const [row] = await itemBoundsQuery([itemId], execute);
  if (
    row?.min_x == null ||
    row.max_x == null ||
    row.min_y == null ||
    row.max_y == null
  ) {
    return null;
  }
  return {
    minX: row.min_x,
    maxX: row.max_x,
    minY: row.min_y,
    maxY: row.max_y,
  };
}

async function itemRows(
  matches: SearchResult[],
): Promise<Map<string, GeometryRow>> {
  const ids = matches.map((match) => match.id);
  const basics: { id: string; quality: number | null; level: number | null }[] =
    [];
  for (let offset = 0; offset < ids.length; offset += 200) {
    const batch = ids.slice(offset, offset + 200);
    basics.push(
      ...(await query<{
        id: string;
        quality: number | null;
        level: number | null;
      }>(
        `SELECT id,quality,level_required level FROM items WHERE id IN (${batch.map(() => "?").join(",")})`,
        batch,
      )),
    );
  }
  const bounds = await itemBoundsQuery(ids);
  const boundsById = new Map(bounds.map((row) => [row.id, row]));
  const result = new Map<string, GeometryRow>();
  for (const row of basics) {
    const source = boundsById.get(row.id);
    result.set(row.id, {
      ...(source ?? {
        id: row.id,
        min_x: null,
        max_x: null,
        min_y: null,
        max_y: null,
        zone_id: null,
        zone_name: null,
        spawn_count: null,
      }),
      quality: row.quality,
      level: row.level,
    });
  }
  return result;
}
async function monsterRows(matches: SearchResult[]): Promise<GeometryRow[]> {
  const model = await loadBrowserAcquisition({
    kind: "monsters",
    monsterIds: matches.map((match) => match.id),
  });
  return matches.map((match) => {
    const monster = model.entities.get("monsters")?.get(match.id);
    const contexts = projectMonsterLoot(model, match.id).contexts;
    const seen = new Set<string>();
    const locations = contexts.flatMap((method) =>
      method.providers.flatMap((provider) => {
        const location = provider.location;
        if (location?.geometryVisibility !== "visible" || !location.position)
          return [];
        const key = `${provider.ref.kind}:${provider.ref.id}:${location.position.x}:${location.position.y}:${location.position.z}`;
        if (seen.has(key)) return [];
        seen.add(key);
        return [location];
      }),
    );
    const positions = locations.map((location) => location.position!);
    const zoneId = locations[0]?.zoneId ?? null;
    return {
      id: match.id,
      min_x: positions.length ? Math.min(...positions.map((p) => p.x)) : null,
      max_x: positions.length ? Math.max(...positions.map((p) => p.x)) : null,
      min_y: positions.length ? Math.min(...positions.map((p) => p.y)) : null,
      max_y: positions.length ? Math.max(...positions.map((p) => p.y)) : null,
      zone_id: zoneId,
      zone_name: zoneId
        ? String(model.entities.get("zones")?.get(zoneId)?.name ?? "")
        : null,
      level: typeof monster?.level === "number" ? monster.level : null,
      spawn_count: positions.length,
      subcategory: monster?.is_fabled
        ? "fabled"
        : monster?.is_boss
          ? "boss"
          : monster?.is_elite
            ? "elite"
            : monster?.is_hunt
              ? "hunt"
              : null,
      keywords: typeof monster?.keywords === "string" ? monster.keywords : null,
    };
  });
}

function toMapSearchResult(
  match: SearchResult,
  row: GeometryRow | undefined,
): MapSearchResult {
  const category = ENTITY_CATEGORY[match.kind]!;
  const bounds =
    row?.min_x != null &&
    row.max_x != null &&
    row.min_y != null &&
    row.max_y != null
      ? { minX: row.min_x, maxX: row.max_x, minY: -row.max_y, maxY: -row.min_y }
      : null;
  const level = row?.level ?? undefined;
  const displayName =
    row?.display_name ??
    (category === "trap" && row?.subcategory
      ? TRAP_TYPE_LABELS[row.subcategory as TrapType]
      : undefined) ??
    match.name;
  return {
    id: match.id,
    name: displayName,
    category,
    image: match.image,
    subcategory: row?.subcategory ?? undefined,
    quality: row?.quality ?? undefined,
    bounds,
    zoneId: row?.zone_id ?? undefined,
    zoneName: row?.zone_name ?? undefined,
    level: level != null && level > 0 ? level : undefined,
    spawnCount:
      row?.spawn_count != null && row.spawn_count > 1
        ? row.spawn_count
        : undefined,
    keywords: row?.keywords ?? undefined,
    roles: parseRoles(row?.roles),
    renewalDungeonName: row?.renewal_dungeon_name ?? undefined,
  };
}

/** Search registered entities and attach authoritative compendium metadata. */
export async function searchMapEntities(
  searchQuery: string,
  limit = 20,
): Promise<MapSearchResult[]> {
  const matches = await searchEntities(searchQuery, {
    scope: "map",
    limit: Math.max(limit * 10, 100),
  });
  const mapMatches = matches.filter((match) =>
    Boolean(ENTITY_CATEGORY[match.kind]),
  );
  if (mapMatches.length === 0) return [];

  const grouped = new Map<string, SearchResult[]>();
  for (const match of mapMatches) {
    const group = grouped.get(match.kind) ?? [];
    group.push(match);
    grouped.set(match.kind, group);
  }

  const geometry = new Map<string, GeometryRow>();
  await Promise.all(
    [...grouped.entries()].map(async ([entityType, categoryMatches]) => {
      if (entityType === "item") {
        for (const [id, row] of await itemRows(categoryMatches))
          geometry.set(`${entityType}:${id}`, row);
        return;
      }
      if (entityType === "monster") {
        for (const row of await monsterRows(categoryMatches))
          geometry.set(`monster:${row.id}`, row);
        return;
      }
      const queryText = GEOMETRY_QUERY[entityType as SearchKind];
      if (!queryText) return;
      const ids = categoryMatches.map((match) => match.id);
      for (let offset = 0; offset < ids.length; offset += 200) {
        const batch = ids.slice(offset, offset + 200);
        const rows = await query<GeometryRow>(
          queryText.replaceAll("/*IDS*/", batch.map(() => "?").join(",")),
          batch,
        );
        for (const row of rows) geometry.set(`${entityType}:${row.id}`, row);
      }
    }),
  );

  return mapMatches
    .slice(0, limit)
    .map((match) =>
      toMapSearchResult(match, geometry.get(`${match.kind}:${match.id}`)),
    );
}

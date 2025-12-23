import { query } from "$lib/db";
import { EXCLUDED_ZONE_IDS } from "$lib/constants/exclusions";

/**
 * Generate SQL clause to exclude spawns in excluded zones.
 * Returns empty string if no exclusions.
 */
function getZoneExclusionClause(zoneColumn = "zone_id"): string {
  if (EXCLUDED_ZONE_IDS.size === 0) return "";
  const placeholders = Array.from(EXCLUDED_ZONE_IDS)
    .map((id) => `'${id}'`)
    .join(", ");
  return ` AND ${zoneColumn} NOT IN (${placeholders})`;
}

export interface MapSearchBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface MapSearchResult {
  id: string;
  name: string;
  category: "monster" | "npc" | "zone" | "resource" | "chest" | "altar";
  subcategory?: string;
  /** Bounding box containing all spawn locations (null if no mappable location) */
  bounds: MapSearchBounds | null;
  zoneId?: string;
  zoneName?: string;
  level?: number;
  /** Number of spawn locations on the map (for entities with multiple spawns) */
  spawnCount?: number;
  /** Override selection target (for altar/placeholder spawns that redirect to another entity) */
  selectTarget?: {
    category: "monster" | "altar";
    id: string;
  };
}

/**
 * Search all map entities using FTS5 prefix matching.
 * Returns entities from all zones (including excluded ones),
 * but entities in excluded zones will have position: null.
 */
export async function searchMapEntities(
  searchQuery: string,
  limit = 20,
): Promise<MapSearchResult[]> {
  if (!searchQuery.trim()) return [];

  const ftsQuery = searchQuery.trim() + "*";

  const [monsters, npcs, zones, resources, chests, altars] = await Promise.all([
    searchMonsters(ftsQuery, limit),
    searchNpcs(ftsQuery, limit),
    searchZones(ftsQuery, limit),
    searchGatheringResources(ftsQuery, limit),
    searchChests(ftsQuery, limit),
    searchAltars(ftsQuery, limit),
  ]);

  return [
    ...monsters,
    ...npcs,
    ...zones,
    ...resources,
    ...chests,
    ...altars,
  ].slice(0, limit);
}

interface MonsterSearchRow {
  id: string;
  name: string;
  is_boss: number;
  is_elite: number;
  is_hunt: number;
  min_x: number | null;
  max_x: number | null;
  min_y: number | null;
  max_y: number | null;
  zone_id: string | null;
  zone_name: string | null;
  level: number;
  spawn_count: number;
  redirect_type: string | null;
  parent_monster_id: string | null;
  altar_id: string | null;
  altar_x: number | null;
  altar_y: number | null;
}

async function searchMonsters(
  ftsQuery: string,
  limit: number,
): Promise<MapSearchResult[]> {
  // Query handles all spawn types (regular, summon, altar, placeholder)
  // redirect_type indicates if selection should redirect to altar/parent
  // For altar-only monsters, we also get altar position for fly-to
  const rows = await query<MonsterSearchRow>(
    `
    SELECT
      m.id,
      m.name,
      m.is_boss,
      m.is_elite,
      m.is_hunt,
      -- Spawn positions (all spawn types have their own positions)
      MIN(ms.position_x) as min_x,
      MAX(ms.position_x) as max_x,
      MIN(ms.position_y) as min_y,
      MAX(ms.position_y) as max_y,
      COALESCE(ms.zone_id, a.zone_id) as zone_id,
      COALESCE(z.name, az.name) as zone_name,
      COALESCE(ms.level, m.level) as level,
      COUNT(ms.id) as spawn_count,
      -- Determine redirect type: if monster has regular/summon spawns, no redirect
      -- Otherwise redirect to placeholder's parent or altar
      CASE
        WHEN SUM(CASE WHEN ms.spawn_type IN ('regular', 'summon') THEN 1 ELSE 0 END) > 0
          THEN NULL
        WHEN SUM(CASE WHEN ms.spawn_type = 'placeholder' THEN 1 ELSE 0 END) > 0
          THEN 'placeholder'
        WHEN SUM(CASE WHEN ms.spawn_type = 'altar' THEN 1 ELSE 0 END) > 0
          THEN 'altar'
        ELSE NULL
      END as redirect_type,
      MAX(CASE WHEN ms.spawn_type = 'placeholder' THEN ms.source_monster_id END) as parent_monster_id,
      MAX(CASE WHEN ms.spawn_type = 'altar' THEN ms.source_altar_id END) as altar_id,
      -- Altar position for fly-to (used when redirect_type = 'altar')
      MAX(a.position_x) as altar_x,
      MAX(a.position_y) as altar_y
    FROM monsters_fts mf
    JOIN monsters m ON mf.rowid = m.rowid
    LEFT JOIN monster_spawns ms ON ms.monster_id = m.id
    LEFT JOIN altars a ON a.id = ms.source_altar_id
    LEFT JOIN zones az ON az.id = a.zone_id
    LEFT JOIN zones z ON z.id = ms.zone_id
    WHERE mf.name MATCH ?
    GROUP BY m.id
    ORDER BY rank
    LIMIT ?
  `,
    [ftsQuery, limit],
  );

  return rows.map((r) => {
    // For altar-only monsters, use altar position for bounds (fly-to target)
    // This centers the view on the altar marker, not the spawn positions
    const useAltarPosition = r.redirect_type === "altar" && r.altar_x !== null;
    const boundsX = useAltarPosition ? r.altar_x! : r.min_x;
    const boundsY = useAltarPosition ? r.altar_y! : r.min_y;

    return {
      id: r.id,
      name: r.name,
      category: "monster" as const,
      subcategory: r.is_boss
        ? "boss"
        : r.is_elite
          ? "elite"
          : r.is_hunt
            ? "hunt"
            : undefined,
      bounds:
        boundsX !== null
          ? {
              minX: useAltarPosition ? boundsX : r.min_x!,
              maxX: useAltarPosition ? boundsX : r.max_x!,
              minY: useAltarPosition ? -boundsY! : -r.max_y!,
              maxY: useAltarPosition ? -boundsY! : -r.min_y!,
            }
          : null,
      zoneId: r.zone_id ?? undefined,
      zoneName: r.zone_name ?? undefined,
      level: r.level,
      spawnCount: r.spawn_count > 1 ? r.spawn_count : undefined,
      // Set selectTarget for altar/placeholder spawns
      selectTarget:
        r.redirect_type === "altar" && r.altar_id
          ? { category: "altar" as const, id: r.altar_id }
          : r.redirect_type === "placeholder" && r.parent_monster_id
            ? { category: "monster" as const, id: r.parent_monster_id }
            : undefined,
    };
  });
}

interface NpcSearchRow {
  id: string;
  name: string;
  roles: string | null;
  min_x: number | null;
  max_x: number | null;
  min_y: number | null;
  max_y: number | null;
  zone_id: string | null;
  zone_name: string | null;
  spawn_count: number;
}

async function searchNpcs(
  ftsQuery: string,
  limit: number,
): Promise<MapSearchResult[]> {
  const rows = await query<NpcSearchRow>(
    `
    SELECT
      n.id,
      n.name,
      n.roles,
      MIN(ns.position_x) as min_x,
      MAX(ns.position_x) as max_x,
      MIN(ns.position_y) as min_y,
      MAX(ns.position_y) as max_y,
      ns.zone_id,
      z.name as zone_name,
      COUNT(ns.id) as spawn_count
    FROM npcs_fts nf
    JOIN npcs n ON nf.rowid = n.rowid
    LEFT JOIN npc_spawns ns ON ns.npc_id = n.id
      AND ns.position_x IS NOT NULL
      ${getZoneExclusionClause("ns.zone_id")}
    LEFT JOIN zones z ON z.id = ns.zone_id
    WHERE nf.name MATCH ?
    GROUP BY n.id
    ORDER BY rank
    LIMIT ?
  `,
    [ftsQuery, limit],
  );

  return rows.map((r) => {
    const roles = r.roles ? JSON.parse(r.roles) : {};
    let subcategory: string | undefined;
    if (roles.isVendor) subcategory = "vendor";
    else if (roles.isQuestGiver) subcategory = "quest";

    return {
      id: r.id,
      name: r.name,
      category: "npc" as const,
      subcategory,
      bounds:
        r.min_x !== null
          ? {
              minX: r.min_x,
              maxX: r.max_x!,
              minY: -r.max_y!,
              maxY: -r.min_y!,
            }
          : null,
      zoneId: r.zone_id ?? undefined,
      zoneName: r.zone_name ?? undefined,
      spawnCount: r.spawn_count > 1 ? r.spawn_count : undefined,
    };
  });
}

interface ZoneSearchRow {
  id: string;
  name: string;
  min_x: number | null;
  max_x: number | null;
  min_y: number | null;
  max_y: number | null;
}

async function searchZones(
  ftsQuery: string,
  limit: number,
): Promise<MapSearchResult[]> {
  const rows = await query<ZoneSearchRow>(
    `
    SELECT
      z.id,
      z.name,
      MIN(zt.bounds_min_x) as min_x,
      MAX(zt.bounds_max_x) as max_x,
      MIN(zt.bounds_min_y) as min_y,
      MAX(zt.bounds_max_y) as max_y
    FROM zones_fts zf
    JOIN zones z ON zf.rowid = z.rowid
    LEFT JOIN zone_triggers zt ON zt.zone_id = z.zone_id
    WHERE zf.name MATCH ?
    GROUP BY z.id
    ORDER BY rank
    LIMIT ?
  `,
    [ftsQuery, limit],
  );

  return rows
    .filter((r) => !EXCLUDED_ZONE_IDS.has(r.id))
    .map((r) => ({
      id: r.id,
      name: r.name,
      category: "zone" as const,
      bounds:
        r.min_x !== null
          ? {
              minX: r.min_x,
              maxX: r.max_x!,
              minY: -r.max_y!,
              maxY: -r.min_y!,
            }
          : null,
      zoneId: r.id,
      zoneName: r.name,
    }));
}

interface ResourceSearchRow {
  id: string;
  name: string;
  level: number;
  min_x: number | null;
  max_x: number | null;
  min_y: number | null;
  max_y: number | null;
  zone_id: string | null;
  zone_name: string | null;
  spawn_count: number;
}

async function searchGatheringResources(
  ftsQuery: string,
  limit: number,
): Promise<MapSearchResult[]> {
  const rows = await query<ResourceSearchRow>(
    `
    SELECT
      gr.id,
      gr.name,
      gr.level,
      MIN(gs.position_x) as min_x,
      MAX(gs.position_x) as max_x,
      MIN(gs.position_y) as min_y,
      MAX(gs.position_y) as max_y,
      gs.zone_id,
      z.name as zone_name,
      COUNT(gs.id) as spawn_count
    FROM gathering_resources_fts grf
    JOIN gathering_resources gr ON grf.rowid = gr.rowid
    LEFT JOIN gathering_resource_spawns gs ON gs.resource_id = gr.id
      AND gs.position_x IS NOT NULL
      ${getZoneExclusionClause("gs.zone_id")}
    LEFT JOIN zones z ON z.id = gs.zone_id
    WHERE grf.name MATCH ?
    GROUP BY gr.id
    ORDER BY rank
    LIMIT ?
  `,
    [ftsQuery, limit],
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: "resource" as const,
    bounds:
      r.min_x !== null
        ? {
            minX: r.min_x,
            maxX: r.max_x!,
            minY: -r.max_y!,
            maxY: -r.min_y!,
          }
        : null,
    zoneId: r.zone_id ?? undefined,
    zoneName: r.zone_name ?? undefined,
    level: r.level,
    spawnCount: r.spawn_count > 1 ? r.spawn_count : undefined,
  }));
}

interface ChestSearchRow {
  id: string;
  name: string;
  position_x: number | null;
  position_y: number | null;
  zone_id: string | null;
  zone_name: string | null;
}

async function searchChests(
  ftsQuery: string,
  limit: number,
): Promise<MapSearchResult[]> {
  const rows = await query<ChestSearchRow>(
    `
    SELECT
      c.id,
      c.name,
      c.position_x,
      c.position_y,
      c.zone_id,
      z.name as zone_name
    FROM chests_fts cf
    JOIN chests c ON cf.rowid = c.rowid
    LEFT JOIN zones z ON z.id = c.zone_id
    WHERE cf.name MATCH ?
      ${getZoneExclusionClause("c.zone_id")}
    ORDER BY rank
    LIMIT ?
  `,
    [ftsQuery, limit],
  );

  return rows.map((r) => {
    const y = -r.position_y!;
    return {
      id: r.id,
      name: "Chest",
      category: "chest" as const,
      bounds:
        r.position_x !== null
          ? { minX: r.position_x, maxX: r.position_x, minY: y, maxY: y }
          : null,
      zoneId: r.zone_id ?? undefined,
      zoneName: r.zone_name ?? undefined,
    };
  });
}

interface AltarSearchRow {
  id: string;
  name: string;
  type: string;
  min_level_required: number;
  position_x: number | null;
  position_y: number | null;
  zone_id: string | null;
  zone_name: string | null;
}

async function searchAltars(
  ftsQuery: string,
  limit: number,
): Promise<MapSearchResult[]> {
  const rows = await query<AltarSearchRow>(
    `
    SELECT
      a.id,
      a.name,
      a.type,
      a.min_level_required,
      a.position_x,
      a.position_y,
      a.zone_id,
      z.name as zone_name
    FROM altars_fts af
    JOIN altars a ON af.rowid = a.rowid
    LEFT JOIN zones z ON z.id = a.zone_id
    WHERE af.name MATCH ?
      ${getZoneExclusionClause("a.zone_id")}
    ORDER BY rank
    LIMIT ?
  `,
    [ftsQuery, limit],
  );

  return rows.map((r) => {
    const y = -r.position_y!;
    return {
      id: r.id,
      name: r.name,
      category: "altar" as const,
      subcategory: r.type,
      bounds:
        r.position_x !== null
          ? { minX: r.position_x, maxX: r.position_x, minY: y, maxY: y }
          : null,
      zoneId: r.zone_id ?? undefined,
      zoneName: r.zone_name ?? undefined,
      level: r.min_level_required,
    };
  });
}

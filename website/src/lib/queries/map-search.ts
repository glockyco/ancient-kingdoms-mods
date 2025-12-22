import { query } from "$lib/db";
import { EXCLUDED_ZONE_IDS } from "$lib/constants/exclusions";

export interface MapSearchResult {
  id: string;
  name: string;
  category: "monster" | "npc" | "zone" | "resource" | "chest" | "altar";
  subcategory?: string;
  position: [number, number] | null;
  zoneId?: string;
  zoneName?: string;
  level?: number;
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
  position_x: number | null;
  position_y: number | null;
  zone_id: string | null;
  zone_name: string | null;
  level: number;
}

async function searchMonsters(
  ftsQuery: string,
  limit: number,
): Promise<MapSearchResult[]> {
  const rows = await query<MonsterSearchRow>(
    `
    SELECT
      m.id,
      m.name,
      m.is_boss,
      m.is_elite,
      ms.position_x,
      ms.position_y,
      ms.zone_id,
      z.name as zone_name,
      COALESCE(ms.level, m.level) as level
    FROM monsters_fts mf
    JOIN monsters m ON mf.rowid = m.rowid
    LEFT JOIN monster_spawns ms ON ms.monster_id = m.id
      AND ms.position_x IS NOT NULL
      AND ms.spawn_type = 'regular'
    LEFT JOIN zones z ON z.id = ms.zone_id
    WHERE mf.name MATCH ?
    GROUP BY m.id
    ORDER BY rank
    LIMIT ?
  `,
    [ftsQuery, limit],
  );

  return rows.map((r) => {
    const inExcludedZone = r.zone_id && EXCLUDED_ZONE_IDS.has(r.zone_id);
    return {
      id: r.id,
      name: r.name,
      category: "monster" as const,
      subcategory: r.is_boss ? "boss" : r.is_elite ? "elite" : undefined,
      position:
        r.position_x !== null && !inExcludedZone
          ? ([r.position_x, -r.position_y!] as [number, number])
          : null,
      zoneId: r.zone_id ?? undefined,
      zoneName: r.zone_name ?? undefined,
      level: r.level,
    };
  });
}

interface NpcSearchRow {
  id: string;
  name: string;
  roles: string | null;
  position_x: number | null;
  position_y: number | null;
  zone_id: string | null;
  zone_name: string | null;
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
      ns.position_x,
      ns.position_y,
      ns.zone_id,
      z.name as zone_name
    FROM npcs_fts nf
    JOIN npcs n ON nf.rowid = n.rowid
    LEFT JOIN npc_spawns ns ON ns.npc_id = n.id
      AND ns.position_x IS NOT NULL
    LEFT JOIN zones z ON z.id = ns.zone_id
    WHERE nf.name MATCH ?
    GROUP BY n.id
    ORDER BY rank
    LIMIT ?
  `,
    [ftsQuery, limit],
  );

  return rows.map((r) => {
    const inExcludedZone = r.zone_id && EXCLUDED_ZONE_IDS.has(r.zone_id);
    const roles = r.roles ? JSON.parse(r.roles) : {};
    let subcategory: string | undefined;
    if (roles.isVendor) subcategory = "vendor";
    else if (roles.isQuestGiver) subcategory = "quest";

    return {
      id: r.id,
      name: r.name,
      category: "npc" as const,
      subcategory,
      position:
        r.position_x !== null && !inExcludedZone
          ? ([r.position_x, -r.position_y!] as [number, number])
          : null,
      zoneId: r.zone_id ?? undefined,
      zoneName: r.zone_name ?? undefined,
    };
  });
}

interface ZoneSearchRow {
  id: string;
  name: string;
}

async function searchZones(
  ftsQuery: string,
  limit: number,
): Promise<MapSearchResult[]> {
  const rows = await query<ZoneSearchRow>(
    `
    SELECT
      z.id,
      z.name
    FROM zones_fts zf
    JOIN zones z ON zf.rowid = z.rowid
    WHERE zf.name MATCH ?
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
      position: null, // Zones don't have a single position; fly-to handled separately
      zoneId: r.id,
      zoneName: r.name,
    }));
}

interface ResourceSearchRow {
  id: string;
  name: string;
  level: number;
  position_x: number | null;
  position_y: number | null;
  zone_id: string | null;
  zone_name: string | null;
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
      gs.position_x,
      gs.position_y,
      gs.zone_id,
      z.name as zone_name
    FROM gathering_resources_fts grf
    JOIN gathering_resources gr ON grf.rowid = gr.rowid
    LEFT JOIN gathering_resource_spawns gs ON gs.resource_id = gr.id
      AND gs.position_x IS NOT NULL
    LEFT JOIN zones z ON z.id = gs.zone_id
    WHERE grf.name MATCH ?
    GROUP BY gr.id
    ORDER BY rank
    LIMIT ?
  `,
    [ftsQuery, limit],
  );

  return rows.map((r) => {
    const inExcludedZone = r.zone_id && EXCLUDED_ZONE_IDS.has(r.zone_id);
    return {
      id: r.id,
      name: r.name,
      category: "resource" as const,
      position:
        r.position_x !== null && !inExcludedZone
          ? ([r.position_x, -r.position_y!] as [number, number])
          : null,
      zoneId: r.zone_id ?? undefined,
      zoneName: r.zone_name ?? undefined,
      level: r.level,
    };
  });
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
    ORDER BY rank
    LIMIT ?
  `,
    [ftsQuery, limit],
  );

  return rows.map((r) => {
    const inExcludedZone = r.zone_id && EXCLUDED_ZONE_IDS.has(r.zone_id);
    return {
      id: r.id,
      name: r.name,
      category: "chest" as const,
      position:
        r.position_x !== null && !inExcludedZone
          ? ([r.position_x, -r.position_y!] as [number, number])
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
    ORDER BY rank
    LIMIT ?
  `,
    [ftsQuery, limit],
  );

  return rows.map((r) => {
    const inExcludedZone = r.zone_id && EXCLUDED_ZONE_IDS.has(r.zone_id);
    return {
      id: r.id,
      name: r.name,
      category: "altar" as const,
      subcategory: r.type,
      position:
        r.position_x !== null && !inExcludedZone
          ? ([r.position_x, -r.position_y!] as [number, number])
          : null,
      zoneId: r.zone_id ?? undefined,
      zoneName: r.zone_name ?? undefined,
      level: r.min_level_required,
    };
  });
}

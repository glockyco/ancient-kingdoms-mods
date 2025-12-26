import { query } from "$lib/db";
import {
  EXCLUDED_ZONE_IDS,
  WORLD_BOSS_DUNGEON_ID,
} from "$lib/constants/constants";

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
  | "altar"
  | "crafting"
  | "portal"
  | "item"
  | "quest";

/**
 * Display order for search result categories.
 * Used for both round-robin result distribution and UI grouping.
 */
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
  "portal",
];

export interface MapSearchResult {
  id: string;
  name: string;
  category: MapSearchCategory;
  subcategory?: string;
  /** Bounding box containing all spawn locations (null if no mappable location) */
  bounds: MapSearchBounds | null;
  zoneId?: string;
  zoneName?: string;
  level?: number;
  /** Number of spawn locations on the map (for entities with multiple spawns) */
  spawnCount?: number;
  /** Keywords matched (for displaying type badges) */
  keywords?: string;
  /** NPC roles (only for category="npc") */
  roles?: Record<string, boolean>;
  /** Dungeon name that this renewal sage resets (only for renewal sage NPCs) */
  renewalDungeonName?: string;
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

  // Wrap in double quotes to escape FTS5 special characters (apostrophes, etc.)
  // and add * for prefix matching
  const escaped = searchQuery.trim().replace(/"/g, '""');
  const ftsQuery = `"${escaped}"*`;

  // Fetch up to limit from each category to allow redistribution
  const [
    monsters,
    npcs,
    zones,
    resources,
    chests,
    altars,
    crafting,
    portals,
    items,
    quests,
  ] = await Promise.all([
    searchMonsters(ftsQuery, limit),
    searchNpcs(ftsQuery, limit),
    searchZones(ftsQuery, limit),
    searchGatheringResources(ftsQuery, limit),
    searchChests(ftsQuery, limit),
    searchAltars(ftsQuery, limit),
    searchCraftingStations(ftsQuery, limit),
    searchPortals(ftsQuery, limit),
    searchItems(ftsQuery, limit),
    searchQuests(ftsQuery, limit),
  ]);

  // Round-robin distribution: take 1 from each category per round
  // This ensures even distribution across all categories with results
  // Order defined by SEARCH_CATEGORY_ORDER
  const resultsByCategory: Record<MapSearchCategory, MapSearchResult[]> = {
    monster: monsters,
    npc: npcs,
    zone: zones,
    resource: resources,
    chest: chests,
    altar: altars,
    crafting: crafting,
    portal: portals,
    item: items,
    quest: quests,
  };
  const categories = SEARCH_CATEGORY_ORDER.map((cat) => resultsByCategory[cat]);
  const results: MapSearchResult[] = [];
  const taken = categories.map(() => 0);

  while (results.length < limit) {
    let addedThisRound = false;

    for (let i = 0; i < categories.length; i++) {
      if (results.length >= limit) break;
      if (taken[i] < categories[i].length) {
        results.push(categories[i][taken[i]]);
        taken[i]++;
        addedThisRound = true;
      }
    }

    if (!addedThisRound) break;
  }

  return results;
}

interface MonsterSearchRow {
  id: string;
  name: string;
  is_boss: number;
  is_elite: number;
  is_hunt: number;
  keywords: string | null;
  min_x: number | null;
  max_x: number | null;
  min_y: number | null;
  max_y: number | null;
  zone_id: string | null;
  zone_name: string | null;
  level: number;
  spawn_count: number;
  is_altar_only: number;
  altar_id: string | null;
  altar_x: number | null;
  altar_y: number | null;
}

async function searchMonsters(
  ftsQuery: string,
  limit: number,
): Promise<MapSearchResult[]> {
  // Query handles all spawn types (regular, summon, placeholder, altar)
  // Altar-only monsters redirect selection to the altar marker
  const rows = await query<MonsterSearchRow>(
    `
    SELECT
      m.id,
      m.name,
      m.is_boss,
      m.is_elite,
      m.is_hunt,
      m.keywords,
      -- Spawn positions (all spawn types have their own positions)
      MIN(ms.position_x) as min_x,
      MAX(ms.position_x) as max_x,
      MIN(ms.position_y) as min_y,
      MAX(ms.position_y) as max_y,
      COALESCE(ms.zone_id, a.zone_id) as zone_id,
      COALESCE(z.name, az.name) as zone_name,
      COALESCE(ms.level, m.level) as level,
      COUNT(ms.id) as spawn_count,
      -- Check if monster only appears in altars (no regular/summon/placeholder spawns)
      CASE
        WHEN SUM(CASE WHEN ms.spawn_type IN ('regular', 'summon', 'placeholder') THEN 1 ELSE 0 END) > 0
          THEN 0
        WHEN SUM(CASE WHEN ms.spawn_type = 'altar' THEN 1 ELSE 0 END) > 0
          THEN 1
        ELSE 0
      END as is_altar_only,
      MAX(CASE WHEN ms.spawn_type = 'altar' THEN ms.source_altar_id END) as altar_id,
      -- Altar position for fly-to (used when is_altar_only = 1)
      MAX(a.position_x) as altar_x,
      MAX(a.position_y) as altar_y
    FROM monsters_fts mf
    JOIN monsters m ON mf.rowid = m.rowid
    LEFT JOIN monster_spawns ms ON ms.monster_id = m.id
    LEFT JOIN altars a ON a.id = ms.source_altar_id
    LEFT JOIN zones az ON az.id = a.zone_id
    LEFT JOIN zones z ON z.id = ms.zone_id
    WHERE monsters_fts MATCH ?
    GROUP BY m.id
    ORDER BY rank
    LIMIT ?
  `,
    [ftsQuery, limit],
  );

  return rows.map((r) => {
    // For altar-only monsters, use altar position for bounds (fly-to target)
    // This centers the view on the altar marker, not the spawn positions
    const isAltarOnly = Boolean(r.is_altar_only) && r.altar_x !== null;
    const boundsX = isAltarOnly ? r.altar_x! : r.min_x;
    const boundsY = isAltarOnly ? r.altar_y! : r.min_y;

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
              minX: isAltarOnly ? boundsX : r.min_x!,
              maxX: isAltarOnly ? boundsX : r.max_x!,
              minY: isAltarOnly ? -boundsY! : -r.max_y!,
              maxY: isAltarOnly ? -boundsY! : -r.min_y!,
            }
          : null,
      zoneId: r.zone_id ?? undefined,
      zoneName: r.zone_name ?? undefined,
      level: r.level,
      spawnCount: r.spawn_count > 1 ? r.spawn_count : undefined,
      keywords: r.keywords ?? undefined,
    };
  });
}

interface NpcSearchRow {
  id: string;
  name: string;
  roles: string | null;
  keywords: string | null;
  min_x: number | null;
  max_x: number | null;
  min_y: number | null;
  max_y: number | null;
  zone_id: string | null;
  zone_name: string | null;
  spawn_count: number;
  renewal_dungeon_name: string | null;
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
      n.keywords,
      MIN(ns.position_x) as min_x,
      MAX(ns.position_x) as max_x,
      MIN(ns.position_y) as min_y,
      MAX(ns.position_y) as max_y,
      ns.zone_id,
      z.name as zone_name,
      COUNT(ns.id) as spawn_count,
      CASE
        WHEN n.respawn_dungeon_id = ${WORLD_BOSS_DUNGEON_ID} THEN 'World Bosses'
        ELSE rz.name
      END as renewal_dungeon_name
    FROM npcs_fts nf
    JOIN npcs n ON nf.rowid = n.rowid
    LEFT JOIN npc_spawns ns ON ns.npc_id = n.id
      AND ns.position_x IS NOT NULL
    LEFT JOIN zones z ON z.id = ns.zone_id
    LEFT JOIN zones rz ON rz.zone_id = n.respawn_dungeon_id
    WHERE npcs_fts MATCH ?
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
      keywords: r.keywords ?? undefined,
      roles: r.roles ? roles : undefined,
      renewalDungeonName: r.renewal_dungeon_name ?? undefined,
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
  keywords: string | null;
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
      gr.keywords,
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
    LEFT JOIN zones z ON z.id = gs.zone_id
    WHERE gathering_resources_fts MATCH ?
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
    keywords: r.keywords ?? undefined,
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
    ORDER BY rank
    LIMIT ?
  `,
    [ftsQuery, limit],
  );

  return rows.map((r) => {
    const y = r.position_y !== null ? -r.position_y : null;
    return {
      id: r.id,
      name: "Chest",
      category: "chest" as const,
      bounds:
        r.position_x !== null && y !== null
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
    ORDER BY rank
    LIMIT ?
  `,
    [ftsQuery, limit],
  );

  return rows.map((r) => {
    const y = r.position_y !== null ? -r.position_y : null;
    return {
      id: r.id,
      name: r.name,
      category: "altar" as const,
      subcategory: r.type,
      bounds:
        r.position_x !== null && y !== null
          ? { minX: r.position_x, maxX: r.position_x, minY: y, maxY: y }
          : null,
      zoneId: r.zone_id ?? undefined,
      zoneName: r.zone_name ?? undefined,
      level: r.min_level_required,
    };
  });
}

interface CraftingStationSearchRow {
  id: string;
  name: string;
  keywords: string | null;
  is_cooking_oven: number;
  position_x: number | null;
  position_y: number | null;
  zone_id: string | null;
  zone_name: string | null;
}

async function searchCraftingStations(
  ftsQuery: string,
  limit: number,
): Promise<MapSearchResult[]> {
  // Search both crafting_stations and alchemy_tables
  const [craftingRows, alchemyRows] = await Promise.all([
    query<CraftingStationSearchRow>(
      `
      SELECT
        cs.id,
        cs.name,
        cs.keywords,
        cs.is_cooking_oven,
        cs.position_x,
        cs.position_y,
        cs.zone_id,
        cs.zone_name
      FROM crafting_stations_fts csf
      JOIN crafting_stations cs ON csf.rowid = cs.rowid
      WHERE crafting_stations_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `,
      [ftsQuery, limit],
    ),
    query<CraftingStationSearchRow>(
      `
      SELECT
        at.id,
        at.name,
        at.keywords,
        0 as is_cooking_oven,
        at.position_x,
        at.position_y,
        at.zone_id,
        at.zone_name
      FROM alchemy_tables_fts atf
      JOIN alchemy_tables at ON atf.rowid = at.rowid
      WHERE alchemy_tables_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `,
      [ftsQuery, limit],
    ),
  ]);

  const allRows = [...craftingRows, ...alchemyRows].slice(0, limit);

  return allRows.map((r) => {
    const y = r.position_y !== null ? -r.position_y : null;
    const subcategory = r.keywords?.includes("alchemy")
      ? "alchemy"
      : r.is_cooking_oven
        ? "cooking"
        : "forge";

    return {
      id: r.id,
      name: r.name,
      category: "crafting" as const,
      subcategory,
      bounds:
        r.position_x !== null && y !== null
          ? { minX: r.position_x, maxX: r.position_x, minY: y, maxY: y }
          : null,
      zoneId: r.zone_id ?? undefined,
      zoneName: r.zone_name ?? undefined,
      keywords: r.keywords ?? undefined,
    };
  });
}

interface PortalSearchRow {
  id: string;
  keywords: string | null;
  position_x: number | null;
  position_y: number | null;
  from_zone_id: string | null;
  from_zone_name: string | null;
  to_zone_id: string | null;
  to_zone_name: string | null;
  is_closed: number;
}

async function searchPortals(
  ftsQuery: string,
  limit: number,
): Promise<MapSearchResult[]> {
  const rows = await query<PortalSearchRow>(
    `
    SELECT
      p.id,
      p.keywords,
      p.position_x,
      p.position_y,
      p.from_zone_id,
      fz.name as from_zone_name,
      p.to_zone_id,
      tz.name as to_zone_name,
      p.is_closed
    FROM portals_fts pf
    JOIN portals p ON pf.rowid = p.rowid
    LEFT JOIN zones fz ON fz.id = p.from_zone_id
    LEFT JOIN zones tz ON tz.id = p.to_zone_id
    WHERE portals_fts MATCH ?
      AND p.is_template = 0
    ORDER BY rank
    LIMIT ?
  `,
    [ftsQuery, limit],
  );

  return rows.map((r) => {
    const y = r.position_y !== null ? -r.position_y : null;
    const isClosed = Boolean(r.is_closed);
    const name = isClosed
      ? "Closed Portal"
      : r.to_zone_name
        ? `Portal to ${r.to_zone_name}`
        : "Portal";

    return {
      id: r.id,
      name,
      category: "portal" as const,
      bounds:
        r.position_x !== null && y !== null
          ? { minX: r.position_x, maxX: r.position_x, minY: y, maxY: y }
          : null,
      zoneId: r.from_zone_id ?? undefined,
      zoneName: r.from_zone_name ?? undefined,
      keywords: r.keywords ?? undefined,
    };
  });
}

interface ItemSearchRow {
  id: string;
  name: string;
  quality: number;
  level_required: number;
  min_x: number | null;
  max_x: number | null;
  min_y: number | null;
  max_y: number | null;
}

async function searchItems(
  ftsQuery: string,
  limit: number,
): Promise<MapSearchResult[]> {
  // Search items that have monster droppers
  // Bounds come from dropper monster positions
  // Use subquery to expand monster drops JSON, then join with items
  const rows = await query<ItemSearchRow>(
    `
    SELECT
      i.id,
      i.name,
      i.quality,
      i.level_required,
      MIN(ms.position_x) as min_x,
      MAX(ms.position_x) as max_x,
      MIN(ms.position_y) as min_y,
      MAX(ms.position_y) as max_y
    FROM items_fts itf
    JOIN items i ON itf.rowid = i.rowid
    LEFT JOIN (
      SELECT m.id as monster_id, json_extract(d.value, '$.item_id') as item_id
      FROM monsters m, json_each(m.drops) d
    ) md ON md.item_id = i.id
    LEFT JOIN monster_spawns ms ON ms.monster_id = md.monster_id
      AND ms.spawn_type IN ('regular', 'summon', 'placeholder')
    WHERE items_fts MATCH ?
    GROUP BY i.id
    ORDER BY rank
    LIMIT ?
  `,
    [ftsQuery, limit],
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: "item" as const,
    subcategory: String(r.quality), // Quality as subcategory for coloring
    bounds:
      r.min_x !== null
        ? {
            minX: r.min_x,
            maxX: r.max_x!,
            minY: -r.max_y!,
            maxY: -r.min_y!,
          }
        : null,
    level: r.level_required > 0 ? r.level_required : undefined,
  }));
}

interface QuestSearchRow {
  id: string;
  name: string;
  level_recommended: number;
  display_type: string;
  min_x: number | null;
  max_x: number | null;
  min_y: number | null;
  max_y: number | null;
}

async function searchQuests(
  ftsQuery: string,
  limit: number,
): Promise<MapSearchResult[]> {
  // Search quests and get bounds from associated NPC positions
  // Quest-NPC relationships are in npcs.quests_offered and npcs.quests_completed_here JSON
  const rows = await query<QuestSearchRow>(
    `
    SELECT
      q.id,
      q.name,
      q.level_recommended,
      q.display_type,
      MIN(ns.position_x) as min_x,
      MAX(ns.position_x) as max_x,
      MIN(ns.position_y) as min_y,
      MAX(ns.position_y) as max_y
    FROM quests_fts qf
    JOIN quests q ON qf.rowid = q.rowid
    LEFT JOIN (
      SELECT n.id as npc_id, json_extract(qo.value, '$.id') as quest_id
      FROM npcs n, json_each(n.quests_offered) qo
      UNION
      SELECT n.id as npc_id, json_extract(qc.value, '$.id') as quest_id
      FROM npcs n, json_each(n.quests_completed_here) qc
    ) nq ON nq.quest_id = q.id
    LEFT JOIN npc_spawns ns ON ns.npc_id = nq.npc_id
      AND ns.position_x IS NOT NULL
    WHERE quests_fts MATCH ?
    GROUP BY q.id
    ORDER BY rank
    LIMIT ?
  `,
    [ftsQuery, limit],
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: "quest" as const,
    subcategory: r.display_type,
    bounds:
      r.min_x !== null
        ? {
            minX: r.min_x,
            maxX: r.max_x!,
            minY: -r.max_y!,
            maxY: -r.min_y!,
          }
        : null,
    level: r.level_recommended,
  }));
}

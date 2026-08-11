import { query } from "$lib/db";
import { WORLD_BOSS_DUNGEON_ID } from "$lib/constants/constants";
import { TRAP_TYPE_LABELS, type TrapType } from "$lib/constants/traps";
import { searchEntities, type SearchResult } from "$lib/search/search";

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
  /** Entity registry family used for labels and glyphs. */
  entityType?: string;
  entityLabel?: string;
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
  is_altar_only?: number | null;
  altar_x?: number | null;
  altar_y?: number | null;
};

type MapEntityCategory = MapSearchCategory;

const ENTITY_CATEGORY: Partial<
  Record<SearchResult["entityType"], MapEntityCategory>
> = {
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
 * authoritative compendium. Search ranking stays in search.db; these rows
 * only restore the map result contract and physical source geometry.
 */
const GEOMETRY_QUERY: Partial<Record<SearchResult["entityType"], string>> = {
  monster: `
    SELECT m.id,
      MIN(ms.position_x) min_x, MAX(ms.position_x) max_x,
      MIN(ms.position_y) min_y, MAX(ms.position_y) max_y,
      COALESCE(ms.zone_id, a.zone_id) zone_id,
      COALESCE(z.name, az.name) zone_name,
      COALESCE(ms.level, m.level) level,
      COUNT(ms.id) spawn_count,
      CASE WHEN m.is_fabled THEN 'fabled'
           WHEN m.is_boss THEN 'boss'
           WHEN m.is_elite THEN 'elite'
           WHEN m.is_hunt THEN 'hunt' END subcategory,
      m.keywords,
      CASE
        WHEN SUM(CASE WHEN ms.spawn_type IN ('regular', 'summon', 'placeholder') THEN 1 ELSE 0 END) = 0
         AND SUM(CASE WHEN ms.spawn_type = 'altar' THEN 1 ELSE 0 END) > 0 THEN 1
        ELSE 0
      END is_altar_only,
      MAX(a.position_x) altar_x, MAX(a.position_y) altar_y,
      NULL quality, NULL roles, NULL renewal_dungeon_name, NULL display_name
    FROM monsters m
    LEFT JOIN monster_spawns ms ON ms.monster_id = m.id
    LEFT JOIN altars a ON a.id = ms.source_altar_id
    LEFT JOIN zones az ON az.id = a.zone_id
    LEFT JOIN zones z ON z.id = ms.zone_id
    WHERE m.id IN (/*IDS*/)
    GROUP BY m.id
  `,
  npc: `
    SELECT n.id,
      MIN(ns.position_x) min_x, MAX(ns.position_x) max_x,
      MIN(ns.position_y) min_y, MAX(ns.position_y) max_y,
      ns.zone_id, z.name zone_name, n.level, COUNT(ns.id) spawn_count,
      CASE WHEN json_extract(n.roles, '$.is_vendor') = 1
                  OR json_extract(n.roles, '$.isVendor') = 1 THEN 'vendor'
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
    LEFT JOIN (
      SELECT n.id npc_id, json_extract(qo.value, '$.id') quest_id
      FROM npcs n, json_each(n.quests_offered) qo
      UNION
      SELECT n.id npc_id, json_extract(qc.value, '$.id') quest_id
      FROM npcs n, json_each(n.quests_completed_here) qc
    ) nq ON nq.quest_id = q.id
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

function itemBoundsQuery(idsJson: string): Promise<GeometryRow[]> {
  return query<GeometryRow>(
    `
    SELECT item_id id, MIN(x) min_x, MAX(x) max_x, MIN(y) min_y, MAX(y) max_y,
      NULL zone_id, NULL zone_name, NULL level, COUNT(*) spawn_count,
      NULL subcategory, NULL keywords, NULL roles, NULL renewal_dungeon_name,
      NULL quality, NULL display_name
    FROM (
      SELECT json_extract(d.value, '$.item_id') item_id, ms.position_x x, ms.position_y y
      FROM monsters m, json_each(m.drops) d
      JOIN monster_spawns ms ON ms.monster_id = m.id
        AND ms.spawn_type IN ('regular', 'summon', 'placeholder') AND ms.position_x IS NOT NULL
      WHERE json_extract(d.value, '$.item_id') IN (SELECT value FROM json_each(?))
      UNION ALL
      SELECT isv.item_id, ns.position_x, ns.position_y
      FROM item_sources_vendor isv
      JOIN npc_spawns ns ON ns.npc_id = isv.npc_id AND ns.position_x IS NOT NULL
      WHERE isv.item_id IN (SELECT value FROM json_each(?))
      UNION ALL
      SELECT isg.item_id, gs.position_x, gs.position_y
      FROM item_sources_gather isg
      JOIN gathering_resource_spawns gs ON gs.resource_id = isg.resource_id AND gs.position_x IS NOT NULL
      WHERE isg.item_id IN (SELECT value FROM json_each(?))
      UNION ALL
      SELECT f.item_id, gs.position_x, gs.position_y
      FROM fish f
      JOIN items i ON i.id = f.item_id
      JOIN gathering_resources gr ON gr.is_fishing_spot = 1
      JOIN gathering_resource_spawns gs ON gs.resource_id = gr.id AND gs.position_x IS NOT NULL
      WHERE f.item_id IN (SELECT value FROM json_each(?))
        AND (f.is_trash = 1 OR gr.level > COALESCE(i.quality, -1))
        AND NOT EXISTS (
          SELECT 1 FROM item_sources_gather existing
          WHERE existing.item_id = f.item_id AND existing.resource_id = gr.id
        )
      UNION ALL
      SELECT isc.item_id, c.position_x, c.position_y
      FROM item_sources_chest isc
      JOIN chests c ON c.id = isc.chest_id AND c.position_x IS NOT NULL
      WHERE isc.item_id IN (SELECT value FROM json_each(?))
      UNION ALL
      SELECT reward.item_id, a.position_x, a.position_y
      FROM (
        SELECT reward_common_id item_id, id altar_id FROM altars WHERE reward_common_id IS NOT NULL
        UNION ALL SELECT reward_magic_id, id FROM altars WHERE reward_magic_id IS NOT NULL
        UNION ALL SELECT reward_epic_id, id FROM altars WHERE reward_epic_id IS NOT NULL
        UNION ALL SELECT reward_legendary_id, id FROM altars WHERE reward_legendary_id IS NOT NULL
      ) reward JOIN altars a ON a.id = reward.altar_id AND a.position_x IS NOT NULL
      WHERE reward.item_id IN (SELECT value FROM json_each(?))
      UNION ALL
      SELECT tl.required_map_id, tl.position_x, tl.position_y
      FROM treasure_locations tl
      WHERE tl.required_map_id IN (SELECT value FROM json_each(?)) AND tl.position_x IS NOT NULL
      UNION ALL
      SELECT tl.reward_id, tl.position_x, tl.position_y
      FROM treasure_locations tl
      WHERE tl.reward_id IN (SELECT value FROM json_each(?)) AND tl.position_x IS NOT NULL
    )
    GROUP BY item_id
  `,
    Array.from({ length: 8 }, () => idsJson),
  );
}

async function itemRows(
  matches: SearchResult[],
): Promise<Map<string, GeometryRow>> {
  const ids = matches.map((match) => match.entityId);
  const placeholders = ids.map(() => "?").join(",");
  const basics = await query<{
    id: string;
    quality: number | null;
    level: number | null;
  }>(
    `SELECT id, quality, level_required level FROM items WHERE id IN (${placeholders})`,
    ids,
  );
  const bounds = await itemBoundsQuery(JSON.stringify(ids));
  const result = new Map<string, GeometryRow>();
  for (const row of basics) {
    const source = bounds.find((candidate) => candidate.id === row.id);
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

function toMapSearchResult(
  match: SearchResult,
  row: GeometryRow | undefined,
): MapSearchResult {
  const category = ENTITY_CATEGORY[match.entityType]!;
  const isAltarOnly =
    Boolean(row?.is_altar_only) && row?.altar_x != null && row.altar_y != null;
  const bounds = isAltarOnly
    ? {
        minX: row!.altar_x!,
        maxX: row!.altar_x!,
        minY: -row!.altar_y!,
        maxY: -row!.altar_y!,
      }
    : row?.min_x != null &&
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
    id: match.entityId,
    name: displayName,
    category,
    entityType: match.entityType,
    entityLabel: match.entity.pluralLabel,
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
  const matches = await searchEntities(searchQuery, Math.max(limit * 10, 100));
  const mapMatches = matches.filter((match) =>
    Boolean(ENTITY_CATEGORY[match.entityType]),
  );
  if (mapMatches.length === 0) return [];

  const grouped = new Map<string, SearchResult[]>();
  for (const match of mapMatches) {
    const group = grouped.get(match.entityType) ?? [];
    group.push(match);
    grouped.set(match.entityType, group);
  }

  const geometry = new Map<string, GeometryRow>();
  await Promise.all(
    [...grouped.entries()].map(async ([entityType, categoryMatches]) => {
      if (entityType === "item") {
        for (const [id, row] of await itemRows(categoryMatches))
          geometry.set(`${entityType}:${id}`, row);
        return;
      }
      const queryText =
        GEOMETRY_QUERY[entityType as SearchResult["entityType"]];
      if (!queryText) return;
      const ids = categoryMatches.map((match) => match.entityId);
      const rows = await query<GeometryRow>(
        queryText.replaceAll("/*IDS*/", ids.map(() => "?").join(",")),
        ids,
      );
      for (const row of rows) geometry.set(`${entityType}:${row.id}`, row);
    }),
  );

  return mapMatches
    .slice(0, limit)
    .map((match) =>
      toMapSearchResult(
        match,
        geometry.get(`${match.entityType}:${match.entityId}`),
      ),
    );
}

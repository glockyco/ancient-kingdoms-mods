import { query } from "$lib/db";
import { EXCLUDED_ZONE_IDS } from "$lib/constants/exclusions";
import type {
  MapEntityData,
  MonsterMapEntity,
  NpcMapEntity,
  PortalMapEntity,
  ChestMapEntity,
  AltarMapEntity,
  GatheringMapEntity,
  CraftingMapEntity,
  ZoneBoundary,
  LevelRanges,
} from "$lib/types/map";

/**
 * Generate SQL placeholder string for excluded zones.
 * Returns empty string if no exclusions, otherwise " AND zone_id NOT IN (...)"
 */
function getZoneExclusionClause(zoneColumn = "zone_id"): string {
  if (EXCLUDED_ZONE_IDS.size === 0) return "";
  const placeholders = Array.from(EXCLUDED_ZONE_IDS)
    .map((id) => `'${id}'`)
    .join(", ");
  return ` AND ${zoneColumn} NOT IN (${placeholders})`;
}

/**
 * Compute level ranges from loaded entity data
 */
function computeLevelRanges(
  monsters: MonsterMapEntity[],
  gathering: GatheringMapEntity[],
): LevelRanges {
  const monsterLevels = monsters.map((m) => m.level);
  const gatheringLevels = gathering.map((g) => g.level);

  return {
    monsterMin: monsterLevels.length ? Math.min(...monsterLevels) : 1,
    monsterMax: monsterLevels.length ? Math.max(...monsterLevels) : 100,
    gatheringMin: gatheringLevels.length ? Math.min(...gatheringLevels) : 0,
    gatheringMax: gatheringLevels.length ? Math.max(...gatheringLevels) : 10,
  };
}

/**
 * Load all map entities in parallel
 */
export async function loadAllMapEntities(): Promise<MapEntityData> {
  const [
    monsters,
    npcs,
    portals,
    chests,
    altars,
    gathering,
    crafting,
    subZones,
  ] = await Promise.all([
    loadMonsterSpawns(),
    loadNpcSpawns(),
    loadPortals(),
    loadChests(),
    loadAltars(),
    loadGatheringSpawns(),
    loadCraftingStations(),
    loadZoneTriggers(),
  ]);

  const levelRanges = computeLevelRanges(monsters, gathering);

  return {
    monsters,
    npcs,
    portals,
    chests,
    altars,
    gathering,
    crafting,
    subZones,
    levelRanges,
  };
}

interface MonsterSpawnRow {
  id: string;
  monster_id: string;
  name: string;
  position_x: number;
  position_y: number;
  zone_id: string;
  zone_name: string;
  level: number;
  is_boss: number;
  is_elite: number;
}

async function loadMonsterSpawns(): Promise<MonsterMapEntity[]> {
  // Include both regular and summon spawns on the map
  // Altar and placeholder spawns are excluded (too many overlapping dots)
  const rows = await query<MonsterSpawnRow>(`
    SELECT
      ms.id,
      ms.monster_id,
      m.name,
      ms.position_x,
      ms.position_y,
      ms.zone_id,
      z.name as zone_name,
      COALESCE(ms.level, m.level) as level,
      m.is_boss,
      m.is_elite
    FROM monster_spawns ms
    JOIN monsters m ON m.id = ms.monster_id
    JOIN zones z ON z.id = ms.zone_id
    WHERE ms.position_x IS NOT NULL
      AND ms.position_y IS NOT NULL
      AND ms.spawn_type IN ('regular', 'summon')
      ${getZoneExclusionClause("ms.zone_id")}
  `);

  return rows.map((r) => ({
    id: r.monster_id,
    type: r.is_boss ? "boss" : r.is_elite ? "elite" : "monster",
    name: r.name,
    position: [r.position_x, -r.position_y] as [number, number],
    zoneId: r.zone_id,
    zoneName: r.zone_name,
    level: r.level,
    isBoss: Boolean(r.is_boss),
    isElite: Boolean(r.is_elite),
  }));
}

interface NpcSpawnRow {
  id: string;
  npc_id: string;
  name: string;
  position_x: number;
  position_y: number;
  zone_id: string;
  zone_name: string;
  roles: string | null;
}

async function loadNpcSpawns(): Promise<NpcMapEntity[]> {
  const rows = await query<NpcSpawnRow>(`
    SELECT
      ns.id,
      ns.npc_id,
      n.name,
      ns.position_x,
      ns.position_y,
      ns.zone_id,
      z.name as zone_name,
      n.roles
    FROM npc_spawns ns
    JOIN npcs n ON n.id = ns.npc_id
    JOIN zones z ON z.id = ns.zone_id
    WHERE ns.position_x IS NOT NULL
      AND ns.position_y IS NOT NULL
      ${getZoneExclusionClause("ns.zone_id")}
  `);

  return rows.map((r) => {
    const roles = r.roles ? JSON.parse(r.roles) : {};
    return {
      id: r.npc_id,
      type: "npc" as const,
      name: r.name,
      position: [r.position_x, -r.position_y] as [number, number],
      zoneId: r.zone_id,
      zoneName: r.zone_name,
      isVendor: Boolean(roles.isVendor),
      isQuestGiver: Boolean(roles.isQuestGiver),
    };
  });
}

interface PortalRow {
  id: string;
  position_x: number;
  position_y: number;
  from_zone_id: string;
  from_zone_name: string;
  destination_x: number | null;
  destination_y: number | null;
  to_zone_id: string | null;
  to_zone_name: string | null;
  is_closed: number;
}

async function loadPortals(): Promise<PortalMapEntity[]> {
  // Filter out portals FROM excluded zones, but keep portals TO excluded zones
  // (we'll null out their destination below)
  const rows = await query<PortalRow>(`
    SELECT
      p.id,
      p.position_x,
      p.position_y,
      p.from_zone_id,
      fz.name as from_zone_name,
      p.destination_x,
      p.destination_y,
      p.to_zone_id,
      tz.name as to_zone_name,
      p.is_closed
    FROM portals p
    JOIN zones fz ON fz.id = p.from_zone_id
    LEFT JOIN zones tz ON tz.id = p.to_zone_id
    WHERE p.position_x IS NOT NULL
      AND p.position_y IS NOT NULL
      AND p.is_template = 0
      ${getZoneExclusionClause("p.from_zone_id")}
  `);

  return rows.map((r) => {
    // If destination zone is excluded, hide destination coordinates (no arc/marker)
    // but keep the zone name so users know where it leads
    const destExcluded = r.to_zone_id && EXCLUDED_ZONE_IDS.has(r.to_zone_id);

    return {
      id: r.id,
      type: "portal" as const,
      name: r.to_zone_name ? `Portal to ${r.to_zone_name}` : "Portal",
      position: [r.position_x, -r.position_y] as [number, number],
      zoneId: r.from_zone_id,
      zoneName: r.from_zone_name,
      // Null out coordinates for excluded destinations (hides arc and destination marker)
      destination: destExcluded
        ? null
        : r.destination_x !== null && r.destination_y !== null
          ? ([r.destination_x, -r.destination_y] as [number, number])
          : null,
      destinationZoneId: r.to_zone_id,
      destinationZoneName: r.to_zone_name,
      isClosed: Boolean(r.is_closed),
    };
  });
}

interface ChestRow {
  id: string;
  name: string;
  position_x: number;
  position_y: number;
  zone_id: string;
  zone_name: string;
  key_required_id: string | null;
  key_required_name: string | null;
}

async function loadChests(): Promise<ChestMapEntity[]> {
  const rows = await query<ChestRow>(`
    SELECT
      c.id,
      c.name,
      c.position_x,
      c.position_y,
      c.zone_id,
      z.name as zone_name,
      c.key_required_id,
      i.name as key_required_name
    FROM chests c
    JOIN zones z ON z.id = c.zone_id
    LEFT JOIN items i ON i.id = c.key_required_id
    WHERE c.position_x IS NOT NULL
      AND c.position_y IS NOT NULL
      ${getZoneExclusionClause("c.zone_id")}
  `);

  return rows.map((r) => ({
    id: r.id,
    type: "chest" as const,
    name: r.name,
    position: [r.position_x, -r.position_y] as [number, number],
    zoneId: r.zone_id,
    zoneName: r.zone_name,
    keyRequiredId: r.key_required_id,
    keyRequiredName: r.key_required_name,
  }));
}

interface AltarRow {
  id: string;
  name: string;
  type: string;
  position_x: number;
  position_y: number;
  zone_id: string;
  zone_name: string;
  min_level_required: number;
}

async function loadAltars(): Promise<AltarMapEntity[]> {
  const rows = await query<AltarRow>(`
    SELECT
      a.id,
      a.name,
      a.type,
      a.position_x,
      a.position_y,
      a.zone_id,
      z.name as zone_name,
      a.min_level_required
    FROM altars a
    JOIN zones z ON z.id = a.zone_id
    WHERE a.position_x IS NOT NULL
      AND a.position_y IS NOT NULL
      ${getZoneExclusionClause("a.zone_id")}
  `);

  return rows.map((r) => ({
    id: r.id,
    type: "altar" as const,
    name: r.name,
    position: [r.position_x, -r.position_y] as [number, number],
    zoneId: r.zone_id,
    zoneName: r.zone_name,
    altarType: r.type as "forgotten" | "avatar",
    minLevel: r.min_level_required,
  }));
}

interface GatheringRow {
  id: string;
  name: string;
  position_x: number;
  position_y: number;
  zone_id: string;
  zone_name: string;
  level: number;
  is_plant: number;
  is_mineral: number;
  is_radiant_spark: number;
}

async function loadGatheringSpawns(): Promise<GatheringMapEntity[]> {
  const rows = await query<GatheringRow>(`
    SELECT
      gs.resource_id as id,
      gr.name,
      gs.position_x,
      gs.position_y,
      gs.zone_id,
      z.name as zone_name,
      gr.level,
      gr.is_plant,
      gr.is_mineral,
      gr.is_radiant_spark
    FROM gathering_resource_spawns gs
    JOIN gathering_resources gr ON gr.id = gs.resource_id
    JOIN zones z ON z.id = gs.zone_id
    WHERE gs.position_x IS NOT NULL
      AND gs.position_y IS NOT NULL
      ${getZoneExclusionClause("gs.zone_id")}
  `);

  return rows.map((r) => {
    let type: "gathering_plant" | "gathering_mineral" | "gathering_spark";
    if (r.is_plant) type = "gathering_plant";
    else if (r.is_mineral) type = "gathering_mineral";
    else type = "gathering_spark";

    return {
      id: r.id,
      type,
      name: r.name,
      position: [r.position_x, -r.position_y] as [number, number],
      zoneId: r.zone_id,
      zoneName: r.zone_name,
      resourceName: r.name,
      level: r.level,
    };
  });
}

interface CraftingRow {
  id: string;
  name: string;
  position_x: number;
  position_y: number;
  zone_id: string;
  zone_name: string;
  table_type: string;
}

async function loadCraftingStations(): Promise<CraftingMapEntity[]> {
  // Load both alchemy tables and crafting stations
  const alchemyRows = await query<CraftingRow>(`
    SELECT
      at.id,
      at.name,
      at.position_x,
      at.position_y,
      at.zone_id,
      z.name as zone_name,
      'alchemy_table' as table_type
    FROM alchemy_tables at
    JOIN zones z ON z.id = at.zone_id
    WHERE at.position_x IS NOT NULL
      AND at.position_y IS NOT NULL
      ${getZoneExclusionClause("at.zone_id")}
  `);

  const craftingRows = await query<CraftingRow>(`
    SELECT
      cs.id,
      cs.name,
      cs.position_x,
      cs.position_y,
      cs.zone_id,
      z.name as zone_name,
      'crafting_station' as table_type
    FROM crafting_stations cs
    JOIN zones z ON z.id = cs.zone_id
    WHERE cs.position_x IS NOT NULL
      AND cs.position_y IS NOT NULL
      ${getZoneExclusionClause("cs.zone_id")}
  `);

  return [...alchemyRows, ...craftingRows].map((r) => ({
    id: r.id,
    type: r.table_type as "alchemy_table" | "crafting_station",
    name: r.name,
    position: [r.position_x, -r.position_y] as [number, number],
    zoneId: r.zone_id,
    zoneName: r.zone_name,
  }));
}

interface ZoneTriggerRow {
  id: string;
  name: string;
  zone_id: string;
  zone_name: string;
  bounds_min_x: number;
  bounds_min_y: number;
  bounds_max_x: number;
  bounds_max_y: number;
}

async function loadZoneTriggers(): Promise<ZoneBoundary[]> {
  const rows = await query<ZoneTriggerRow>(`
    SELECT
      zt.id,
      zt.name,
      zt.zone_id,
      z.name as zone_name,
      zt.bounds_min_x,
      zt.bounds_min_y,
      zt.bounds_max_x,
      zt.bounds_max_y
    FROM zone_triggers zt
    JOIN zones z ON z.zone_id = zt.zone_id
    WHERE zt.bounds_min_x IS NOT NULL
      AND zt.bounds_min_y IS NOT NULL
      AND zt.bounds_max_x IS NOT NULL
      AND zt.bounds_max_y IS NOT NULL
      ${getZoneExclusionClause("z.id")}
  `);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    zoneId: r.zone_id,
    zoneName: r.zone_name,
    // Convert bounds to polygon (Y negated for display)
    polygon: [
      [r.bounds_min_x, -r.bounds_max_y],
      [r.bounds_max_x, -r.bounds_max_y],
      [r.bounds_max_x, -r.bounds_min_y],
      [r.bounds_min_x, -r.bounds_min_y],
    ] as [number, number][],
  }));
}

/**
 * Server-side map queries using better-sqlite3 for prerendering.
 * Acquisition-backed counts are assembled before serializing the map entities.
 */
import Database from "better-sqlite3";
import { resolve } from "path";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import { WORLD_BOSS_DUNGEON_ID } from "$lib/constants/constants";
import type { Season } from "$lib/data/seasonal-events";
import type {
  MapEntityData,
  MonsterMapEntity,
  NpcMapEntity,
  PortalMapEntity,
  ChestMapEntity,
  TreasureMapEntity,
  AltarMapEntity,
  TrapMapEntity,
  GatheringMapEntity,
  CraftingMapEntity,
  HouseMapEntity,
  ZoneBoundary,
  ParentZoneBoundary,
  LevelRanges,
  ZoneListItem,
} from "$lib/types/map";
import { parseTrapAreaRings } from "$lib/utils/trapArea";
import { loadAcquisition } from "$lib/server/acquisition";
import type {
  AcquisitionModel,
  AcquisitionQuery,
  MethodView,
  ProviderRef,
} from "$lib/acquisition/types";
import {
  projectMethodSeasons,
  projectProviderMethods,
} from "$lib/acquisition/projections";

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
 * Load all map entities for prerendering
 */
export async function loadAllMapEntitiesServer(): Promise<MapEntityData> {
  const db = new Database(resolve(DB_SOURCE_PATH), { readonly: true });

  try {
    const monsters = loadMonsterSpawnsServer(db);
    const npcs = loadNpcSpawnsServer(db);
    const portals = loadPortalsServer(db);
    const chests = loadChestsServer(db);
    const treasure = loadTreasureServer(db);
    const altars = loadAltarsServer(db);
    const traps = loadTrapsServer(db);
    const gathering = loadGatheringSpawnsServer(db);
    const crafting = loadCraftingStationsServer(db);
    const houses = loadHousesServer(db);
    const subZones = loadZoneTriggersServer(db);
    const parentZones = loadZoneBoundsServer(db);
    const execute: AcquisitionQuery = async (sql, params) =>
      db.prepare(sql).all(...params) as Record<string, unknown>[];
    const providers = db
      .prepare(
        `
      SELECT 'monster_spawns' AS kind, id FROM monster_spawns
      UNION ALL SELECT 'resource_spawns', id FROM gathering_resource_spawns
      UNION ALL SELECT 'chests', id FROM chests
      UNION ALL SELECT 'altars', id FROM altars
      UNION ALL SELECT 'npcs', id FROM npcs
    `,
      )
      .all() as ProviderRef[];
    const model = await loadAcquisition(execute, {
      kind: "providers",
      providers,
    });
    applyAcquisitionCounts(model, monsters, gathering, chests);
    appendEventMonsterMarkers(model, monsters);
    for (const npc of npcs) {
      const methods = projectProviderMethods(model, {
        kind: "npcs",
        id: npc.id,
      });
      npc.itemsSoldCount = new Set(
        methods
          .filter(
            (method) =>
              method.kind === "vendor" &&
              !method.costGroups.some((group) =>
                group.inputs.some((input) => input.withheld),
              ),
          )
          .map((method) => {
            const inputs = method.costGroups.flatMap((group) => group.inputs);
            const cost =
              inputs.find((input) => input.resource_kind === "item") ??
              inputs.find((input) => input.resource_kind === "gold");
            return JSON.stringify([
              method.detail.offered_item_id,
              cost?.amount ?? 0,
              cost?.item_id ?? null,
              projectMethodSeasons(model, method),
            ]);
          }),
      ).size;
    }

    const levelRanges = computeLevelRanges(monsters, gathering);

    return {
      monsters,
      npcs,
      portals,
      chests,
      treasure,
      altars,
      traps,
      gathering,
      crafting,
      houses,
      subZones,
      parentZones,
      levelRanges,
    };
  } finally {
    db.close();
  }
}

function methodDropCounts(
  model: AcquisitionModel,
  methods: readonly MethodView[],
) {
  const items = new Set<string>();
  const randomItems = new Set<string>();
  for (const method of methods) {
    const fixed = new Set<string>();
    for (const output of method.outputs) {
      if (output.withheld || output.resource_kind !== "item" || !output.item_id)
        continue;
      items.add(output.item_id);
      if (output.yield_rule === "pool") randomItems.add(output.item_id);
      else fixed.add(output.item_id);
    }
    for (const result of method.probabilityResults) {
      if (result.target.kind !== "item") continue;
      items.add(result.target.itemId);
      if (!fixed.has(result.target.itemId))
        randomItems.add(result.target.itemId);
    }
  }
  return {
    dropCount: items.size,
    bestiaryDropCount: [...items].filter((id) =>
      Boolean(model.entities.get("items")?.get(id)?.is_bestiary_drop),
    ).length,
    randomDropCount: randomItems.size,
  };
}

function applyAcquisitionCounts(
  model: AcquisitionModel,
  monsters: MonsterMapEntity[],
  gathering: GatheringMapEntity[],
  chests: ChestMapEntity[],
): void {
  const byProvider = new Map<string, MethodView[]>();
  for (const method of model.methodViews.values()) {
    if (!method.rooted) continue;
    if (method.kind === "kill" && method.detail.event_kind !== "authored")
      continue;
    for (const provider of method.providers) {
      const key = `${provider.ref.kind}:${provider.ref.id}`;
      const methods = byProvider.get(key) ?? [];
      methods.push(method);
      byProvider.set(key, methods);
    }
  }
  for (const monster of monsters) {
    const counts = methodDropCounts(
      model,
      byProvider.get(`monster_spawns:${monster.id}`) ?? [],
    );
    monster.dropCount = counts.dropCount;
    monster.bestiaryDropCount = counts.bestiaryDropCount;
  }
  for (const resource of gathering) {
    resource.dropCount = methodDropCounts(
      model,
      byProvider.get(`resource_spawns:${resource.id}`) ?? [],
    ).dropCount;
  }
  for (const chest of chests) {
    const methods = (byProvider.get(`chests:${chest.id}`) ?? []).filter(
      (method) => method.kind === "world_chest",
    );
    const counts = methodDropCounts(model, methods);
    chest.dropCount = counts.dropCount;
    chest.randomDropCount = counts.randomDropCount;
    const keyMethod = methods.find(
      (method) => method.detail.key_item_id || method.detail.key_item_withheld,
    );
    const keyId = keyMethod?.detail.key_item_id;
    chest.keyRequiredId = typeof keyId === "string" ? keyId : null;
    chest.keyRequiredName =
      typeof keyId === "string"
        ? String(model.entities.get("items")?.get(keyId)?.name)
        : null;
  }
}

function appendEventMonsterMarkers(
  model: AcquisitionModel,
  monsters: MonsterMapEntity[],
): void {
  const definitions = new Map(
    monsters.map((monster) => [monster.monsterId, monster]),
  );
  const placements = new Map(monsters.map((monster) => [monster.id, monster]));
  const altarMethods = new Map<string, MethodView[]>();
  for (const method of model.methodViews.values()) {
    if (method.kind !== "kill" || !method.rooted) continue;
    const event = method.detail.event_kind;
    if (
      typeof method.detail.parent_monster_spawn_id !== "string" &&
      event !== "altar_final"
    )
      continue;
    const monsterId = String(method.detail.monster_id);
    const definition = definitions.get(monsterId);
    if (!definition)
      throw new Error(`Missing monster marker definition: ${monsterId}`);
    if (event === "altar_final") {
      const methods = altarMethods.get(monsterId) ?? [];
      methods.push(method);
      altarMethods.set(monsterId, methods);
      continue;
    }
    const provider = method.providers.find(
      (entry) => entry.ref.kind === "monster_spawns",
    );
    const location = provider?.location;
    const parentId = method.detail.parent_monster_spawn_id;
    const parent =
      typeof parentId === "string" ? placements.get(parentId) : undefined;
    if (!parent)
      throw new Error(`Missing placeholder parent: ${method.methodId}`);
    const parentDefinition = model.entities
      .get("monsters")
      ?.get(parent.monsterId);
    const counts = methodDropCounts(model, [method]);
    const position =
      location?.geometryVisibility === "visible" ? location.position : null;
    monsters.push({
      ...definition,
      id: method.methodId,
      level: Number(model.entities.get("monsters")?.get(monsterId)?.level),
      // The offset separates the placeholder pin from its parent, not its acquisition location.
      position: position ? [position.x + 3, -position.y] : null,
      zoneId: location?.zoneId ?? null,
      zoneName: location?.zoneId
        ? String(
            model.entities.get("zones")?.get(location.zoneId)?.name ??
              "Unknown",
          )
        : "Unknown",
      isPatrolling: false,
      patrolWaypoints: null,
      moveDistance: 0,
      spawnType: "placeholder",
      sourceMonsterId: parent.monsterId,
      sourceMonsterName: parent.name,
      sourceSpawnProbability: Number(
        parentDefinition?.placeholder_spawn_probability,
      ),
      sourceSpawnIds: [parent.id],
      altarIds: null,
      dropCount: counts.dropCount,
      bestiaryDropCount: counts.bestiaryDropCount,
    });
  }
  for (const [monsterId, methods] of altarMethods) {
    const definition = definitions.get(monsterId)!;
    if (definition.position !== null) continue;
    const counts = methodDropCounts(model, methods);
    definition.altarIds = [
      ...new Set(methods.map((method) => String(method.detail.altar_id))),
    ];
    definition.dropCount = counts.dropCount;
    definition.bestiaryDropCount = counts.bestiaryDropCount;
  }
}

/**
 * Load zone list for the zone focus dropdown
 */
export function loadZoneListServer(): ZoneListItem[] {
  const db = new Database(resolve(DB_SOURCE_PATH), { readonly: true });

  try {
    // A zone the map cannot focus on does not belong in the focus dropdown.
    // The build removes an unreleased zone entirely, and it removes the
    // geometry of a zone whose positions the game withholds, so the data says
    // which zones those are.
    const rows = db
      .prepare(
        `
      SELECT id, name
      FROM zones
      WHERE bounds_min_x IS NOT NULL
        AND bounds_min_y IS NOT NULL
        AND bounds_max_x IS NOT NULL
        AND bounds_max_y IS NOT NULL
      ORDER BY name
    `,
      )
      .all() as Array<{ id: string; name: string }>;

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
    }));
  } finally {
    db.close();
  }
}

// --- Helper functions ---

/**
 * Parse JSON array of strings (e.g., from json_group_array).
 * Returns null if empty, invalid, or contains only null.
 */
function parseIdArrayJson(json: string | null): string[] | null {
  if (!json) return null;
  try {
    const ids = JSON.parse(json) as string[];
    if (ids.length === 0 || (ids.length === 1 && ids[0] === null)) {
      return null;
    }
    return ids;
  } catch {
    return null;
  }
}

/**
 * Parse final bosses JSON array into names and IDs.
 */
function parseFinalBosses(json: string | null): {
  names: string[];
  ids: string[];
} {
  if (!json) return { names: [], ids: [] };
  try {
    const bosses = JSON.parse(json) as Array<{ id: string; name: string }>;
    return {
      names: bosses.map((b) => b.name),
      ids: bosses.map((b) => b.id),
    };
  } catch {
    return { names: [], ids: [] };
  }
}

// --- Entity loading functions ---

interface MonsterSpawnRow {
  id: string;
  monster_id: string;
  name: string;
  season: Season | null;
  position_x: number | null;
  position_y: number | null;
  zone_id: string | null;
  zone_name: string;
  level: number;
  is_boss: number;
  is_world_boss: number;
  is_fabled: number;
  is_elite: number;
  is_hunt: number;
  is_patrolling: number;
  patrol_waypoints: string | null;
  move_distance: number;
  respawn_time: number;
  respawn_probability: number;
  spawn_time_start: number;
  spawn_time_end: number;
  base_exp: number;
  spawn_type: string;
  source_monster_id: string | null;
  source_monster_name: string | null;
  source_spawn_probability: number | null;
  source_summon_kill_monster_id: string | null;
  source_summon_kill_monster_name: string | null;
  source_summon_kill_count: number | null;
  blocker_spawn_ids: string | null;
  source_spawn_ids: string | null;
  altar_ids: string | null;
  visual_width: number | null;
  visual_height: number | null;
  visual_source_type: string | null;
}

function loadMonsterSpawnsServer(db: Database.Database): MonsterMapEntity[] {
  const rows = db
    .prepare(
      `
    WITH summon_sources AS (
      SELECT st.summoned_monster_spawn_id AS spawn_id,
        CASE WHEN COUNT(DISTINCT blocker.monster_id) = 1
          THEN MIN(blocker.monster_id) END AS monster_id,
        group_concat(DISTINCT blocker_monster.name) AS monster_names,
        COUNT(DISTINCT stp.spawn_id) AS blocker_count,
        json_group_array(DISTINCT stp.spawn_id)
          FILTER (WHERE stp.spawn_id IS NOT NULL) AS blocker_ids
      FROM summon_triggers st
      LEFT JOIN summon_trigger_placeholders stp ON stp.trigger_id = st.id
      LEFT JOIN monster_spawns blocker ON blocker.id = stp.spawn_id
      LEFT JOIN monsters blocker_monster ON blocker_monster.id = blocker.monster_id
      WHERE st.summoned_monster_spawn_id IS NOT NULL
      GROUP BY st.summoned_monster_spawn_id
    )
    SELECT
      ms.id,
      ms.monster_id,
      m.name,
      m.season,
      ms.position_x,
      ms.position_y,
      ms.zone_id,
      z.name as zone_name,
      COALESCE(ms.level, m.level) as level,
      m.is_boss,
      m.is_world_boss,
      m.is_fabled,
      m.is_elite,
      m.is_hunt,
      ms.is_patrolling,
      ms.patrol_waypoints,
      ms.move_distance,
      m.respawn_time,
      m.respawn_probability,
      m.spawn_time_start,
      m.spawn_time_end,
      m.base_exp,
      CASE WHEN summon.spawn_id IS NOT NULL THEN 'summon' ELSE 'regular' END AS spawn_type,
      NULL AS source_monster_id,
      NULL AS source_monster_name,
      NULL AS source_spawn_probability,
      summon.monster_id AS source_summon_kill_monster_id,
      summon.monster_names AS source_summon_kill_monster_name,
      summon.blocker_count AS source_summon_kill_count,
      summon.blocker_ids AS blocker_spawn_ids,
      NULL AS source_spawn_ids,
      NULL as altar_ids,
      va.width as visual_width,
      va.height as visual_height,
      va.source_type as visual_source_type
    FROM monster_spawns ms
    JOIN monsters m ON m.id = ms.monster_id
    LEFT JOIN summon_sources summon ON summon.spawn_id = ms.id
    LEFT JOIN visual_assets va
      ON va.domain = 'monster'
     AND va.entity_id = m.id
     AND va.kind = 'primary'
    JOIN zones z ON z.id = ms.zone_id

    UNION ALL

    -- Monsters without visible spawns (for popup support, not rendered)
    SELECT
      m.id as id,
      m.id as monster_id,
      m.name,
      m.season,
      NULL as position_x,
      NULL as position_y,
      NULL as zone_id,
      'Unknown' as zone_name,
      m.level,
      m.is_boss,
      m.is_world_boss,
      m.is_fabled,
      m.is_elite,
      m.is_hunt,
      0 as is_patrolling,
      NULL as patrol_waypoints,
      0 as move_distance,
      m.respawn_time,
      m.respawn_probability,
      m.spawn_time_start,
      m.spawn_time_end,
      m.base_exp,
      'regular' as spawn_type,
      NULL as source_monster_id,
      NULL as source_monster_name,
      NULL as source_spawn_probability,
      NULL as source_summon_kill_monster_id,
      NULL as source_summon_kill_monster_name,
      NULL as source_summon_kill_count,
      NULL as blocker_spawn_ids,
      NULL as source_spawn_ids,
      NULL as altar_ids,
      va.width as visual_width,
      va.height as visual_height,
      va.source_type as visual_source_type
    FROM monsters m
    LEFT JOIN visual_assets va
      ON va.domain = 'monster'
     AND va.entity_id = m.id
     AND va.kind = 'primary'
    WHERE NOT EXISTS (
      SELECT 1 FROM monster_spawns ms
      WHERE ms.monster_id = m.id
    )
  `,
    )
    .all() as MonsterSpawnRow[];

  return rows.map((r) => {
    let patrolWaypoints: [number, number][] | null = null;
    if (r.is_patrolling && r.patrol_waypoints) {
      try {
        const waypoints = JSON.parse(r.patrol_waypoints) as Array<{
          x: number;
          y: number;
        }>;
        if (waypoints.length > 0) {
          patrolWaypoints = waypoints.map((wp) => [wp.x, -wp.y]);
        }
      } catch {
        // Invalid JSON, skip patrol data
      }
    }

    let type: "boss" | "fabled" | "elite" | "hunt" | "monster" = "monster";
    if (r.is_fabled) type = "fabled";
    else if (r.is_boss) type = "boss";
    else if (r.is_elite) type = "elite";
    else if (r.is_hunt) type = "hunt";

    return {
      id: r.id,
      monsterId: r.monster_id,
      type,
      name: r.name,
      season: r.season,
      position:
        r.position_x !== null && r.position_y !== null
          ? [r.position_x, -r.position_y]
          : null,
      zoneId: r.zone_id,
      zoneName: r.zone_name,
      level: r.level,
      isBoss: Boolean(r.is_boss),
      isWorldBoss: Boolean(r.is_world_boss),
      isFabled: Boolean(r.is_fabled),
      isElite: Boolean(r.is_elite),
      isHunt: Boolean(r.is_hunt),
      isPatrolling: Boolean(r.is_patrolling),
      patrolWaypoints,
      moveDistance: r.move_distance ?? 0,
      respawnTime: r.respawn_time,
      respawnProbability: r.respawn_probability,
      spawnTimeStart: r.spawn_time_start,
      spawnTimeEnd: r.spawn_time_end,
      baseExp: r.base_exp,
      dropCount: 0,
      bestiaryDropCount: 0,
      spawnType: r.spawn_type as "regular" | "summon" | "placeholder" | "altar",
      sourceMonsterName: r.source_monster_name,
      sourceMonsterId: r.source_monster_id,
      sourceSpawnProbability: r.source_spawn_probability,
      summonKillMonsterName: r.source_summon_kill_monster_name,
      summonKillMonsterId: r.source_summon_kill_monster_id,
      summonKillCount: r.source_summon_kill_count,
      blockerSpawnIds: parseIdArrayJson(r.blocker_spawn_ids),
      sourceSpawnIds: parseIdArrayJson(r.source_spawn_ids),
      altarIds: parseIdArrayJson(r.altar_ids),
      visualAssetLayout:
        r.visual_width !== null &&
        r.visual_height !== null &&
        r.visual_source_type
          ? {
              width: r.visual_width,
              height: r.visual_height,
              sourceType: r.visual_source_type,
            }
          : null,
    };
  });
}

interface NpcSpawnRow {
  id: string | null;
  npc_id: string;
  name: string;
  season: Season | null;
  position_x: number | null;
  position_y: number | null;
  zone_id: string | null;
  zone_name: string;
  role_bitmask: number;
  is_notable: number;
  respawn_dungeon_id: number;
  renewal_dungeon_name: string | null;
  renewal_dungeon_zone_id: string | null;
  patrol_waypoints: string | null;
  move_distance: number;
  quest_count: number;
  teleport_zone_id: string | null;
  teleport_zone_name: string | null;
  teleport_destination_x: number | null;
  teleport_destination_y: number | null;
  teleport_price: number | null;
}

function loadNpcSpawnsServer(db: Database.Database): NpcMapEntity[] {
  const rows = db
    .prepare(
      `
    SELECT
      ns.id,
      n.id as npc_id,
      n.name,
      n.season,
      ns.position_x,
      ns.position_y,
      ns.zone_id,
      COALESCE(z.name, 'Unknown') as zone_name,
      COALESCE(ns.role_bitmask, 0) as role_bitmask,
      n.is_notable,
      n.respawn_dungeon_id,
      rz.name as renewal_dungeon_name,
      rz.id as renewal_dungeon_zone_id,
      ns.patrol_waypoints,
      ns.move_distance,
      (SELECT COUNT(*) FROM npc_quest_memberships membership
       WHERE membership.npc_id = n.id AND membership.role = 'offer') AS quest_count,
      ns.teleport_zone_id,
      tz.name as teleport_zone_name,
      ns.teleport_destination_x,
      ns.teleport_destination_y,
      ns.teleport_price
    FROM npcs n
    LEFT JOIN npc_spawns ns ON ns.npc_id = n.id
    LEFT JOIN zones z ON z.id = ns.zone_id
    LEFT JOIN zones rz ON rz.zone_id = n.respawn_dungeon_id
    LEFT JOIN zones tz ON tz.id = ns.teleport_zone_id
  `,
    )
    .all() as NpcSpawnRow[];

  return rows.map((r) => {
    let patrolWaypoints: [number, number][] | null = null;
    if (r.patrol_waypoints) {
      try {
        const waypoints = JSON.parse(r.patrol_waypoints) as Array<{
          x: number;
          y: number;
        }>;
        if (waypoints.length > 0) {
          patrolWaypoints = waypoints.map((wp) => [wp.x, -wp.y]);
        }
      } catch {
        // Invalid JSON, skip patrol data
      }
    }

    return {
      id: r.npc_id,
      type: "npc" as const,
      name: r.name,
      season: r.season,
      position:
        r.position_x !== null && r.position_y !== null
          ? [r.position_x, -r.position_y]
          : null,
      zoneId: r.zone_id,
      zoneName: r.zone_name,
      roleBitmask: r.role_bitmask,
      isNotable: Boolean(r.is_notable),
      renewalDungeonName:
        r.respawn_dungeon_id === WORLD_BOSS_DUNGEON_ID
          ? "World Bosses"
          : r.renewal_dungeon_name,
      renewalDungeonZoneId:
        r.respawn_dungeon_id === WORLD_BOSS_DUNGEON_ID
          ? null
          : r.renewal_dungeon_zone_id,
      isWorldBossReset: r.respawn_dungeon_id === WORLD_BOSS_DUNGEON_ID,
      isPatrolling: patrolWaypoints !== null && patrolWaypoints.length > 1,
      patrolWaypoints,
      moveDistance: r.move_distance ?? 0,
      questCount: r.quest_count,
      itemsSoldCount: 0,
      hasTeleport: r.teleport_zone_id !== null,
      teleportDestName: r.teleport_zone_name,
      teleportZoneId: r.teleport_zone_id,
      teleportDestination:
        r.teleport_destination_x !== null && r.teleport_destination_y !== null
          ? [r.teleport_destination_x, -r.teleport_destination_y]
          : null,
      teleportPrice: r.teleport_price ?? 0,
    };
  });
}

interface PortalRow {
  id: string;
  position_x: number | null;
  position_y: number | null;
  from_zone_id: string;
  from_zone_name: string;
  from_sub_zone_name: string | null;
  destination_x: number | null;
  destination_y: number | null;
  to_zone_id: string | null;
  to_zone_name: string | null;
  to_sub_zone_name: string | null;
  is_closed: number;
  required_item_id: string | null;
  required_item_name: string | null;
  requires_everyone_key: number;
  required_level: number;
  required_item_level: number;
  need_monster_dead_id: string | null;
  need_monster_dead_name: string | null;
  kill_requirement_spawn_ids: string | null;
}

function loadPortalsServer(db: Database.Database): PortalMapEntity[] {
  const rows = db
    .prepare(
      `
    SELECT
      p.id,
      p.position_x,
      p.position_y,
      p.from_zone_id,
      fz.name as from_zone_name,
      fsz.name as from_sub_zone_name,
      CASE WHEN p.destination_withheld=0 THEN p.destination_x END AS destination_x,
      CASE WHEN p.destination_withheld=0 THEN p.destination_y END AS destination_y,
      CASE WHEN p.destination_withheld=0 THEN p.to_zone_id END AS to_zone_id,
      CASE WHEN p.destination_withheld=0 THEN tz.name END AS to_zone_name,
      CASE WHEN p.destination_withheld=0 THEN tsz.name END AS to_sub_zone_name,
      p.is_closed,
      CASE WHEN p.required_item_withheld=0 THEN p.required_item_id END AS required_item_id,
      CASE WHEN p.required_item_withheld=0 THEN i.name END as required_item_name,
      p.requires_everyone_key,
      COALESCE(p.level_required, 0) as required_level,
      COALESCE(p.item_level_required, 0) as required_item_level,
      CASE WHEN p.need_monster_dead_withheld=0 THEN dead_spawn.id END AS need_monster_dead_id,
      CASE WHEN p.need_monster_dead_withheld=0 THEN m.name END as need_monster_dead_name,
      CASE WHEN p.need_monster_dead_withheld=0 AND dead_spawn.id IS NOT NULL THEN json_array(dead_spawn.id) END as kill_requirement_spawn_ids
    FROM portals p
    JOIN zones fz ON fz.id = p.from_zone_id
    LEFT JOIN zone_triggers fsz ON fsz.id = p.from_sub_zone_id
    LEFT JOIN zones tz ON tz.id = p.to_zone_id
    LEFT JOIN zone_triggers tsz ON tsz.id = p.to_sub_zone_id
    LEFT JOIN items i ON i.id = p.required_item_id
    LEFT JOIN monster_spawns dead_spawn ON dead_spawn.id = p.need_monster_dead_spawn_id
    LEFT JOIN monsters m ON m.id = dead_spawn.monster_id
    WHERE p.is_template = 0
  `,
    )
    .all() as PortalRow[];

  return rows.map((r) => {
    const isClosed = Boolean(r.is_closed);
    const name = isClosed
      ? "Closed Portal"
      : r.to_zone_name
        ? `Portal to ${r.to_zone_name}`
        : "Portal";

    return {
      id: r.id,
      type: "portal" as const,
      name,
      position:
        r.position_x !== null && r.position_y !== null
          ? [r.position_x, -r.position_y]
          : null,
      zoneId: r.from_zone_id,
      zoneName: r.from_zone_name,
      destination:
        r.destination_x !== null && r.destination_y !== null
          ? [r.destination_x, -r.destination_y]
          : null,
      destinationZoneId: r.to_zone_id,
      destinationZoneName: r.to_zone_name,
      fromSubZoneName: r.from_sub_zone_name,
      destinationSubZoneName: r.to_sub_zone_name,
      isClosed,
      requiredItemId: r.required_item_id,
      requiredItemName: r.required_item_name,
      requiresEveryoneKey: Boolean(r.requires_everyone_key),
      requiredLevel: r.required_level,
      requiredItemLevel: r.required_item_level,
      needMonsterDeadId: r.need_monster_dead_id,
      needMonsterDeadName: r.need_monster_dead_name,
      killRequirementSpawnIds: parseIdArrayJson(r.kill_requirement_spawn_ids),
    };
  });
}

interface ChestRow {
  id: string;
  name: string;
  position_x: number | null;
  position_y: number | null;
  zone_id: string;
  zone_name: string;
  respawn_time: number;
  drop_count: number;
  random_drop_count: number;
}

function loadChestsServer(db: Database.Database): ChestMapEntity[] {
  const rows = db
    .prepare(
      `
    SELECT
      c.id,
      c.name,
      c.position_x,
      c.position_y,
      c.zone_id,
      z.name as zone_name,
      c.respawn_time,
      0 as drop_count,
      0 as random_drop_count
    FROM chests c
    JOIN zones z ON z.id = c.zone_id
  `,
    )
    .all() as ChestRow[];

  return rows.map((r) => ({
    id: r.id,
    type: "chest" as const,
    name: "Chest",
    position:
      r.position_x !== null && r.position_y !== null
        ? [r.position_x, -r.position_y]
        : null,
    zoneId: r.zone_id,
    zoneName: r.zone_name,
    keyRequiredId: null,
    keyRequiredName: null,
    respawnTime: r.respawn_time,
    dropCount: r.drop_count,
    randomDropCount: r.random_drop_count,
  }));
}

interface TreasureRow {
  id: string;
  zone_id: string;
  zone_name: string;
  position_x: number;
  position_y: number;
  required_map_id: string;
  required_map_name: string;
  required_map_tooltip_html: string | null;
  reward_id: string | null;
  reward_name: string | null;
  reward_tooltip_html: string | null;
}

function loadTreasureServer(db: Database.Database): TreasureMapEntity[] {
  const rows = db
    .prepare(
      `
    SELECT
      tl.id,
      tl.zone_id,
      z.name as zone_name,
      tl.position_x,
      tl.position_y,
      tl.required_map_id,
      m.name as required_map_name,
      m.tooltip_html as required_map_tooltip_html,
      tl.reward_id,
      r.name as reward_name,
      r.tooltip_html as reward_tooltip_html
    FROM treasure_locations tl
    JOIN zones z ON z.id = tl.zone_id
    JOIN items m ON m.id = tl.required_map_id
    LEFT JOIN items r ON r.id = tl.reward_id
  `,
    )
    .all() as TreasureRow[];

  return rows.map((r) => ({
    id: r.id,
    type: "treasure" as const,
    name: r.required_map_name,
    position: [r.position_x, -r.position_y] as [number, number],
    zoneId: r.zone_id,
    zoneName: r.zone_name,
    requiredMapId: r.required_map_id,
    requiredMapName: r.required_map_name,
    requiredMapTooltipHtml: r.required_map_tooltip_html,
    rewardId: r.reward_id,
    rewardName: r.reward_name,
    rewardTooltipHtml: r.reward_tooltip_html,
  }));
}

interface AltarRow {
  id: string;
  name: string;
  type: string;
  position_x: number | null;
  position_y: number | null;
  zone_id: string;
  zone_name: string;
  min_level_required: number;
  required_activation_item_id: string | null;
  required_activation_item_name: string | null;
  radius_event: number;
  total_waves: number;
  reward_common_name: string | null;
  reward_magic_name: string | null;
  reward_epic_name: string | null;
  reward_legendary_name: string | null;
  final_bosses: string | null;
}

function loadAltarsServer(db: Database.Database): AltarMapEntity[] {
  const rows = db
    .prepare(
      `
    SELECT
      a.id,
      a.name,
      a.type,
      a.position_x,
      a.position_y,
      a.zone_id,
      z.name as zone_name,
      a.min_level_required,
      a.required_activation_item_id,
      a.required_activation_item_name,
      a.radius_event,
      a.total_waves,
      a.reward_common_name,
      a.reward_magic_name,
      a.reward_epic_name,
      a.reward_legendary_name,
      (
        SELECT json_group_array(DISTINCT json_object('id', m.id, 'name', m.name))
        FROM acquisition_kill_details d
        JOIN acquisition_methods am ON am.id = d.id AND am.rooted = 1
        JOIN monsters m ON m.id = d.monster_id
        WHERE d.altar_id = a.id AND d.event_kind = 'altar_final'
      ) as final_bosses
    FROM altars a
    JOIN zones z ON z.id = a.zone_id
  `,
    )
    .all() as AltarRow[];

  return rows.map((r) => {
    const bossInfo = parseFinalBosses(r.final_bosses);
    return {
      id: r.id,
      type: "altar" as const,
      name: r.name,
      position:
        r.position_x !== null && r.position_y !== null
          ? [r.position_x, -r.position_y]
          : null,
      zoneId: r.zone_id,
      zoneName: r.zone_name,
      altarType: r.type as "forgotten" | "avatar",
      minLevel: r.min_level_required,
      activationItemId: r.required_activation_item_id,
      activationItemName: r.required_activation_item_name,
      radiusEvent: r.radius_event,
      totalWaves: r.total_waves,
      rewardCommonName: r.reward_common_name,
      rewardMagicName: r.reward_magic_name,
      rewardEpicName: r.reward_epic_name,
      rewardLegendaryName: r.reward_legendary_name,
      finalBossNames: bossInfo.names,
      finalBossIds: bossInfo.ids,
    };
  });
}

interface TrapRow {
  id: string;
  name: string;
  type: TrapMapEntity["trapType"];
  position_x: number | null;
  position_y: number | null;
  zone_id: string;
  zone_name: string;
  effect_skill_id: string | null;
  effect_skill_name: string | null;
  teleport_zone_id: string | null;
  teleport_zone_name: string | null;
  teleport_position_x: number | null;
  teleport_position_y: number | null;
  fire_interval: number | null;
  area_paths: string | null;
}

function loadTrapsServer(db: Database.Database): TrapMapEntity[] {
  const rows = db
    .prepare(
      `
    SELECT
      t.id,
      t.name,
      t.type,
      t.position_x,
      t.position_y,
      t.zone_id,
      z.name as zone_name,
      t.effect_skill_id,
      s.name as effect_skill_name,
      t.teleport_zone_id,
      tz.name as teleport_zone_name,
      t.teleport_position_x,
      t.teleport_position_y,
      t.fire_interval,
      t.area_paths
    FROM traps t
    JOIN zones z ON z.id = t.zone_id
    LEFT JOIN skills s ON s.id = t.effect_skill_id
    LEFT JOIN zones tz ON tz.id = t.teleport_zone_id
  `,
    )
    .all() as TrapRow[];

  return rows.map((r) => ({
    id: r.id,
    type: "trap" as const,
    name: r.name,
    position:
      r.position_x !== null && r.position_y !== null
        ? [r.position_x, -r.position_y]
        : null,
    zoneId: r.zone_id,
    zoneName: r.zone_name,
    trapType: r.type,
    effectSkillId: r.effect_skill_id,
    effectSkillName: r.effect_skill_name,
    teleportZoneId: r.teleport_zone_id,
    teleportZoneName: r.teleport_zone_name,
    teleportPosition:
      r.teleport_position_x !== null && r.teleport_position_y !== null
        ? [r.teleport_position_x, -r.teleport_position_y]
        : null,
    fireInterval: r.fire_interval,
    areaPaths:
      parseTrapAreaRings(r.area_paths)?.map((ring) =>
        ring.map(([x, y]) => [x, -y] as [number, number]),
      ) ?? null,
  }));
}

interface GatheringRow {
  id: string;
  resource_id: string;
  name: string;
  position_x: number | null;
  position_y: number | null;
  zone_id: string | null;
  zone_name: string;
  level: number;
  is_plant: number;
  is_fishing_spot: number;
  is_mineral: number;
  is_radiant_spark: number;
  respawn_time: number;
  tool_required_id: string | null;
  tool_required_name: string | null;
  drop_count: number;
}

function getGatheringSelectionGroupId(
  id: string,
  isFishingSpot: number,
): string {
  return isFishingSpot ? id.replace(/_[0-9a-f]{8}$/u, "") : id;
}

function loadGatheringSpawnsServer(
  db: Database.Database,
): GatheringMapEntity[] {
  const rows = db
    .prepare(
      `
    SELECT
      COALESCE(gs.id, gr.id) AS id,
      gr.id AS resource_id,
      gr.name,
      gs.position_x,
      gs.position_y,
      gs.zone_id,
      COALESCE(z.name, 'Unknown') as zone_name,
      gr.level,
      gr.is_plant,
      gr.is_fishing_spot,
      gr.is_mineral,
      gr.is_radiant_spark,
      gr.respawn_time,
      gr.tool_required_id,
      t.name as tool_required_name,
      0 as drop_count
    FROM gathering_resources gr
    LEFT JOIN gathering_resource_spawns gs ON gs.resource_id = gr.id
    LEFT JOIN zones z ON z.id = gs.zone_id
    LEFT JOIN items t ON t.id = gr.tool_required_id
  `,
    )
    .all() as GatheringRow[];

  return rows.map((r) => {
    let type: GatheringMapEntity["type"];
    if (r.is_fishing_spot) type = "gathering_fish";
    else if (r.is_plant) type = "gathering_plant";
    else if (r.is_mineral) type = "gathering_mineral";
    else if (r.is_radiant_spark) type = "gathering_spark";
    else type = "gathering_other";

    return {
      id: r.id,
      resourceId: r.resource_id,
      type,
      name: r.name,
      position:
        r.position_x !== null && r.position_y !== null
          ? [r.position_x, -r.position_y]
          : null,
      zoneId: r.zone_id,
      zoneName: r.zone_name,
      resourceName: r.name,
      selectionGroupId: getGatheringSelectionGroupId(
        r.resource_id,
        r.is_fishing_spot,
      ),
      level: r.level,
      respawnTime: r.respawn_time,
      toolRequiredId: r.tool_required_id,
      toolRequiredName: r.tool_required_name,
      dropCount: r.drop_count,
    };
  });
}

interface CraftingRow {
  id: string;
  name: string;
  position_x: number | null;
  position_y: number | null;
  zone_id: string;
  zone_name: string;
  table_type: string;
  is_cooking_oven: number;
}

function loadCraftingStationsServer(
  db: Database.Database,
): CraftingMapEntity[] {
  const rows = db
    .prepare(
      `
    SELECT
      at.id,
      at.name,
      at.position_x,
      at.position_y,
      at.zone_id,
      z.name as zone_name,
      'alchemy_table' as table_type,
      0 as is_cooking_oven
    FROM alchemy_tables at
    JOIN zones z ON z.id = at.zone_id
    UNION ALL
    SELECT
      cs.id,
      cs.name,
      cs.position_x,
      cs.position_y,
      cs.zone_id,
      z.name as zone_name,
      'crafting_station' as table_type,
      cs.is_cooking_oven
    FROM crafting_stations cs
    JOIN zones z ON z.id = cs.zone_id
    UNION ALL
    SELECT
      st.id,
      st.name,
      st.position_x,
      st.position_y,
      st.zone_id,
      z.name as zone_name,
      'scribing_table' as table_type,
      0 as is_cooking_oven
    FROM scribing_tables st
    JOIN zones z ON z.id = st.zone_id
  `,
    )
    .all() as CraftingRow[];

  return rows.map((r) => ({
    id: r.id,
    type: r.table_type as
      "alchemy_table" | "crafting_station" | "scribing_table",
    name: r.name,
    position:
      r.position_x !== null && r.position_y !== null
        ? [r.position_x, -r.position_y]
        : null,
    zoneId: r.zone_id,
    zoneName: r.zone_name,
    isCookingOven: Boolean(r.is_cooking_oven),
  }));
}

interface HouseRow {
  id: string;
  name: string;
  base_price: number;
  faction_id: string | null;
  faction_required: number;
  zone_id: string | null;
  zone_name: string;
  sub_zone_id: string | null;
  sub_zone_name: string | null;
  position_x: number | null;
  position_y: number | null;
}

function loadHousesServer(db: Database.Database): HouseMapEntity[] {
  const rows = db
    .prepare(
      `
    SELECT
      h.id,
      h.name,
      h.base_price,
      h.faction_id,
      h.faction_required,
      h.zone_id,
      COALESCE(h.zone_name, z.name, 'Unknown') as zone_name,
      h.sub_zone_id,
      h.sub_zone_name,
      h.position_x,
      h.position_y
    FROM houses h
    LEFT JOIN zones z ON z.id = h.zone_id
    WHERE h.position_x IS NOT NULL
      AND h.position_y IS NOT NULL
  `,
    )
    .all() as HouseRow[];

  return rows.map((row) => ({
    id: row.id,
    type: "house",
    name: row.name,
    position:
      row.position_x !== null && row.position_y !== null
        ? [row.position_x, -row.position_y]
        : null,
    zoneId: row.zone_id,
    zoneName: row.zone_name,
    basePrice: row.base_price,
    factionId: row.faction_id,
    factionRequired: row.faction_required,
    subZoneId: row.sub_zone_id,
    subZoneName: row.sub_zone_name,
  }));
}

interface ZoneTriggerRow {
  id: string;
  name: string;
  parent_zone_id: string;
  zone_name: string;
  bounds_min_x: number;
  bounds_min_y: number;
  bounds_max_x: number;
  bounds_max_y: number;
}

function loadZoneTriggersServer(db: Database.Database): ZoneBoundary[] {
  const rows = db
    .prepare(
      `
    SELECT
      zt.id,
      zt.name,
      z.id as parent_zone_id,
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
  `,
    )
    .all() as ZoneTriggerRow[];

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    zoneId: r.parent_zone_id,
    zoneName: r.zone_name,
    polygon: [
      [r.bounds_min_x, -r.bounds_max_y],
      [r.bounds_max_x, -r.bounds_max_y],
      [r.bounds_max_x, -r.bounds_min_y],
      [r.bounds_min_x, -r.bounds_min_y],
    ] as [number, number][],
  }));
}

interface ZoneBoundsRow {
  id: string;
  name: string;
  level_min: number | null;
  level_max: number | null;
  is_dungeon: number;
  bounds_min_x: number | null;
  bounds_min_y: number | null;
  bounds_max_x: number | null;
  bounds_max_y: number | null;
}

function loadZoneBoundsServer(db: Database.Database): ParentZoneBoundary[] {
  // Load ALL zones so excluded zones (without bounds) can still show popups
  const rows = db
    .prepare(
      `
    SELECT
      id,
      name,
      level_min,
      level_max,
      is_dungeon,
      bounds_min_x,
      bounds_min_y,
      bounds_max_x,
      bounds_max_y
    FROM zones
  `,
    )
    .all() as ZoneBoundsRow[];

  return rows.map((r) => {
    const hasBounds =
      r.bounds_min_x !== null &&
      r.bounds_min_y !== null &&
      r.bounds_max_x !== null &&
      r.bounds_max_y !== null;

    return {
      id: `parent-${r.name}`,
      name: r.name,
      zoneId: r.id,
      zoneName: r.name,
      levelMin: r.level_min,
      levelMax: r.level_max,
      isDungeon: Boolean(r.is_dungeon),
      polygon: hasBounds
        ? ([
            [r.bounds_min_x!, -r.bounds_max_y!],
            [r.bounds_max_x!, -r.bounds_max_y!],
            [r.bounds_max_x!, -r.bounds_min_y!],
            [r.bounds_min_x!, -r.bounds_min_y!],
          ] as [number, number][])
        : null,
    };
  });
}

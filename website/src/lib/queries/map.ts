import { query } from "$lib/db";
import {
  EXCLUDED_ZONE_IDS,
  WORLD_BOSS_DUNGEON_ID,
} from "$lib/constants/constants";
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
  ParentZoneBoundary,
  LevelRanges,
  ZoneListItem,
} from "$lib/types/map";

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
    parentZones,
  ] = await Promise.all([
    loadMonsterSpawns(),
    loadNpcSpawns(),
    loadPortals(),
    loadChests(),
    loadAltars(),
    loadGatheringSpawns(),
    loadCraftingStations(),
    loadZoneTriggers(),
    loadZoneBounds(),
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
    parentZones,
    levelRanges,
  };
}

interface MonsterSpawnRow {
  id: string;
  monster_id: string;
  name: string;
  position_x: number | null;
  position_y: number | null;
  zone_id: string | null;
  zone_name: string;
  level: number;
  is_boss: number;
  is_elite: number;
  is_hunt: number;
  is_patrolling: number;
  patrol_waypoints: string | null;
  // Popup fields
  respawn_time: number;
  respawn_probability: number;
  spawn_time_start: number;
  spawn_time_end: number;
  base_exp: number;
  drops: string | null;
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
}

/**
 * Count total drops and bestiary drops from monster drops JSON
 */
function countDrops(dropsJson: string | null): {
  dropCount: number;
  bestiaryDropCount: number;
} {
  if (!dropsJson) return { dropCount: 0, bestiaryDropCount: 0 };
  try {
    const drops = JSON.parse(dropsJson) as Array<{ is_bestiary?: boolean }>;
    return {
      dropCount: drops.length,
      bestiaryDropCount: drops.filter((d) => d.is_bestiary).length,
    };
  } catch {
    return { dropCount: 0, bestiaryDropCount: 0 };
  }
}

async function loadMonsterSpawns(): Promise<MonsterMapEntity[]> {
  // Include regular, summon, and placeholder spawns on the map
  // Altar spawns are excluded (too many overlapping dots)
  // Monsters without visible spawns are included with null position for popup support
  const rows = await query<MonsterSpawnRow>(`
    -- Monsters with regular/summon/placeholder spawns (rendered on map)
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
      m.is_elite,
      m.is_hunt,
      ms.is_patrolling,
      ms.patrol_waypoints,
      -- Popup fields
      (m.death_time + m.respawn_time) as respawn_time,
      m.respawn_probability,
      m.spawn_time_start,
      m.spawn_time_end,
      m.base_exp,
      m.drops,
      ms.spawn_type,
      ms.source_monster_id,
      ms.source_monster_name,
      ms.source_spawn_probability,
      ms.source_summon_kill_monster_id,
      ms.source_summon_kill_monster_name,
      ms.source_summon_kill_count,
      -- Blocker spawn IDs for summon spawns (specific spawns that block this)
      (
        SELECT json_group_array(stp.spawn_id)
        FROM summon_trigger_placeholders stp
        WHERE stp.trigger_id = ms.source_summon_trigger_id
      ) as blocker_spawn_ids,
      -- Source spawn IDs for placeholder spawns (spawns of the monster that must be killed)
      (
        SELECT json_group_array(src_ms.id)
        FROM monster_spawns src_ms
        WHERE src_ms.monster_id = ms.source_monster_id
          AND src_ms.zone_id = ms.zone_id
          AND src_ms.spawn_type IN ('regular', 'summon')
      ) as source_spawn_ids,
      -- Altar IDs where this monster spawns as a final boss
      (
        SELECT json_group_array(a.id)
        FROM altars a
        WHERE EXISTS (
          SELECT 1
          FROM json_each(a.waves, '$[' || (json_array_length(a.waves) - 1) || '].monsters') as jm
          JOIN monsters fm ON fm.id = json_extract(jm.value, '$.monster_id')
          WHERE fm.id = ms.monster_id AND (fm.is_boss = 1 OR fm.is_elite = 1)
        )
      ) as altar_ids
    FROM monster_spawns ms
    JOIN monsters m ON m.id = ms.monster_id
    JOIN zones z ON z.id = ms.zone_id
    WHERE ms.spawn_type IN ('regular', 'summon', 'placeholder')

    UNION ALL

    -- Monsters without visible spawns (for popup support, not rendered)
    SELECT
      m.id as id,
      m.id as monster_id,
      m.name,
      NULL as position_x,
      NULL as position_y,
      NULL as zone_id,
      'Unknown' as zone_name,
      m.level,
      m.is_boss,
      m.is_elite,
      m.is_hunt,
      0 as is_patrolling,
      NULL as patrol_waypoints,
      (m.death_time + m.respawn_time) as respawn_time,
      m.respawn_probability,
      m.spawn_time_start,
      m.spawn_time_end,
      m.base_exp,
      m.drops,
      'regular' as spawn_type,
      NULL as source_monster_id,
      NULL as source_monster_name,
      NULL as source_spawn_probability,
      NULL as source_summon_kill_monster_id,
      NULL as source_summon_kill_monster_name,
      NULL as source_summon_kill_count,
      NULL as blocker_spawn_ids,
      NULL as source_spawn_ids,
      -- Altar IDs where this monster spawns as a final boss
      (
        SELECT json_group_array(a.id)
        FROM altars a
        WHERE EXISTS (
          SELECT 1
          FROM json_each(a.waves, '$[' || (json_array_length(a.waves) - 1) || '].monsters') as jm
          JOIN monsters fm ON fm.id = json_extract(jm.value, '$.monster_id')
          WHERE fm.id = m.id AND (fm.is_boss = 1 OR fm.is_elite = 1)
        )
      ) as altar_ids
    FROM monsters m
    WHERE NOT EXISTS (
      SELECT 1 FROM monster_spawns ms
      WHERE ms.monster_id = m.id AND ms.spawn_type IN ('regular', 'summon', 'placeholder')
    )
  `);

  return rows.map((r) => {
    // Parse patrol waypoints and transform Y coordinates
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

    // Determine type: boss > elite > hunt > creature (monster)
    let type: "boss" | "elite" | "hunt" | "monster" = "monster";
    if (r.is_boss) type = "boss";
    else if (r.is_elite) type = "elite";
    else if (r.is_hunt) type = "hunt";

    // Count drops
    const { dropCount, bestiaryDropCount } = countDrops(r.drops);

    return {
      id: r.id, // Use spawn ID for individual spawn tracking
      monsterId: r.monster_id, // Original monster ID for finding related spawns
      type,
      name: r.name,
      position:
        r.position_x !== null && r.position_y !== null
          ? [r.position_x, -r.position_y]
          : null,
      zoneId: r.zone_id,
      zoneName: r.zone_name,
      level: r.level,
      isBoss: Boolean(r.is_boss),
      isElite: Boolean(r.is_elite),
      isHunt: Boolean(r.is_hunt),
      isPatrolling: Boolean(r.is_patrolling),
      patrolWaypoints,
      // Popup fields
      respawnTime: r.respawn_time,
      respawnProbability: r.respawn_probability,
      spawnTimeStart: r.spawn_time_start,
      spawnTimeEnd: r.spawn_time_end,
      baseExp: r.base_exp,
      dropCount,
      bestiaryDropCount,
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
    };
  });
}

/**
 * Parse JSON array of strings (e.g., from json_group_array).
 * Returns null if empty, invalid, or contains only null.
 */
function parseIdArrayJson(json: string | null): string[] | null {
  if (!json) return null;
  try {
    const ids = JSON.parse(json) as string[];
    // json_group_array returns [null] when there are no matches
    if (ids.length === 0 || (ids.length === 1 && ids[0] === null)) {
      return null;
    }
    return ids;
  } catch {
    return null;
  }
}

interface NpcSpawnRow {
  id: string | null;
  npc_id: string;
  name: string;
  position_x: number | null;
  position_y: number | null;
  zone_id: string | null;
  zone_name: string;
  role_bitmask: number;
  respawn_dungeon_id: number;
  renewal_dungeon_name: string | null;
  renewal_dungeon_zone_id: string | null;
  patrol_waypoints: string | null;
  // Popup fields
  quests_offered: string | null;
  items_sold: string | null;
  teleport_zone_id: string | null;
  teleport_zone_name: string | null;
  teleport_destination_x: number | null;
  teleport_destination_y: number | null;
  teleport_price: number | null;
}

async function loadNpcSpawns(): Promise<NpcMapEntity[]> {
  const rows = await query<NpcSpawnRow>(`
    SELECT
      ns.id,
      n.id as npc_id,
      n.name,
      ns.position_x,
      ns.position_y,
      ns.zone_id,
      COALESCE(z.name, 'Unknown') as zone_name,
      COALESCE(ns.role_bitmask, 0) as role_bitmask,
      n.respawn_dungeon_id,
      rz.name as renewal_dungeon_name,
      rz.id as renewal_dungeon_zone_id,
      ns.patrol_waypoints,
      -- Popup fields
      n.quests_offered,
      n.items_sold,
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
  `);

  return rows.map((r) => {
    // Count quests and items
    let questCount = 0;
    let itemsSoldCount = 0;
    try {
      if (r.quests_offered) {
        questCount = JSON.parse(r.quests_offered).length;
      }
    } catch {
      /* empty */
    }
    try {
      if (r.items_sold) {
        itemsSoldCount = JSON.parse(r.items_sold).length;
      }
    } catch {
      /* empty */
    }

    // Parse patrol waypoints and transform Y coordinates
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
      position:
        r.position_x !== null && r.position_y !== null
          ? [r.position_x, -r.position_y]
          : null,
      zoneId: r.zone_id,
      zoneName: r.zone_name,
      roleBitmask: r.role_bitmask,
      renewalDungeonName:
        r.respawn_dungeon_id === WORLD_BOSS_DUNGEON_ID
          ? "World Bosses"
          : r.renewal_dungeon_name,
      renewalDungeonZoneId:
        r.respawn_dungeon_id === WORLD_BOSS_DUNGEON_ID
          ? null
          : r.renewal_dungeon_zone_id,
      isPatrolling: patrolWaypoints !== null && patrolWaypoints.length > 1,
      patrolWaypoints,
      // Popup fields
      questCount,
      itemsSoldCount,
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
  destination_x: number | null;
  destination_y: number | null;
  to_zone_id: string | null;
  to_zone_name: string | null;
  is_closed: number;
  required_item_id: string | null;
  required_item_name: string | null;
  required_level: number;
  required_item_level: number;
  need_monster_dead_id: string | null;
  need_monster_dead_name: string | null;
  kill_requirement_spawn_ids: string | null;
}

async function loadPortals(): Promise<PortalMapEntity[]> {
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
      p.is_closed,
      p.required_item_id,
      i.name as required_item_name,
      COALESCE(tz.required_level, 0) as required_level,
      p.level_required as required_item_level,
      p.need_monster_dead_id,
      m.name as need_monster_dead_name,
      -- Spawn IDs for the kill requirement monster in the portal's zone (for arc rendering)
      (
        SELECT json_group_array(ms.id)
        FROM monster_spawns ms
        WHERE ms.monster_id = p.need_monster_dead_id
          AND ms.zone_id = p.from_zone_id
          AND ms.spawn_type IN ('regular', 'summon')
      ) as kill_requirement_spawn_ids
    FROM portals p
    JOIN zones fz ON fz.id = p.from_zone_id
    LEFT JOIN zones tz ON tz.id = p.to_zone_id
    LEFT JOIN items i ON i.id = p.required_item_id
    LEFT JOIN monsters m ON m.id = p.need_monster_dead_id
    WHERE p.is_template = 0
  `);

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
      isClosed,
      requiredItemId: r.required_item_id,
      requiredItemName: r.required_item_name,
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
  key_required_id: string | null;
  key_required_name: string | null;
  // Popup fields
  respawn_time: number;
  drop_count: number;
  random_drop_count: number;
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
      i.name as key_required_name,
      -- Popup fields
      c.respawn_time,
      (SELECT COUNT(*) FROM chest_drops cd WHERE cd.chest_id = c.id) as drop_count,
      (SELECT COUNT(*) FROM chest_drops cd
       JOIN items di ON di.id = cd.item_id
       WHERE cd.chest_id = c.id AND di.random_items IS NOT NULL) as random_drop_count
    FROM chests c
    JOIN zones z ON z.id = c.zone_id
    LEFT JOIN items i ON i.id = c.key_required_id
  `);

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
    keyRequiredId: r.key_required_id,
    keyRequiredName: r.key_required_name,
    // Popup fields
    respawnTime: r.respawn_time,
    dropCount: r.drop_count,
    randomDropCount: r.random_drop_count,
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
  // Popup fields
  total_waves: number;
  reward_normal_name: string | null;
  reward_magic_name: string | null;
  reward_epic_name: string | null;
  reward_legendary_name: string | null;
  final_bosses: string | null;
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
      a.min_level_required,
      a.required_activation_item_id,
      a.required_activation_item_name,
      -- Popup fields
      a.total_waves,
      a.reward_normal_name,
      a.reward_magic_name,
      a.reward_epic_name,
      a.reward_legendary_name,
      -- Final wave bosses/elites (not regular monsters)
      (
        SELECT json_group_array(json_object('id', m.id, 'name', m.name))
        FROM json_each(a.waves, '$[' || (json_array_length(a.waves) - 1) || '].monsters') as jm
        JOIN monsters m ON m.id = json_extract(jm.value, '$.monster_id')
        WHERE m.is_boss = 1 OR m.is_elite = 1
      ) as final_bosses
    FROM altars a
    JOIN zones z ON z.id = a.zone_id
  `);

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
      // Popup fields
      totalWaves: r.total_waves,
      rewardNormalName: r.reward_normal_name,
      rewardMagicName: r.reward_magic_name,
      rewardEpicName: r.reward_epic_name,
      rewardLegendaryName: r.reward_legendary_name,
      finalBossNames: bossInfo.names,
      finalBossIds: bossInfo.ids,
    };
  });
}

interface GatheringRow {
  id: string;
  name: string;
  position_x: number | null;
  position_y: number | null;
  zone_id: string | null;
  zone_name: string;
  level: number;
  is_plant: number;
  is_mineral: number;
  is_radiant_spark: number;
  // Popup fields
  respawn_time: number;
  tool_required_id: string | null;
  tool_required_name: string | null;
  drop_count: number;
}

async function loadGatheringSpawns(): Promise<GatheringMapEntity[]> {
  const rows = await query<GatheringRow>(`
    SELECT
      gr.id,
      gr.name,
      gs.position_x,
      gs.position_y,
      gs.zone_id,
      COALESCE(z.name, 'Unknown') as zone_name,
      gr.level,
      gr.is_plant,
      gr.is_mineral,
      gr.is_radiant_spark,
      -- Popup fields
      gr.respawn_time,
      gr.tool_required_id,
      t.name as tool_required_name,
      (SELECT COUNT(*) FROM gathering_resource_drops grd WHERE grd.resource_id = gr.id) as drop_count
    FROM gathering_resources gr
    LEFT JOIN gathering_resource_spawns gs ON gs.resource_id = gr.id
    LEFT JOIN zones z ON z.id = gs.zone_id
    LEFT JOIN items t ON t.id = gr.tool_required_id
  `);

  return rows.map((r) => {
    let type: GatheringMapEntity["type"];
    if (r.is_plant) type = "gathering_plant";
    else if (r.is_mineral) type = "gathering_mineral";
    else if (r.is_radiant_spark) type = "gathering_spark";
    else type = "gathering_other";

    return {
      id: r.id,
      type,
      name: r.name,
      position:
        r.position_x !== null && r.position_y !== null
          ? [r.position_x, -r.position_y]
          : null,
      zoneId: r.zone_id,
      zoneName: r.zone_name,
      resourceName: r.name,
      level: r.level,
      // Popup fields
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

async function loadCraftingStations(): Promise<CraftingMapEntity[]> {
  const rows = await query<CraftingRow>(`
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
  `);

  return rows.map((r) => ({
    id: r.id,
    type: r.table_type as "alchemy_table" | "crafting_station",
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

async function loadZoneTriggers(): Promise<ZoneBoundary[]> {
  const rows = await query<ZoneTriggerRow>(`
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
  `);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    zoneId: r.parent_zone_id,
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

interface ZoneBoundsRow {
  id: string;
  name: string;
  level_min: number | null;
  level_max: number | null;
  is_dungeon: number;
  bounds_min_x: number;
  bounds_min_y: number;
  bounds_max_x: number;
  bounds_max_y: number;
}

async function loadZoneBounds(): Promise<ParentZoneBoundary[]> {
  const rows = await query<ZoneBoundsRow>(`
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
    WHERE bounds_min_x IS NOT NULL
      AND bounds_min_y IS NOT NULL
      AND bounds_max_x IS NOT NULL
      AND bounds_max_y IS NOT NULL
  `);

  return rows.map((r) => ({
    id: `parent-${r.name}`,
    name: r.name,
    zoneId: r.id,
    zoneName: r.name,
    levelMin: r.level_min,
    levelMax: r.level_max,
    isDungeon: Boolean(r.is_dungeon),
    polygon: [
      [r.bounds_min_x, -r.bounds_max_y],
      [r.bounds_max_x, -r.bounds_max_y],
      [r.bounds_max_x, -r.bounds_min_y],
      [r.bounds_min_x, -r.bounds_min_y],
    ] as [number, number][],
  }));
}

interface ZoneRow {
  id: string;
  name: string;
}

/**
 * Load all zones for the zone focus dropdown
 */
export async function loadZoneList(): Promise<ZoneListItem[]> {
  const exclusionList =
    EXCLUDED_ZONE_IDS.size > 0
      ? Array.from(EXCLUDED_ZONE_IDS)
          .map((id) => `'${id}'`)
          .join(", ")
      : null;

  const rows = await query<ZoneRow>(`
    SELECT id, name
    FROM zones
    ${exclusionList ? `WHERE id NOT IN (${exclusionList})` : ""}
    ORDER BY name
  `);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
  }));
}

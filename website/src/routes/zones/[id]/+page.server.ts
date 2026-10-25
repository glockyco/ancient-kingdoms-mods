import Database from "better-sqlite3";
import { error } from "@sveltejs/kit";
import type { PageServerLoad, EntryGenerator } from "./$types";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import type {
  ZoneDetailData,
  ZoneMonster,
  ZoneNpc,
  ZoneGatherResource,
  ZoneChest,
  ZoneTrap,
  ZoneAltar,
  ZoneConnection,
  ZoneSubZone,
  ZoneRenewalSage,
} from "$lib/types/zones";
import { normalizeRoles } from "$lib/utils/roles";
import { zoneDescription } from "$lib/server/meta-description";
import { fishingSpotBaseId } from "../../../../scripts/gathering-resource-ids.mjs";
import { loadAcquisition } from "$lib/server/acquisition";
import { loadAcquisitionItems } from "$lib/acquisition/items";
import { projectProviderMethods } from "$lib/acquisition/projections";
import { chestRewardFields } from "$lib/server/world-acquisition";
import {
  getProsperityRegion,
  getZoneEventRegion,
} from "$lib/queries/regional-events.server";
import type { Season } from "$lib/data/seasonal-events";

export const prerender = true;

// Generate entries for all zones at build time
export const entries: EntryGenerator = () => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });
  const zones = db.prepare("SELECT id FROM zones").all() as Array<{
    id: string;
  }>;
  db.close();

  return zones.map((zone) => ({ id: zone.id }));
};

export const load: PageServerLoad = async ({
  params,
}): Promise<ZoneDetailData> => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });

  // Get zone basic info with pre-computed level range
  const zone = db
    .prepare(
      `
    SELECT
      z.id,
      z.name,
      z.is_dungeon,
      z.weather_type,
      z.discovery_exp,
      z.level_min,
      z.level_max,
      z.level_median,
      z.description,
      -- Redaction removes the map geometry of zones whose positions are left
      -- out at the developers' request (redactions.toml [zones.suppress_positions]).
      z.bounds_min_x IS NOT NULL AS has_map_bounds
    FROM zones z
    WHERE z.id = ?
  `,
    )
    .get(params.id) as ZoneDetailData["zone"] | undefined;

  if (!zone) {
    db.close();
    throw error(404, `Zone not found: ${params.id}`);
  }

  // Count physical spawns and each altar once, with levels from their source facts.
  const monsters = db
    .prepare(
      `
    WITH zone_spawns AS (
      SELECT ms.monster_id, ms.level, ms.position_x, ms.position_y, ms.position_z,
        'spawn:' || ms.id AS spawn_key,
        CASE WHEN st.id IS NOT NULL THEN 'summon' END AS special_spawn_type
      FROM monster_spawns ms
      LEFT JOIN summon_triggers st ON st.summoned_monster_spawn_id = ms.id
      WHERE ms.zone_id = ?
      UNION ALL
      SELECT k.monster_id, json_extract(member.value, '$.base_level'),
        a.position_x, a.position_y, a.position_z, 'altar:' || a.id, 'altar'
      FROM acquisition_kill_details k
      JOIN altars a ON a.id = k.altar_id
      JOIN json_each(a.waves) wave ON CAST(wave.key AS INTEGER) = k.wave_number
      JOIN json_each(wave.value, '$.monsters') member
        ON CAST(member.key AS INTEGER) = k.wave_member_index
      WHERE a.zone_id = ?
      UNION ALL
      SELECT k.monster_id, target.level,
        parent.position_x, parent.position_y, parent.position_z,
        'placeholder:' || parent.id, 'placeholder'
      FROM acquisition_kill_details k
      JOIN monster_spawns parent ON parent.id = k.parent_monster_spawn_id
      JOIN monsters target ON target.id = k.monster_id
      WHERE k.event_kind = 'placeholder' AND parent.zone_id = ?
    )
    SELECT
      m.id,
      m.name,
      m.season,
      va.public_path AS visual_public_path,
      m.level,
      m.health,
      m.health_base,
      m.health_per_level,
      m.is_boss,
      m.is_elite,
      m.type_name,
      m.gold_min,
      m.gold_max,
      m.does_respawn,
      m.death_time,
      m.respawn_time,
      m.respawn_probability,
      m.spawn_time_start,
      m.spawn_time_end,
      MIN(ms.level) as level_min,
      MAX(ms.level) as level_max,
      COUNT(DISTINCT ms.spawn_key) as spawn_count,
      MIN(ms.position_x) as position_x,
      MIN(ms.position_y) as position_y,
      MIN(ms.position_z) as position_z,
      CASE
        WHEN MAX(ms.special_spawn_type = 'summon') THEN 'summon'
        WHEN MAX(ms.special_spawn_type = 'altar') THEN 'altar'
        WHEN MAX(ms.special_spawn_type = 'placeholder') THEN 'placeholder'
        ELSE NULL
      END as special_spawn_type
    FROM monsters m
    LEFT JOIN visual_assets va
      ON va.domain = 'monster'
     AND va.entity_id = m.id
     AND va.kind = 'primary'
    JOIN zone_spawns ms ON ms.monster_id = m.id
    GROUP BY m.id
    ORDER BY m.level DESC, m.name
  `,
    )
    .all(params.id, params.id, params.id)
    .map((row) => {
      const m = row as {
        id: string;
        name: string;
        season: Season | null;
        visual_public_path: string | null;
        level: number;
        health: number;
        health_base: number;
        health_per_level: number;
        is_boss: boolean;
        is_elite: boolean;
        type_name: string | null;
        gold_min: number | null;
        gold_max: number | null;
        does_respawn: boolean;
        death_time: number;
        respawn_time: number;
        respawn_probability: number;
        spawn_time_start: number;
        spawn_time_end: number;
        level_min: number | null;
        level_max: number | null;
        spawn_count: number;
        position_x: number | null;
        position_y: number | null;
        position_z: number | null;
        special_spawn_type: string | null;
      };
      // Use spawn level range if available, otherwise canonical level
      const levelMin = m.level_min ?? m.level;
      const levelMax = m.level_max ?? m.level;
      return {
        id: m.id,
        name: m.name,
        season: m.season,
        visual_public_path: m.visual_public_path,
        level: levelMin,
        level_min: levelMin,
        level_max: levelMax,
        health: m.health,
        health_base: m.health_base,
        health_per_level: m.health_per_level,
        is_boss: m.is_boss,
        is_elite: m.is_elite,
        type_name: m.type_name,
        gold_min: m.gold_min,
        gold_max: m.gold_max,
        spawn_count: m.spawn_count,
        position_x: m.position_x,
        position_y: m.position_y,
        position_z: m.position_z,
        no_respawn: !m.does_respawn,
        death_time: m.death_time,
        respawn_time: m.respawn_time,
        respawn_probability: m.respawn_probability,
        spawn_time_start: m.spawn_time_start,
        spawn_time_end: m.spawn_time_end,
        special_spawn_type: m.special_spawn_type,
      } as ZoneMonster;
    });

  // Get NPCs in this zone with coordinates
  const npcsRaw = db
    .prepare(
      `
    SELECT
      n.id,
      n.name,
      n.season,
      va.public_path AS visual_public_path,
      n.roles,
      ns.position_x,
      ns.position_y,
      ns.position_z
    FROM npcs n
    LEFT JOIN visual_assets va
      ON va.domain = 'npc'
     AND va.entity_id = n.id
     AND va.kind = 'primary'
    JOIN npc_spawns ns ON ns.npc_id = n.id
    WHERE ns.zone_id = ?
    ORDER BY n.name
  `,
    )
    .all(params.id) as Array<{
    id: string;
    name: string;
    season: Season | null;
    visual_public_path: string | null;
    roles: string;
    position_x: number | null;
    position_y: number | null;
    position_z: number | null;
  }>;

  // Deduplicate NPCs by id
  const npcMap = new Map<string, ZoneNpc>();
  for (const npc of npcsRaw) {
    if (!npcMap.has(npc.id)) {
      npcMap.set(npc.id, {
        id: npc.id,
        name: npc.name,
        season: npc.season,
        visual_public_path: npc.visual_public_path,
        roles: normalizeRoles(npc.roles ? JSON.parse(npc.roles) : {}),
        position_x: npc.position_x,
        position_y: npc.position_y,
        position_z: npc.position_z,
      });
    }
  }
  const npcs = Array.from(npcMap.values());

  // Get gathering resources in this zone (with spawn counts)
  const gatherResources = db
    .prepare(
      `
    SELECT
      gr.id,
      gr.name,
      COUNT(grs.id) as spawn_count,
      gr.is_plant,
      gr.is_mineral,
      gr.is_radiant_spark,
      gr.is_fishing_spot
    FROM gathering_resources gr
    JOIN gathering_resource_spawns grs ON grs.resource_id = gr.id
    WHERE grs.zone_id = ?
    GROUP BY gr.id
    ORDER BY gr.name
  `,
    )
    .all(params.id) as ZoneGatherResource[];

  // Get chests in this zone
  const chestRows = db
    .prepare(
      `
    SELECT
      c.id,
      va.public_path AS visual_public_path,
      c.respawn_time,
      c.position_x,
      c.position_y
    FROM chests c
    LEFT JOIN visual_assets va
      ON va.domain = 'chest'
     AND va.entity_id = c.id
     AND va.kind = 'primary'
    WHERE c.zone_id = ?
    ORDER BY c.position_x, c.position_y, c.id
  `,
    )
    .all(params.id) as Array<
    Pick<
      ZoneChest,
      "id" | "visual_public_path" | "respawn_time" | "position_x" | "position_y"
    >
  >;
  const execute = async (
    sql: string,
    values: readonly (string | number | null)[],
  ) => db.prepare(sql).all(...values) as Record<string, unknown>[];
  const chestAcquisition = await loadAcquisition(execute, {
    kind: "providers",
    providers: chestRows.map((chest) => ({ kind: "chests", id: chest.id })),
  });
  const acquisitionItems = await loadAcquisitionItems(
    execute,
    chestAcquisition,
  );
  const chests: ZoneChest[] = chestRows.map((chest) => {
    const methods = projectProviderMethods(chestAcquisition, {
      kind: "chests",
      id: chest.id,
    }).filter((method) => method.kind === "world_chest");
    if (methods.length === 0)
      throw new Error(`Missing world chest acquisition ${chest.id}`);
    const randomItems = new Set<string>();
    for (const method of methods) {
      const fixedItems = new Set<string>();
      for (const output of method.outputs) {
        if (
          output.resource_kind !== "item" ||
          output.withheld ||
          !output.item_id
        )
          continue;
        if (output.yield_rule === "pool") randomItems.add(output.item_id);
        else fixedItems.add(output.item_id);
      }
      for (const result of method.probabilityResults) {
        if (
          result.target.kind === "item" &&
          !fixedItems.has(result.target.itemId)
        ) {
          randomItems.add(result.target.itemId);
        }
      }
    }
    return {
      ...chest,
      ...chestRewardFields(methods, acquisitionItems),
      drop_count: randomItems.size,
    };
  });

  // Get traps in this zone
  const traps = db
    .prepare(
      `
    SELECT
      t.id,
      t.name,
      t.type,
      t.effect_skill_id,
      s.name as effect_skill_name,
      t.teleport_zone_id,
      tz.name as teleport_zone_name,
      t.fire_interval,
      t.position_x,
      t.position_y
    FROM traps t
    LEFT JOIN skills s ON s.id = t.effect_skill_id
    LEFT JOIN zones tz ON tz.id = t.teleport_zone_id
    WHERE t.zone_id = ?
    ORDER BY t.type, t.name
  `,
    )
    .all(params.id) as ZoneTrap[];

  // Get altars in this zone
  const altars = db
    .prepare(
      `
    SELECT
      id,
      name,
      type,
      min_level_required,
      required_activation_item_id,
      required_activation_item_name,
      total_waves,
      position_x,
      position_y,
      position_z
    FROM altars
    WHERE zone_id = ?
    ORDER BY name
  `,
    )
    .all(params.id) as ZoneAltar[];

  // Get connected zones (deduplicated, excluding current zone)
  const connectedZones = db
    .prepare(
      `
    SELECT DISTINCT
      z.id,
      z.name,
      z.is_dungeon
    FROM portals p
    JOIN zones z ON z.id = p.to_zone_id
    WHERE p.from_zone_id = ? AND p.to_zone_id IS NOT NULL AND p.to_zone_id != ?
    ORDER BY z.name
  `,
    )
    .all(params.id, params.id) as ZoneConnection[];

  // Get sub-zones (zone triggers) for this zone
  const subZones = db
    .prepare(
      `
    SELECT
      zt.id,
      zt.name,
      zt.is_outdoor,
      zt.position_x,
      zt.position_y
    FROM zone_triggers zt
    JOIN zones z ON z.zone_id = zt.zone_id
    WHERE z.id = ?
    ORDER BY zt.name
  `,
    )
    .all(params.id) as ZoneSubZone[];

  // Get Renewal Sage NPC that can reset spawns in this zone (for dungeons)
  // The NPC has respawn_dungeon_id matching this zone's zone_id
  // Also get the zone where the Renewal Sage is located
  const renewalSage = db
    .prepare(
      `
    SELECT
      n.id,
      n.name,
      va.public_path AS visual_public_path,
      n.gold_required_respawn_dungeon as gold_cost,
      sage_zone.id as zone_id,
      sage_zone.name as zone_name
    FROM npcs n
    LEFT JOIN visual_assets va
      ON va.domain = 'npc'
     AND va.entity_id = n.id
     AND va.kind = 'primary'
    JOIN zones z ON z.zone_id = n.respawn_dungeon_id
    JOIN npc_spawns ns ON ns.npc_id = n.id
    JOIN zones sage_zone ON sage_zone.id = ns.zone_id
    WHERE z.id = ?
    LIMIT 1
  `,
    )
    .get(params.id) as ZoneRenewalSage | undefined;

  db.close();

  // Count bosses and elites
  const bossCount = monsters.filter((m) => m.is_boss).length;
  const eliteCount = monsters.filter((m) => m.is_elite && !m.is_boss).length;

  const description = zoneDescription(
    {
      name: zone.name,
      is_dungeon: zone.is_dungeon,
      level_min: zone.level_min,
      level_max: zone.level_max,
      median_level: zone.level_median,
      boss_names: monsters
        .filter((monster) => monster.is_boss)
        .map((monster) => monster.name),
    },
    {
      boss_count: bossCount,
      elite_count: eliteCount,
      altar_count: altars.length,
      npc_count: npcs.length,
      chest_count: chests.length,
      gather_count: new Set(
        gatherResources.map((resource) =>
          resource.is_fishing_spot
            ? fishingSpotBaseId(resource.id)
            : resource.id,
        ),
      ).size,
    },
  );

  return {
    zone,
    description,
    monsters,
    npcs,
    gatherResources,
    chests,
    traps,
    altars,
    connectedZones,
    subZones,
    renewalSage: renewalSage ?? null,
    eventRegion: getZoneEventRegion(zone.id),
    prosperityRegion: getProsperityRegion(zone.id),
  };
};

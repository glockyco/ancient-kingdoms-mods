import Database from "better-sqlite3";
import { error } from "@sveltejs/kit";
import type { PageServerLoad, EntryGenerator } from "./$types";
import type {
  ZoneDetailData,
  ZoneMonster,
  ZoneNpc,
  ZoneGatherResource,
  ZoneChest,
  ZoneAltar,
  ZoneConnection,
  ZoneSubZone,
  ZoneRenewalSage,
} from "$lib/types/zones";
import { normalizeRoles } from "$lib/utils/roles";

export const prerender = true;

// Generate entries for all zones at build time
export const entries: EntryGenerator = () => {
  const db = new Database("static/compendium.db", { readonly: true });
  const zones = db.prepare("SELECT id FROM zones").all() as Array<{
    id: string;
  }>;
  db.close();

  return zones.map((zone) => ({ id: zone.id }));
};

export const load: PageServerLoad = ({ params }): ZoneDetailData => {
  const db = new Database("static/compendium.db", { readonly: true });

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
      z.level_max
    FROM zones z
    WHERE z.id = ?
  `,
    )
    .get(params.id) as ZoneDetailData["zone"] | undefined;

  if (!zone) {
    db.close();
    throw error(404, `Zone not found: ${params.id}`);
  }

  // Get monsters in this zone with health, spawn count, respawn info, and sample coordinates
  // For altar spawns, count each altar only once (not per-wave)
  // Get level range specific to this zone from monster_spawns
  const monsters = db
    .prepare(
      `
    SELECT
      m.id,
      m.name,
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
      m.placeholder_monster_id,
      MIN(ms.level) as level_min,
      MAX(ms.level) as level_max,
      (SELECT COUNT(*) FROM monster_spawns ms2
       WHERE ms2.monster_id = m.id AND ms2.zone_id = ?
       AND ms2.spawn_type != 'altar') +
      (SELECT COUNT(DISTINCT ms3.source_altar_id) FROM monster_spawns ms3
       WHERE ms3.monster_id = m.id AND ms3.zone_id = ?
       AND ms3.spawn_type = 'altar') as spawn_count,
      MIN(ms.position_x) as position_x,
      MIN(ms.position_y) as position_y,
      MIN(ms.position_z) as position_z,
      (SELECT ms4.spawn_type FROM monster_spawns ms4
       WHERE ms4.monster_id = m.id AND ms4.zone_id = ?
       AND ms4.spawn_type != 'regular' LIMIT 1) as special_spawn_type
    FROM monsters m
    JOIN monster_spawns ms ON ms.monster_id = m.id
    WHERE ms.zone_id = ?
    GROUP BY m.id
    ORDER BY m.level DESC, m.name
  `,
    )
    .all(params.id, params.id, params.id, params.id)
    .map((row) => {
      const m = row as {
        id: string;
        name: string;
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
        placeholder_monster_id: string | null;
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
        special_spawn_type:
          m.special_spawn_type ??
          (m.placeholder_monster_id ? "placeholder" : null),
      } as ZoneMonster;
    });

  // Get NPCs in this zone with coordinates
  const npcsRaw = db
    .prepare(
      `
    SELECT
      n.id,
      n.name,
      n.roles,
      ns.position_x,
      ns.position_y,
      ns.position_z
    FROM npcs n
    JOIN npc_spawns ns ON ns.npc_id = n.id
    WHERE ns.zone_id = ?
    ORDER BY n.name
  `,
    )
    .all(params.id) as Array<{
    id: string;
    name: string;
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
      gr.is_radiant_spark
    FROM gathering_resources gr
    JOIN gathering_resource_spawns grs ON grs.resource_id = gr.id
    WHERE grs.zone_id = ?
    GROUP BY gr.id
    ORDER BY gr.name
  `,
    )
    .all(params.id) as ZoneGatherResource[];

  // Get chests in this zone
  const chests = db
    .prepare(
      `
    SELECT
      c.id,
      c.respawn_time,
      c.key_required_id,
      k.name as key_required_name,
      c.item_reward_id,
      r.name as item_reward_name,
      c.item_reward_amount,
      (SELECT COUNT(*) FROM chest_drops cd WHERE cd.chest_id = c.id) as drop_count,
      c.position_x,
      c.position_y
    FROM chests c
    LEFT JOIN items k ON c.key_required_id = k.id
    LEFT JOIN items r ON c.item_reward_id = r.id
    WHERE c.zone_id = ?
    ORDER BY k.name, c.position_x, c.position_y
  `,
    )
    .all(params.id) as ZoneChest[];

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
      n.gold_required_respawn_dungeon as gold_cost,
      sage_zone.id as zone_id,
      sage_zone.name as zone_name
    FROM npcs n
    JOIN zones z ON z.zone_id = n.respawn_dungeon_id
    JOIN npc_spawns ns ON ns.npc_id = n.id
    JOIN zones sage_zone ON sage_zone.id = ns.zone_id
    WHERE z.id = ?
    LIMIT 1
  `,
    )
    .get(params.id) as ZoneRenewalSage | undefined;

  db.close();

  return {
    zone,
    monsters,
    npcs,
    gatherResources,
    chests,
    altars,
    connectedZones,
    subZones,
    renewalSage: renewalSage ?? null,
  };
};

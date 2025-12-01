import Database from "better-sqlite3";
import { error } from "@sveltejs/kit";
import type { PageServerLoad, EntryGenerator } from "./$types";
import type {
  ZoneDetailData,
  ZoneMonster,
  ZoneNpc,
  ZoneGatherResource,
  ZoneAltar,
  ZoneConnection,
  ZoneSubZone,
  ZoneRenewalSage,
} from "$lib/types/zones";

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

  // Get zone basic info with level range (excluding critters)
  // Critters are: type_name='Critter' OR (level 1 ambient creatures with no gold drops)
  const zone = db
    .prepare(
      `
    SELECT
      z.id,
      z.name,
      z.is_dungeon,
      z.weather_type,
      z.discovery_exp,
      (SELECT MIN(m.level) FROM monster_spawns ms
       JOIN monsters m ON m.id = ms.monster_id
       WHERE ms.zone_id = z.id AND m.level > 0
         AND m.type_name != 'Critter'
         AND NOT (m.level = 1 AND m.gold_min = 0 AND m.gold_max = 0)) as level_min,
      (SELECT MAX(m.level) FROM monster_spawns ms
       JOIN monsters m ON m.id = ms.monster_id
       WHERE ms.zone_id = z.id
         AND m.type_name != 'Critter'
         AND NOT (m.level = 1 AND m.gold_min = 0 AND m.gold_max = 0)) as level_max
    FROM zones z
    WHERE z.id = ?
  `,
    )
    .get(params.id) as ZoneDetailData["zone"] | undefined;

  if (!zone) {
    db.close();
    throw error(404, `Zone not found: ${params.id}`);
  }

  // Get monsters in this zone with health, drop count, spawn count, and sample coordinates
  const monsters = db
    .prepare(
      `
    SELECT
      m.id,
      m.name,
      m.level,
      m.health,
      m.is_boss,
      m.is_elite,
      m.type_name,
      m.gold_min,
      m.gold_max,
      m.drops,
      COUNT(ms.id) as spawn_count,
      MIN(ms.position_x) as position_x,
      MIN(ms.position_y) as position_y,
      MIN(ms.position_z) as position_z
    FROM monsters m
    JOIN monster_spawns ms ON ms.monster_id = m.id
    WHERE ms.zone_id = ?
    GROUP BY m.id
    ORDER BY m.level DESC, m.name
  `,
    )
    .all(params.id)
    .map((row) => {
      const m = row as {
        id: string;
        name: string;
        level: number;
        health: number;
        is_boss: boolean;
        is_elite: boolean;
        type_name: string | null;
        gold_min: number | null;
        gold_max: number | null;
        drops: string | null;
        spawn_count: number;
        position_x: number | null;
        position_y: number | null;
        position_z: number | null;
      };
      const drops = m.drops ? JSON.parse(m.drops) : [];
      return {
        id: m.id,
        name: m.name,
        level: m.level,
        health: m.health,
        is_boss: m.is_boss,
        is_elite: m.is_elite,
        type_name: m.type_name,
        gold_min: m.gold_min,
        gold_max: m.gold_max,
        drop_count: drops.length,
        spawn_count: m.spawn_count,
        position_x: m.position_x,
        position_y: m.position_y,
        position_z: m.position_z,
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
        roles: npc.roles ? JSON.parse(npc.roles) : {},
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
    WHERE z.id = ? AND n.respawn_dungeon_id > 0
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
    altars,
    connectedZones,
    subZones,
    renewalSage: renewalSage ?? null,
  };
};

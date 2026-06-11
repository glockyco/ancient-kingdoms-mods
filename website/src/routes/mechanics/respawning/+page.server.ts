import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import { DB_STATIC_PATH } from "$lib/constants/constants";

export const prerender = true;

export interface BossRespawn {
  id: string;
  name: string;
  level: number;
  respawn_time: number;
}

export interface RareSpawn {
  id: string;
  name: string;
  level: number;
  respawn_time: number;
  respawn_probability: number;
  zone: string | null;
}

export interface SpawnWindowMonster {
  id: string;
  name: string;
  level: number;
  spawn_time_start: number;
  spawn_time_end: number;
  zone: string | null;
}

export interface SummonTrigger {
  summoned_entity_type: string;
  summoned_entity_id: string;
  summoned_entity_name: string;
  summon_message: string;
  zone_name: string | null;
  placeholder_names: string | null;
  placeholder_count: number;
  spawn_chance: number | null;
}

export interface RenewalSage {
  id: string;
  name: string;
  base_fee: number;
  dungeon_name: string;
}

export interface RespawnMechanicsPageData {
  bosses: BossRespawn[];
  rareSpawns: RareSpawn[];
  spawnWindowMonsters: SpawnWindowMonster[];
  summonTriggers: SummonTrigger[];
  renewalSages: RenewalSage[];
}

const ZONE_FOR_MONSTER = `
  COALESCE(
    NULLIF(m.zone_bestiary, ''),
    (
      SELECT GROUP_CONCAT(DISTINCT z.name)
      FROM monster_spawns ms
      JOIN zones z ON z.id = ms.zone_id
      WHERE ms.monster_id = m.id
    )
  )
`;

export const load: PageServerLoad = (): RespawnMechanicsPageData => {
  const db = new Database(DB_STATIC_PATH, { readonly: true });

  const bosses = db
    .prepare(
      `
      SELECT m.id, m.name, m.level, m.respawn_time
      FROM monsters m
      WHERE (m.is_boss = 1 OR m.is_world_boss = 1) AND m.does_respawn = 1
      ORDER BY m.respawn_time DESC, m.level DESC, m.name
    `,
    )
    .all() as BossRespawn[];

  const rareSpawns = db
    .prepare(
      `
      SELECT m.id, m.name, m.level, m.respawn_time, m.respawn_probability,
        ${ZONE_FOR_MONSTER} AS zone
      FROM monsters m
      WHERE m.respawn_probability < 1 AND m.does_respawn = 1
      ORDER BY m.level, m.name
    `,
    )
    .all() as RareSpawn[];

  const spawnWindowMonsters = db
    .prepare(
      `
      SELECT m.id, m.name, m.level, m.spawn_time_start, m.spawn_time_end,
        ${ZONE_FOR_MONSTER} AS zone
      FROM monsters m
      WHERE m.spawn_time_start != 0 OR m.spawn_time_end != 0
      ORDER BY m.level DESC, m.name
    `,
    )
    .all() as SpawnWindowMonster[];

  const summonTriggers = db
    .prepare(
      `
      SELECT st.summoned_entity_type, st.summoned_entity_id,
        st.summoned_entity_name, st.summon_message, z.name AS zone_name,
        (
          SELECT GROUP_CONCAT(DISTINCT mo.name)
          FROM summon_trigger_placeholders sp
          JOIN monster_spawns ms ON ms.id = sp.spawn_id
          JOIN monsters mo ON mo.id = ms.monster_id
          WHERE sp.trigger_id = st.id
        ) AS placeholder_names,
        (
          SELECT COUNT(*)
          FROM summon_trigger_placeholders sp
          WHERE sp.trigger_id = st.id
        ) AS placeholder_count,
        summoned.respawn_probability AS spawn_chance
      FROM summon_triggers st
      LEFT JOIN zones z ON z.id = st.zone_id
      LEFT JOIN monsters summoned
        ON summoned.id = st.summoned_entity_id
        AND st.summoned_entity_type = 'Monster'
      ORDER BY st.summoned_entity_name
    `,
    )
    .all() as SummonTrigger[];

  const renewalSages = db
    .prepare(
      `
      SELECT n.id, n.name, n.gold_required_respawn_dungeon AS base_fee,
        z.name AS dungeon_name
      FROM npcs n
      JOIN zones z ON z.zone_id = n.respawn_dungeon_id
      WHERE n.respawn_dungeon_id > 0
      ORDER BY n.gold_required_respawn_dungeon, z.name
    `,
    )
    .all() as RenewalSage[];

  db.close();

  return {
    bosses,
    rareSpawns,
    spawnWindowMonsters,
    summonTriggers,
    renewalSages,
  };
};

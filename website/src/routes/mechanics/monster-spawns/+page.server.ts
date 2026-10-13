import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import { DB_SOURCE_PATH } from "$lib/constants/constants";

export const prerender = true;

export interface BossRespawn {
  id: string;
  name: string;
  level: number;
  respawn_time: number;
  respawn_probability: number;
  is_summonable: number;
  spawn_time_start: number;
  spawn_time_end: number;
}

export interface SpawnZone {
  id: string;
  name: string;
}

export interface RareSpawn {
  id: string;
  name: string;
  level: number;
  respawn_time: number;
  respawn_probability: number;
  zones: SpawnZone[];
  is_summonable: number;
}

export interface SpawnWindowMonster {
  id: string;
  name: string;
  level: number;
  spawn_time_start: number;
  spawn_time_end: number;
  zones: SpawnZone[];
}

export interface SummonTrigger {
  summoned_entity_type: string;
  summoned_entity_id: string;
  summoned_entity_name: string;
  summon_message: string;
  zone_id: string | null;
  zone_name: string | null;
  guards: { id: string; name: string; count: number }[];
  respawn_time: number;
  death_time: number;
  spawn_chance: number;
}

export interface RenewalSage {
  id: string;
  name: string;
  base_fee: number;
  dungeon_name: string;
  dungeon_id: string;
}

export interface RespawnMechanicsPageData {
  bosses: BossRespawn[];
  rareSpawns: RareSpawn[];
  spawnWindowMonsters: SpawnWindowMonster[];
  summonTriggers: SummonTrigger[];
  renewalSages: RenewalSage[];
}

// Source: website/data/compendium.db:monster_spawns — use placed spawn zones, not the bestiary's descriptive area.
const ZONES_FOR_MONSTER = `
  (
    SELECT json_group_array(json_object('id', id, 'name', name))
    FROM (
      SELECT DISTINCT z.id, z.name
      FROM monster_spawns ms
      JOIN zones z ON z.id = ms.zone_id
      WHERE ms.monster_id = m.id
      ORDER BY z.name
    )
  )
`;

export const load: PageServerLoad = (): RespawnMechanicsPageData => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });

  const bosses = db
    .prepare(
      `
      SELECT m.id, m.name, m.level, m.respawn_time, m.respawn_probability,
        m.is_summonable, m.spawn_time_start, m.spawn_time_end
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
        m.is_summonable, ${ZONES_FOR_MONSTER} AS zones
      FROM monsters m
      WHERE m.respawn_probability < 1 AND m.does_respawn = 1
      ORDER BY m.level, m.name
    `,
    )
    .all()
    .map((row) => {
      const rare = row as Omit<RareSpawn, "zones"> & { zones: string };
      return { ...rare, zones: JSON.parse(rare.zones) as SpawnZone[] };
    });

  const spawnWindowMonsters = db
    .prepare(
      `
      SELECT m.id, m.name, m.level, m.spawn_time_start, m.spawn_time_end,
        ${ZONES_FOR_MONSTER} AS zones
      FROM monsters m
      WHERE m.spawn_time_start != 0 OR m.spawn_time_end != 0
      ORDER BY m.level DESC, m.name
    `,
    )
    .all()
    .map((row) => {
      const monster = row as Omit<SpawnWindowMonster, "zones"> & {
        zones: string;
      };
      return { ...monster, zones: JSON.parse(monster.zones) as SpawnZone[] };
    });

  // The summon trigger references the placed Monster or Npc, and the export reads that object's own values.
  // Source: server-scripts/Npc.cs:deathTime — an NPC's corpse time is a fixed 60 seconds.
  const summonTriggers = db
    .prepare(
      `
      SELECT st.summoned_entity_type, st.summoned_entity_id,
        st.summoned_entity_name, st.summon_message, z.id AS zone_id, z.name AS zone_name,
        (
          SELECT json_group_array(json_object('id', id, 'name', name, 'count', guard_count))
          FROM (
            SELECT mo.id, mo.name, COUNT(*) AS guard_count
            FROM summon_trigger_placeholders sp
            JOIN monster_spawns ms ON ms.id = sp.spawn_id
            JOIN monsters mo ON mo.id = ms.monster_id
            WHERE sp.trigger_id = st.id
            GROUP BY mo.id, mo.name
            ORDER BY mo.name
          )
        ) AS guards,
        st.summoned_is_summonable AS is_summonable,
        st.summoned_respawn_time AS respawn_time,
        COALESCE(st.summoned_death_time, 60) AS death_time,
        st.summoned_respawn_probability AS spawn_chance
      FROM summon_triggers st
      LEFT JOIN zones z ON z.id = st.zone_id
      ORDER BY st.summoned_entity_name
    `,
    )
    .all()
    .map((row) => {
      const { is_summonable, ...trigger } = row as Omit<
        SummonTrigger,
        "guards"
      > & { guards: string; is_summonable: number };
      // Source: server-scripts/SummonMonster.cs:IsSummonDead — a trigger only counts a summonable entity as dead, so it could never summon this one.
      if (!is_summonable)
        throw new Error(
          `Summon trigger for ${trigger.summoned_entity_id} references an entity that is not summonable`,
        );
      return {
        ...trigger,
        guards: JSON.parse(trigger.guards) as SummonTrigger["guards"],
      };
    });

  const renewalSages = db
    .prepare(
      `
      SELECT n.id, n.name, n.gold_required_respawn_dungeon AS base_fee,
        z.id AS dungeon_id, z.name AS dungeon_name
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

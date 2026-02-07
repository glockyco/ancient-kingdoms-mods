import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import { DB_STATIC_PATH } from "$lib/constants/constants";
import type {
  MonstersPageData,
  MonsterListView,
  MonsterZoneInfo,
} from "$lib/types/monsters";

export const prerender = true;

export const load: PageServerLoad = (): MonstersPageData => {
  const db = new Database(DB_STATIC_PATH, { readonly: true });

  const monsters = db
    .prepare(
      `
    SELECT
      m.id,
      m.name,
      m.level,
      m.level_min,
      m.level_max,
      m.health,
      m.health_base,
      m.health_per_level,
      m.is_boss,
      m.is_fabled,
      m.is_elite,
      m.is_hunt,
      m.damage,
      m.magic_damage,
      m.defense,
      m.magic_resist,
      m.poison_resist,
      m.fire_resist,
      m.cold_resist,
      m.disease_resist,
      m.death_time,
      m.respawn_time,
      m.respawn_probability,
      m.spawn_time_start,
      m.spawn_time_end,
      (
        SELECT ms.spawn_type FROM monster_spawns ms
        WHERE ms.monster_id = m.id AND ms.spawn_type != 'regular'
        LIMIT 1
      ) as special_spawn_type,
      CASE WHEN NOT EXISTS (
        SELECT 1 FROM monster_spawns ms
        WHERE ms.monster_id = m.id AND ms.spawn_type IN ('regular', 'summon')
      ) THEN 1 ELSE 0 END as no_respawn
    FROM monsters m
    WHERE m.is_dummy = 0
    ORDER BY m.level DESC, m.name ASC
  `,
    )
    .all() as MonsterListView[];

  const monsterZones = db
    .prepare(
      `
    SELECT DISTINCT
      ms.monster_id,
      z.id as zone_id,
      z.name as zone_name,
      z.is_dungeon
    FROM monster_spawns ms
    JOIN zones z ON z.id = ms.zone_id
    ORDER BY z.name
  `,
    )
    .all() as MonsterZoneInfo[];

  db.close();

  return {
    monsters,
    monsterZones,
  };
};

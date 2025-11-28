import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import type {
  MonstersPageData,
  MonsterListView,
  MonsterZoneInfo,
} from "$lib/types/monsters";

export const prerender = true;

export const load: PageServerLoad = (): MonstersPageData => {
  const db = new Database("static/compendium.db", { readonly: true });

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
      CASE WHEN EXISTS (
        SELECT 1 FROM monster_spawns ms
        WHERE ms.monster_id = m.id AND ms.spawn_type != 'regular'
      ) THEN 1 ELSE 0 END as has_special_spawn
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

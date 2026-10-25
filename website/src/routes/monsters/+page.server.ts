import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import type {
  MonstersPageData,
  MonsterListView,
  MonsterZoneInfo,
} from "$lib/types/monsters";

export const prerender = true;

export const load: PageServerLoad = (): MonstersPageData => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });

  const monsters = db
    .prepare(
      `
    SELECT
      m.id,
      m.name,
      m.season,
      va.public_path as visual_public_path,
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
      CASE
        WHEN EXISTS (SELECT 1 FROM summon_triggers st JOIN monster_spawns target ON target.id = st.summoned_monster_spawn_id WHERE target.monster_id = m.id) THEN 'summon'
        WHEN EXISTS (SELECT 1 FROM acquisition_kill_details k WHERE k.monster_id = m.id AND k.altar_id IS NOT NULL) THEN 'altar'
        WHEN EXISTS (SELECT 1 FROM acquisition_kill_details k WHERE k.monster_id = m.id AND k.event_kind = 'placeholder') THEN 'placeholder'
        ELSE NULL
      END AS special_spawn_type,
      CASE WHEN NOT EXISTS (SELECT 1 FROM monster_spawns ms WHERE ms.monster_id = m.id)
        THEN 1 ELSE 0 END AS no_respawn
    FROM monsters m
    LEFT JOIN visual_assets va
      ON va.domain = 'monster'
     AND va.entity_id = m.id
     AND va.kind = 'primary'
    ORDER BY m.level DESC, m.name ASC
  `,
    )
    .all() as MonsterListView[];

  const monsterZones = db
    .prepare(
      `
    SELECT DISTINCT k.monster_id, z.id AS zone_id, z.name AS zone_name, z.is_dungeon
    FROM acquisition_kill_details k
    LEFT JOIN acquisition_providers_monster_spawns p ON p.method_id = k.id
    LEFT JOIN monster_spawns ms ON ms.id = p.monster_spawn_id
    LEFT JOIN altars a ON a.id = k.altar_id
    JOIN zones z ON z.id = COALESCE(ms.zone_id, a.zone_id)
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

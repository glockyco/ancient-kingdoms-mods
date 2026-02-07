import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import type { RespawnInfo } from "$lib/types/respawn";

import { DB_STATIC_PATH } from "$lib/constants/constants";

export const prerender = true;

interface SlayerMonster extends RespawnInfo {
  id: string;
  name: string;
  level_min: number;
  level_max: number;
  is_boss: boolean;
  is_fabled: boolean;
  is_elite: boolean;
}

interface MonsterZoneInfo {
  monster_id: string;
  zone_id: string;
  zone_name: string;
  is_dungeon: boolean;
}

interface SlayerPageData {
  profession: {
    id: string;
    name: string;
    description: string;
    category: string;
    max_level: number;
    steam_achievement_id: string | null;
    steam_achievement_name: string | null;
  };
  monsters: SlayerMonster[];
  monsterZones: MonsterZoneInfo[];
  skillGainPerKill: number;
}

export const load: PageServerLoad = (): SlayerPageData => {
  const db = new Database(DB_STATIC_PATH, { readonly: true });

  const profession = db
    .prepare(
      `
    SELECT
      id,
      name,
      description,
      category,
      max_level,
      steam_achievement_id,
      steam_achievement_name
    FROM professions
    WHERE id = 'slayer'
  `,
    )
    .get() as SlayerPageData["profession"];

  const monsters = db
    .prepare(
      `
    SELECT DISTINCT
      m.id,
      m.name,
      m.level_min,
      m.level_max,
      m.is_boss,
      m.is_elite,
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
    WHERE (m.is_boss = 1 OR m.is_elite = 1) AND m.is_dummy = 0
    ORDER BY m.level_min, m.name
  `,
    )
    .all() as SlayerMonster[];

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
    JOIN monsters m ON m.id = ms.monster_id
    WHERE (m.is_boss = 1 OR m.is_elite = 1) AND m.is_dummy = 0
    ORDER BY z.name
  `,
    )
    .all() as MonsterZoneInfo[];

  db.close();

  // Each kill gives a fixed 0.02% skill gain (up to 50 kills per monster)
  const skillGainPerKill = 0.02;

  return { profession, monsters, monsterZones, skillGainPerKill };
};

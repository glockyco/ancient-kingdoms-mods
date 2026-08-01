import Database from "better-sqlite3";
import { DB_STATIC_PATH } from "$lib/constants/constants";
import type { RespawnInfo } from "$lib/types/respawn";

export interface SlayerTarget extends RespawnInfo {
  id: string;
  name: string;
  level_min: number;
  level_max: number;
  is_boss: boolean;
  is_fabled: boolean;
  is_elite: boolean;
  is_world_boss: boolean;
  spawn_type: "regular" | "summon" | "altar" | "placeholder";
  zone_id: string;
  zone_name: string;
  is_dungeon: boolean;
  position_x: number | null;
  position_y: number | null;
  source_monster_id: string | null;
  source_monster_name: string | null;
  source_spawn_probability: number | null;
  source_altar_id: string | null;
  source_altar_name: string | null;
  source_altar_wave: number | null;
  source_altar_activation_item_id: string | null;
  source_altar_activation_item_name: string | null;
  source_summon_kill_monster_id: string | null;
  source_summon_kill_monster_name: string | null;
  source_summon_kill_count: number | null;
}

export interface SlayerPageData {
  profession: {
    id: string;
    name: string;
    description: string;
    category: string;
    max_level: number;
    achievement_id: string;
    achievement_name: string;
  };
  targets: SlayerTarget[];
}

export function getSlayerPageData(dbPath = DB_STATIC_PATH): SlayerPageData {
  const db = new Database(dbPath, { readonly: true });

  const profession = db
    .prepare(
      `
      SELECT
        p.id,
        p.name,
        p.description,
        p.category,
        p.max_level,
        p.achievement_id,
        a.name AS achievement_name
      FROM professions p
      JOIN achievements a ON a.id = p.achievement_id
      WHERE p.id = 'slayer'
    `,
    )
    .get() as SlayerPageData["profession"];

  // Source: server-scripts/Database.cs:CalculateSlayerLevelForAccount — only
  // bosses and elites advance Slayer, so the table is exactly that set.
  const targets = db
    .prepare(
      `
      SELECT
        m.id,
        m.name,
        m.level_min,
        m.level_max,
        m.is_boss,
        m.is_fabled,
        m.is_elite,
        m.is_world_boss,
        m.death_time,
        m.respawn_time,
        m.respawn_probability,
        m.spawn_time_start,
        m.spawn_time_end,
        CASE WHEN ms.spawn_type = 'regular' THEN NULL ELSE ms.spawn_type END
          AS special_spawn_type,
        CASE WHEN ms.spawn_type IN ('regular', 'summon') THEN 0 ELSE 1 END
          AS no_respawn,
        ms.spawn_type,
        ms.zone_id,
        z.name AS zone_name,
        z.is_dungeon,
        ms.position_x,
        ms.position_y,
        ms.source_monster_id,
        ms.source_monster_name,
        ms.source_spawn_probability,
        ms.source_altar_id,
        ms.source_altar_name,
        ms.source_altar_wave,
        ms.source_altar_activation_item_id,
        ms.source_altar_activation_item_name,
        ms.source_summon_kill_monster_id,
        ms.source_summon_kill_monster_name,
        ms.source_summon_kill_count
      FROM monsters m
      JOIN monster_spawns ms ON ms.monster_id = m.id
      JOIN zones z ON z.id = ms.zone_id
      WHERE m.is_dummy = 0
        AND (m.is_boss = 1 OR m.is_elite = 1)
      ORDER BY m.level_min, m.name
    `,
    )
    .all() as SlayerTarget[];

  db.close();

  return { profession, targets };
}

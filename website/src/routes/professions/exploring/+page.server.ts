import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";

export const prerender = true;

interface ExploringArea {
  id: string;
  name: string;
  zone_id: string;
  zone_name: string;
  is_dungeon: boolean;
  level_min: number | null;
  level_max: number | null;
  discovery_exp: number | null;
}

interface ExploringPageData {
  profession: {
    id: string;
    name: string;
    description: string;
    category: string;
    tracking_type: string;
    tracking_denominator: number | null;
    steam_achievement_id: string | null;
  };
  areas: ExploringArea[];
}

export const load: PageServerLoad = (): ExploringPageData => {
  const db = new Database("static/compendium.db", { readonly: true });

  const profession = db
    .prepare(
      `
    SELECT
      id,
      name,
      description,
      category,
      tracking_type,
      tracking_denominator,
      steam_achievement_id
    FROM professions
    WHERE id = 'exploring'
  `,
    )
    .get() as ExploringPageData["profession"];

  const areas = db
    .prepare(
      `
    SELECT
      zt.id,
      zt.name,
      z.id as zone_id,
      z.name as zone_name,
      z.is_dungeon,
      COALESCE(
        (SELECT MIN(ms.level) FROM monster_spawns ms
         JOIN monsters m ON m.id = ms.monster_id
         WHERE ms.zone_id = z.id AND ms.level > 0
           AND m.type_name != 'Critter'),
        (SELECT MIN(ms.level) FROM monster_spawns ms
         JOIN monsters m ON m.id = ms.monster_id
         WHERE ms.zone_id = z.id AND ms.level > 0)
      ) as level_min,
      COALESCE(
        (SELECT MAX(ms.level) FROM monster_spawns ms
         JOIN monsters m ON m.id = ms.monster_id
         WHERE ms.zone_id = z.id
           AND m.type_name != 'Critter'),
        (SELECT MAX(ms.level) FROM monster_spawns ms
         JOIN monsters m ON m.id = ms.monster_id
         WHERE ms.zone_id = z.id)
      ) as level_max,
      z.discovery_exp
    FROM zone_triggers zt
    JOIN zones z ON zt.zone_id = z.zone_id
    ORDER BY z.name, zt.name
  `,
    )
    .all() as ExploringArea[];

  db.close();

  return { profession, areas };
};

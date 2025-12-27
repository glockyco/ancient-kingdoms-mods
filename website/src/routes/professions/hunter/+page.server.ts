import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";

import { DB_STATIC_PATH } from "$lib/constants/constants";

export const prerender = true;

interface HunterMonster {
  id: string;
  name: string;
  level_min: number;
  level_max: number;
}

interface HunterPageData {
  profession: {
    id: string;
    name: string;
    description: string;
    category: string;
    max_level: number;
    steam_achievement_id: string | null;
    steam_achievement_name: string | null;
  };
  monsters: HunterMonster[];
}

export const load: PageServerLoad = (): HunterPageData => {
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
    WHERE id = 'hunter'
  `,
    )
    .get() as HunterPageData["profession"];

  const monsters = db
    .prepare(
      `
    SELECT DISTINCT
      m.id,
      m.name,
      m.level_min,
      m.level_max
    FROM monsters m
    WHERE m.is_hunt = 1 AND m.is_dummy = 0
    ORDER BY m.level_min, m.name
  `,
    )
    .all() as HunterMonster[];

  db.close();

  return { profession, monsters };
};

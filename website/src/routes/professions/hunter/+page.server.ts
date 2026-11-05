import { getDb } from "$lib/db.server";
import type { PageServerLoad } from "./$types";

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
    achievement_id: string;
    achievement_name: string;
  };
  monsters: HunterMonster[];
}

export const load: PageServerLoad = (): HunterPageData => {
  const db = getDb();

  const profession = db
    .prepare(
      `
    SELECT
      id,
      name,
      description,
      category,
      max_level,
      achievement_id,
      (SELECT name FROM achievements WHERE id = achievement_id) AS achievement_name
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
    JOIN acquisition_kill_details context ON context.monster_id = m.id
    WHERE context.is_hunt = 1 AND m.is_dummy = 0
    ORDER BY m.level_min, m.name
  `,
    )
    .all() as HunterMonster[];

  return { profession, monsters };
};

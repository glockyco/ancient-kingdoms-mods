import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";

export const prerender = true;

interface SlayerMonster {
  id: string;
  name: string;
  level: number;
  is_boss: boolean;
  is_elite: boolean;
}

interface SlayerPageData {
  profession: {
    id: string;
    name: string;
    description: string;
    category: string;
    max_level: number;
    steam_achievement_id: string | null;
  };
  monsters: SlayerMonster[];
}

export const load: PageServerLoad = (): SlayerPageData => {
  const db = new Database("static/compendium.db", { readonly: true });

  const profession = db
    .prepare(
      `
    SELECT
      id,
      name,
      description,
      category,
      max_level,
      steam_achievement_id
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
      m.level,
      m.is_boss,
      m.is_elite
    FROM monsters m
    WHERE (m.is_boss = 1 OR m.is_elite = 1) AND m.is_dummy = 0
    ORDER BY m.level, m.name
  `,
    )
    .all() as SlayerMonster[];

  db.close();

  return { profession, monsters };
};

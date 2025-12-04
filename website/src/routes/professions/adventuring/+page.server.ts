import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";

export const prerender = true;

interface AdventurerQuest {
  id: string;
  name: string;
  level_required: number;
  level_recommended: number;
}

interface AdventuringPageData {
  profession: {
    id: string;
    name: string;
    description: string;
    category: string;
    max_level: number;
    steam_achievement_id: string | null;
  };
  quests: AdventurerQuest[];
}

export const load: PageServerLoad = (): AdventuringPageData => {
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
    WHERE id = 'adventuring'
  `,
    )
    .get() as AdventuringPageData["profession"];

  const quests = db
    .prepare(
      `
    SELECT
      id,
      name,
      level_required,
      level_recommended
    FROM quests
    WHERE is_adventurer_quest = 1
    ORDER BY level_required, name
  `,
    )
    .all() as AdventurerQuest[];

  db.close();

  return { profession, quests };
};

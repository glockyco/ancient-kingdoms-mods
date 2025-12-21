import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";

export const prerender = true;

interface ProfessionListView {
  id: string;
  name: string;
  description: string;
  category: string;
  icon_path: string | null;
  max_level: number;
  tracking_type: string;
  tracking_denominator: number | null;
  steam_achievement_id: string | null;
  steam_achievement_name: string | null;
}

interface ProfessionsPageData {
  professions: ProfessionListView[];
}

export const load: PageServerLoad = (): ProfessionsPageData => {
  const db = new Database("static/compendium.db", { readonly: true });

  const professions = db
    .prepare(
      `
      SELECT
        id,
        name,
        description,
        category,
        icon_path,
        max_level,
        tracking_type,
        tracking_denominator,
        steam_achievement_id,
      steam_achievement_name
      FROM professions
      ORDER BY
        CASE category
          WHEN 'crafting' THEN 1
          WHEN 'gathering' THEN 2
          WHEN 'combat' THEN 3
          WHEN 'exploration' THEN 4
        END,
        name
    `,
    )
    .all() as ProfessionListView[];

  db.close();

  return { professions };
};

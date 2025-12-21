import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";

export const prerender = true;

interface TreasureMap {
  id: string;
  name: string;
  quality: number;
  tooltip_html: string | null;
}

interface TreasureHunterPageData {
  profession: {
    id: string;
    name: string;
    description: string;
    category: string;
    max_level: number;
    steam_achievement_id: string | null;
    steam_achievement_name: string | null;
  };
  treasureMaps: TreasureMap[];
}

export const load: PageServerLoad = (): TreasureHunterPageData => {
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
      steam_achievement_id,
      steam_achievement_name
    FROM professions
    WHERE id = 'treasure_hunter'
  `,
    )
    .get() as TreasureHunterPageData["profession"];

  const treasureMaps = db
    .prepare(
      `
    SELECT
      id,
      name,
      quality,
      tooltip_html
    FROM items
    WHERE treasure_map_reward_id IS NOT NULL
    ORDER BY quality DESC, name
  `,
    )
    .all() as TreasureMap[];

  db.close();

  return { profession, treasureMaps };
};

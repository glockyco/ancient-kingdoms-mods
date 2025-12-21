import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";

export const prerender = true;

interface LoreBook {
  id: string;
  name: string;
  quality: number;
  tooltip_html: string | null;
}

interface LoreKeepingPageData {
  profession: {
    id: string;
    name: string;
    description: string;
    category: string;
    tracking_type: string;
    tracking_denominator: number | null;
    steam_achievement_id: string | null;
    steam_achievement_name: string | null;
  };
  books: LoreBook[];
}

export const load: PageServerLoad = (): LoreKeepingPageData => {
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
      steam_achievement_id,
      steam_achievement_name
    FROM professions
    WHERE id = 'lore_keeping'
  `,
    )
    .get() as LoreKeepingPageData["profession"];

  const books = db
    .prepare(
      `
    SELECT
      id,
      name,
      quality,
      tooltip_html
    FROM items
    WHERE book_text IS NOT NULL AND book_text != ''
    ORDER BY name
  `,
    )
    .all() as LoreBook[];

  db.close();

  return { profession, books };
};

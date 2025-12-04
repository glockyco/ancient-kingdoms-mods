import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";

export const prerender = true;

interface HerbalismResource {
  id: string;
  name: string;
  level: number;
  tool_required_id: string | null;
  tool_required_name: string | null;
}

interface HerbalismPageData {
  profession: {
    id: string;
    name: string;
    description: string;
    category: string;
    max_level: number;
    steam_achievement_id: string | null;
  };
  resources: HerbalismResource[];
}

export const load: PageServerLoad = (): HerbalismPageData => {
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
    WHERE id = 'herbalism'
  `,
    )
    .get() as HerbalismPageData["profession"];

  const resources = db
    .prepare(
      `
    SELECT
      gr.id,
      gr.name,
      gr.level,
      gr.tool_required_id,
      i.name as tool_required_name
    FROM gathering_resources gr
    LEFT JOIN items i ON i.id = gr.tool_required_id
    WHERE gr.is_plant = 1
    ORDER BY gr.level, gr.name
  `,
    )
    .all() as HerbalismResource[];

  db.close();

  return { profession, resources };
};

import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";

export const prerender = true;

interface RadiantSparkResource {
  id: string;
  name: string;
  level: number;
}

interface RadiantSeekerPageData {
  profession: {
    id: string;
    name: string;
    description: string;
    category: string;
    max_level: number;
    steam_achievement_id: string | null;
    steam_achievement_name: string | null;
  };
  resources: RadiantSparkResource[];
}

export const load: PageServerLoad = (): RadiantSeekerPageData => {
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
    WHERE id = 'radiant_seeker'
  `,
    )
    .get() as RadiantSeekerPageData["profession"];

  const resources = db
    .prepare(
      `
    SELECT
      gr.id,
      gr.name,
      gr.level
    FROM gathering_resources gr
    WHERE gr.is_radiant_spark = 1
    ORDER BY gr.level, gr.name
  `,
    )
    .all() as RadiantSparkResource[];

  db.close();

  return { profession, resources };
};

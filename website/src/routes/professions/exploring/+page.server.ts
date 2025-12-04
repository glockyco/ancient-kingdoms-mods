import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";

export const prerender = true;

interface ExploringZone {
  id: string;
  name: string;
  is_dungeon: boolean;
  required_level: number;
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
  zones: ExploringZone[];
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

  const zones = db
    .prepare(
      `
    SELECT
      id,
      name,
      is_dungeon,
      required_level,
      discovery_exp
    FROM zones
    ORDER BY required_level, name
  `,
    )
    .all() as ExploringZone[];

  db.close();

  return { profession, zones };
};

import Database from "better-sqlite3";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import type { PageServerLoad } from "./$types";

export const prerender = true;

export const load: PageServerLoad = () => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });
  try {
    // Source: website/data/compendium.db:monsters — examples use real boss names and levels rather than hypothetical levels.
    const bossExamples = db
      .prepare(
        `
      SELECT id, name, level FROM monsters
      WHERE id IN ('the_archon', 'captain_kragek', 'valaark') AND is_boss = 1
      ORDER BY level
    `,
      )
      .all() as { id: string; name: string; level: number }[];
    return { bossExamples };
  } finally {
    db.close();
  }
};

import { getDb } from "$lib/db.server";
import type { PageServerLoad } from "./$types";

export const prerender = true;

export const load: PageServerLoad = () => {
  const db = getDb();

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
};

import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import { DB_STATIC_PATH } from "$lib/constants/constants";

export const prerender = true;

interface MiningResource {
  id: string;
  name: string;
  level: number;
  tool_required_id: string | null;
  tool_required_name: string | null;
}

interface TierCount {
  tier: number;
  count: number;
}

interface TierXp {
  tier: number;
  xp: number;
}

interface MiningPageData {
  profession: {
    id: string;
    name: string;
    description: string;
    category: string;
    max_level: number;
    steam_achievement_id: string | null;
    steam_achievement_name: string | null;
  };
  resources: MiningResource[];
  resourceCounts: TierCount[];
  xpByTier: TierXp[];
}

export const load: PageServerLoad = (): MiningPageData => {
  const db = new Database(DB_STATIC_PATH, { readonly: true });

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
    WHERE id = 'mining'
  `,
    )
    .get() as MiningPageData["profession"];

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
    WHERE gr.is_mineral = 1
    ORDER BY gr.level, gr.name
  `,
    )
    .all() as MiningResource[];

  // Get resource counts per tier
  const resourceCounts = db
    .prepare(
      `
    SELECT level as tier, COUNT(*) as count
    FROM gathering_resources
    WHERE is_mineral = 1
    GROUP BY level
    ORDER BY level
  `,
    )
    .all() as TierCount[];

  // Get XP per tier (gathering_exp is the same for all resources at the same level)
  const xpByTier = db
    .prepare(
      `
    SELECT level as tier, MAX(gathering_exp) as xp
    FROM gathering_resources
    WHERE is_mineral = 1
    GROUP BY level
    ORDER BY level
  `,
    )
    .all() as TierXp[];

  db.close();

  return { profession, resources, resourceCounts, xpByTier };
};

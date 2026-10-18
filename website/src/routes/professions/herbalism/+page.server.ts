import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import { loadAcquisition } from "$lib/server/acquisition";
import { loadAcquisitionItems } from "$lib/acquisition/items";
import { projectAcquisitionNames } from "$lib/acquisition/projections";

export const prerender = true;

interface HerbalismResource {
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

interface HerbalismPageData {
  profession: {
    id: string;
    name: string;
    description: string;
    category: string;
    max_level: number;
    achievement_id: string;
    achievement_name: string;
  };
  resources: HerbalismResource[];
  resourceCounts: TierCount[];
  xpByTier: TierXp[];
}

export const load: PageServerLoad = async () => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });

  const profession = db
    .prepare(
      `
    SELECT
      id,
      name,
      description,
      category,
      max_level,
      achievement_id,
      (SELECT name FROM achievements WHERE id = achievement_id) AS achievement_name
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

  // Get resource counts per tier
  const resourceCounts = db
    .prepare(
      `
    SELECT level as tier, COUNT(*) as count
    FROM gathering_resources
    WHERE is_plant = 1
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
    WHERE is_plant = 1
    GROUP BY level
    ORDER BY level
  `,
    )
    .all() as TierXp[];
  const execute = async (
    sql: string,
    values: readonly (string | number | null)[],
  ) => db.prepare(sql).all(...values) as Record<string, unknown>[];
  const spawns = db
    .prepare(
      "SELECT spawn.id FROM gathering_resource_spawns spawn JOIN gathering_resources resource ON resource.id = spawn.resource_id WHERE resource.is_plant = 1",
    )
    .all() as { id: string }[];
  const acquisition = await loadAcquisition(execute, {
    kind: "providers",
    providers: spawns.map(({ id }) => ({ kind: "resource_spawns", id })),
  });
  const acquisitionMethods = [...acquisition.methodViews.values()];
  const acquisitionItems = await loadAcquisitionItems(execute, acquisition);

  db.close();

  return {
    profession,
    resources,
    resourceCounts,
    xpByTier,
    acquisitionMethods,
    acquisitionItems,
    acquisitionNames: projectAcquisitionNames(acquisition),
  };
};

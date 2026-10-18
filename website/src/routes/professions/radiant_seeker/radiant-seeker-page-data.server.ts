import Database from "better-sqlite3";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import { loadAcquisition } from "$lib/server/acquisition";
import { loadAcquisitionItems } from "$lib/acquisition/items";
import type { MethodView } from "$lib/acquisition/types";
import type { DisplayItems } from "$lib/components/acquisition/display";
import { projectAcquisitionNames } from "$lib/acquisition/projections";
import {
  summarizePrimaryRewards,
  type PrimaryReward,
} from "$lib/utils/primary-rewards";

interface SparkZone {
  zone_id: string;
  zone_name: string;
  node_count: number;
}

interface RadiantSparkResource {
  id: string;
  name: string;
  description: string;
  gathering_exp: number | null;
  primaryRewards: readonly PrimaryReward[];
  node_count: number;
  zones: SparkZone[];
}

export interface RadiantSeekerPageData {
  profession: {
    id: string;
    name: string;
    description: string;
    category: string;
    max_level: number;
    achievement_id: string;
    achievement_name: string;
  };
  resource: RadiantSparkResource;
  recipe_count: number;
  acquisitionMethods: readonly MethodView[];
  acquisitionItems: DisplayItems;
  acquisitionNames: Readonly<Record<string, string>>;
}

export async function getRadiantSeekerPageData(
  dbPath = DB_SOURCE_PATH,
): Promise<RadiantSeekerPageData> {
  const db = new Database(dbPath, { readonly: true });

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
      WHERE id = 'radiant_seeker'
    `,
    )
    .get() as RadiantSeekerPageData["profession"];

  const rawResource = db
    .prepare(
      `
      SELECT
        gr.id,
        gr.name,
        gr.description,
        gr.gathering_exp
      FROM gathering_resources gr
      WHERE gr.is_radiant_spark = 1
    `,
    )
    .get() as Omit<
    RadiantSparkResource,
    "node_count" | "zones" | "primaryRewards"
  >;

  const zones = db
    .prepare(
      `
      SELECT
        z.id AS zone_id,
        z.name AS zone_name,
        COUNT(*) AS node_count
      FROM gathering_resource_spawns spawn
      JOIN zones z ON z.id = spawn.zone_id
      WHERE spawn.resource_id = ?
      GROUP BY z.id, z.name
      ORDER BY node_count DESC, z.name
    `,
    )
    .all(rawResource.id) as SparkZone[];

  const execute = async (
    sql: string,
    values: readonly (string | number | null)[],
  ) => db.prepare(sql).all(...values) as Record<string, unknown>[];
  const spawns = db
    .prepare("SELECT id FROM gathering_resource_spawns WHERE resource_id = ?")
    .all(rawResource.id) as { id: string }[];
  const acquisition = await loadAcquisition(execute, {
    kind: "providers",
    providers: spawns.map(({ id }) => ({ kind: "resource_spawns", id })),
  });
  const acquisitionMethods = [...acquisition.methodViews.values()];
  const acquisitionItems = await loadAcquisitionItems(execute, acquisition);
  const primaryRewards = summarizePrimaryRewards(
    acquisitionMethods,
    acquisitionItems,
  );
  const rewardIds = [
    ...new Set(
      primaryRewards.flatMap((reward) =>
        reward.itemId ? [reward.itemId] : [],
      ),
    ),
  ];
  const recipeCount = db
    .prepare(
      `
    SELECT COUNT(DISTINCT detail.id) AS count
    FROM acquisition_inputs input
    JOIN acquisition_cost_groups cost ON cost.id = input.cost_group_id
    JOIN acquisition_recipe_details detail ON detail.id = cost.method_id
    WHERE input.item_id IN (SELECT value FROM json_each(?)) AND input.withheld = 0
  `,
    )
    .get(JSON.stringify(rewardIds)) as { count: number };

  db.close();

  return {
    profession,
    resource: {
      ...rawResource,
      primaryRewards,
      zones,
      node_count: zones.reduce((total, zone) => total + zone.node_count, 0),
    },
    recipe_count: recipeCount.count,
    acquisitionMethods,
    acquisitionItems,
    acquisitionNames: projectAcquisitionNames(acquisition),
  };
}

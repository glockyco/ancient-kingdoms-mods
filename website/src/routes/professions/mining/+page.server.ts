import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import { getItemIconPaths } from "$lib/server/item-icon-paths";
import { loadItemAcquisition, loadAcquisition } from "$lib/server/acquisition";
import { loadAcquisitionItems } from "$lib/acquisition/items";
import type { MethodView } from "$lib/acquisition/types";
import type { DisplayItems } from "$lib/components/acquisition/display";
import {
  summarizePrimaryRewards,
  type PrimaryReward,
} from "$lib/utils/primary-rewards";
import {
  BASELINE_ASSUMPTIONS,
  calculateMethodProbabilities,
} from "$lib/acquisition/rules";
import { projectAcquisitionNames } from "$lib/acquisition/projections";

export const prerender = true;

interface OreZone {
  zone_id: string;
  zone_name: string;
  node_count: number;
}

interface OreGem {
  item_id: string;
  item_name: string;
  tooltip_html: string | null;
  probabilities: readonly (number | null)[];
}

interface MiningOre {
  id: string;
  name: string;
  tier: number;
  respawn_time: number;
  gathering_exp: number | null;
  primaryRewards: readonly PrimaryReward[];
  node_count: number;
  zones: OreZone[];
  gems: OreGem[];
  gemProbabilities: readonly (number | null)[];
  recipe_count: number;
}

interface Pickaxe {
  id: string;
  name: string;
  quality: number;
  tooltip_html: string | null;
  sources: readonly MethodView[];
  min_source_level: number | null;
}

interface OreQuest {
  quest_id: string;
  quest_name: string;
  ore_id: string;
  ore_name: string;
  amount: number;
  purpose: string;
  level_recommended: number;
}

interface OreVendor {
  npc_id: string;
  npc_name: string;
  ore_name: string;
}

interface MiningPageData {
  profession: {
    id: string;
    name: string;
    description: string;
    category: string;
    max_level: number;
    achievement_id: string;
    achievement_name: string;
  };
  ores: MiningOre[];
  pickaxes: Pickaxe[];
  quests: OreQuest[];
  vendors: OreVendor[];
  itemIconPaths: Record<string, string | null>;
  acquisitionItems: DisplayItems;
  acquisitionNames: Readonly<Record<string, string>>;
  oreMethods: readonly MethodView[];
  totalNodes: number;
}

interface RawOre {
  id: string;
  name: string;
  tier: number;
  respawn_time: number;
  gathering_exp: number | null;
}

export const load: PageServerLoad = async (): Promise<MiningPageData> => {
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
    WHERE id = 'mining'
  `,
    )
    .get() as MiningPageData["profession"];

  const rawOres = db
    .prepare(
      `
    SELECT
      gr.id,
      gr.name,
      gr.level AS tier,
      gr.respawn_time,
      gr.gathering_exp
    FROM gathering_resources gr
    WHERE gr.is_mineral = 1
    ORDER BY gr.level
  `,
    )
    .all() as RawOre[];
  const mineralSpawns = db
    .prepare(
      "SELECT spawn.id FROM gathering_resource_spawns spawn JOIN gathering_resources resource ON resource.id = spawn.resource_id WHERE resource.is_mineral = 1",
    )
    .all() as { id: string }[];
  const oreAcquisition = await loadAcquisition(
    async (sql, params) =>
      db.prepare(sql).all(...params) as Record<string, unknown>[],
    {
      kind: "providers",
      providers: mineralSpawns.map(({ id }) => ({
        kind: "resource_spawns",
        id,
      })),
    },
  );

  const zoneStatement = db.prepare(
    `
    SELECT
      z.id AS zone_id,
      z.name AS zone_name,
      COUNT(*) AS node_count
    FROM gathering_resource_spawns s
    JOIN zones z ON z.id = s.zone_id
    WHERE s.resource_id = ?
    GROUP BY z.id, z.name
    ORDER BY node_count DESC, z.name
  `,
  );

  const recipeCountStatement = db.prepare(
    `
    SELECT COUNT(DISTINCT detail.id) AS count
    FROM acquisition_inputs input
    JOIN acquisition_cost_groups cost ON cost.id = input.cost_group_id
    JOIN acquisition_recipe_details detail ON detail.id = cost.method_id
    WHERE input.item_id IN (SELECT value FROM json_each(?)) AND input.withheld = 0
  `,
  );

  const oreItems = await loadAcquisitionItems(
    async (sql, params) =>
      db.prepare(sql).all(...params) as Record<string, unknown>[],
    oreAcquisition,
  );
  const methodsByResource = new Map<string, MethodView[]>();
  for (const method of oreAcquisition.methodViews.values()) {
    if (
      method.kind !== "gather" ||
      typeof method.detail.resource_id !== "string"
    )
      continue;
    const list = methodsByResource.get(method.detail.resource_id) ?? [];
    list.push(method);
    methodsByResource.set(method.detail.resource_id, list);
  }
  const gemOutcomesByMethod = new Map(
    [...oreAcquisition.methodViews.values()].map((method) => {
      const row = oreAcquisition.methods.get(method.methodId);
      if (!row) throw new Error(`Missing mineral method ${method.methodId}`);
      return [
        method.methodId,
        calculateMethodProbabilities(oreAcquisition.rows, row, method.detail, {
          assumptions: {
            ...BASELINE_ASSUMPTIONS,
            scenario: "entered",
            professionFraction: 1,
            toolQuality: 4,
          },
        }),
      ] as const;
    }),
  );
  const ores: MiningOre[] = rawOres.map((ore) => {
    const methods = methodsByResource.get(ore.id) ?? [];
    const primaryRewards = summarizePrimaryRewards(methods, oreItems);
    const primaryIds = new Set(
      primaryRewards.flatMap((reward) =>
        reward.itemId ? [reward.itemId] : [],
      ),
    );
    const zones = zoneStatement.all(ore.id) as OreZone[];
    const recipeCount = recipeCountStatement.get(
      JSON.stringify([...primaryIds]),
    ) as { count: number };
    const gemIds = new Set(
      methods.flatMap((method) =>
        (gemOutcomesByMethod.get(method.methodId) ?? []).flatMap((result) =>
          result.target.kind === "item" && !primaryIds.has(result.target.itemId)
            ? [result.target.itemId]
            : [],
        ),
      ),
    );
    const probability = (method: MethodView, itemId: string) => {
      const outcomes = (gemOutcomesByMethod.get(method.methodId) ?? []).filter(
        (result) =>
          result.target.kind === "item" &&
          result.target.itemId === itemId &&
          result.event === "attempt",
      );
      if (!outcomes.length) return 0;
      return outcomes.some((result) => result.probability === null)
        ? null
        : outcomes.reduce((sum, result) => sum + result.probability!, 0);
    };
    const gems: OreGem[] = [...gemIds]
      .map((itemId) => {
        const item = oreItems[itemId];
        if (!item) throw new Error(`Missing mineral outcome item ${itemId}`);
        return {
          item_id: itemId,
          item_name: item.name,
          tooltip_html: item.tooltip_html,
          probabilities: [
            ...new Set(methods.map((method) => probability(method, itemId))),
          ],
        };
      })
      .sort((a, b) => a.item_name.localeCompare(b.item_name));
    const gemProbabilities = [
      ...new Set(
        methods.map((method) => {
          const values = gems.map((gem) => probability(method, gem.item_id));
          return values.some((value) => value === null)
            ? null
            : values.reduce<number>((sum, value) => sum + value!, 0);
        }),
      ),
    ];
    return {
      ...ore,
      primaryRewards,
      zones,
      node_count: zones.reduce((total, zone) => total + zone.node_count, 0),
      gems,
      gemProbabilities,
      recipe_count: recipeCount.count,
    };
  });

  const rawPickaxes = db
    .prepare(
      `
    SELECT id, name, quality, tooltip_html
    FROM items
    WHERE weapon_category = 'Pickaxe'
    ORDER BY quality
  `,
    )
    .all() as Omit<Pickaxe, "sources" | "min_source_level">[];

  const pickaxeAcquisition = await loadItemAcquisition(
    async (sql, params) =>
      db.prepare(sql).all(...params) as Record<string, unknown>[],
    rawPickaxes.map((pickaxe) => pickaxe.id),
  );
  const pickaxes: Pickaxe[] = rawPickaxes.map((pickaxe) => ({
    ...pickaxe,
    sources: pickaxeAcquisition.sources[pickaxe.id].methods,
    min_source_level: pickaxeAcquisition.sources[pickaxe.id].sourceLevelHint,
  }));
  const acquisitionItems = await loadAcquisitionItems(
    async (sql, params) =>
      db.prepare(sql).all(...params) as Record<string, unknown>[],
    pickaxeAcquisition.model,
  );
  Object.assign(
    acquisitionItems,
    await loadAcquisitionItems(
      async (sql, params) =>
        db.prepare(sql).all(...params) as Record<string, unknown>[],
      oreAcquisition,
    ),
  );

  const quests = db
    .prepare(
      `
    SELECT
      objective.quest_id,
      q.name AS quest_name,
      item.item_id AS ore_id,
      i.name AS ore_name,
      objective.amount,
      objective.role AS purpose,
      q.level_recommended
    FROM quest_objectives objective
    JOIN quest_objective_items item ON item.id = objective.id
    JOIN quests q ON q.id = objective.quest_id
    JOIN items i ON i.id = item.item_id
    WHERE objective.withheld = 0
      AND item.item_id IN (SELECT output.item_id FROM acquisition_outputs output JOIN acquisition_resource_details d ON d.id = output.method_id JOIN gathering_resources gr ON gr.id = d.resource_id WHERE gr.is_mineral = 1 AND output.yield_rule != 'pool' AND output.withheld = 0)
    ORDER BY q.level_recommended, q.name
  `,
    )
    .all() as OreQuest[];

  const vendors = db
    .prepare(
      `
    SELECT
      n.id AS npc_id,
      n.name AS npc_name,
      i.name AS ore_name
    FROM acquisition_vendor_details detail
    JOIN acquisition_providers_npcs provider ON provider.method_id = detail.id
    JOIN npcs n ON n.id = provider.npc_id
    JOIN items i ON i.id = detail.offered_item_id
    WHERE i.id IN (SELECT output.item_id FROM acquisition_outputs output JOIN acquisition_resource_details d ON d.id = output.method_id JOIN gathering_resources gr ON gr.id = d.resource_id WHERE gr.is_mineral = 1 AND output.yield_rule != 'pool' AND output.withheld = 0)
    ORDER BY n.name, i.name
  `,
    )
    .all() as OreVendor[];

  const itemIconPaths = getItemIconPaths(db, [
    ...pickaxes.map((pickaxe) => pickaxe.id),
    ...ores.flatMap((ore) => ore.gems.map((gem) => gem.item_id)),
  ]);
  db.close();

  return {
    profession,
    ores,
    pickaxes,
    acquisitionItems,
    acquisitionNames: {
      ...projectAcquisitionNames(oreAcquisition),
      ...projectAcquisitionNames(pickaxeAcquisition.model),
    },
    oreMethods: [...oreAcquisition.methodViews.values()],
    itemIconPaths,
    quests,
    vendors,
    totalNodes: ores.reduce((total, ore) => total + ore.node_count, 0),
  };
};

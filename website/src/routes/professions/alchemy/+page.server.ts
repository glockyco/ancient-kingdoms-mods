import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import type {
  AcquisitionQuery,
  RequirementRoot,
  MethodView,
  AcquisitionRows,
} from "$lib/acquisition/types";
import { loadAcquisition } from "$lib/server/acquisition";
import {
  loadAcquisitionItems,
  type AcquisitionItem,
} from "$lib/acquisition/items";
import { getItemIconPaths } from "$lib/server/item-icon-paths";
import { projectAcquisitionNames } from "$lib/acquisition/projections";
import { combine } from "$lib/acquisition/conditions";

export const prerender = true;

interface AlchemyRecipe {
  id: string;
  recipe_id: string;
  result_item_id: string;
  result_amount: number;
  result_item_name: string;
  result_tooltip_html: string | null;
  result_quality: number;
  level_required: number;
  alchemy_exp: number;
  methods: readonly MethodView[];
}

interface StationLocation {
  id: string;
  zone_id: string;
  zone_name: string;
  sub_zone_name: string | null;
}

interface QuestItem {
  item_id: string;
  item_name: string;
  tooltip_html: string | null;
  amount: number;
}

interface QuestNpc {
  npc_id: string;
  npc_name: string;
}

interface AlchemyQuest {
  id: string;
  name: string;
  display_type: string;
  level_required: number;
  level_recommended: number;
  is_main_quest: boolean;
  is_epic_quest: boolean;
  is_adventurer_quest: boolean;
  is_repeatable: boolean;
  objectives: readonly RequirementRoot[];
  conditions: readonly RequirementRoot[];
  completion_npcs: QuestNpc[];
  reward_items: QuestItem[];
  reward_exp: number;
  reward_gold: number;
  reward_alchemy_skill: number;
}

function questRequirementSections(
  questId: string,
  roots: readonly RequirementRoot[],
): Pick<AlchemyQuest, "objectives" | "conditions"> {
  const objectives = roots.filter((root) => root.phase === "fulfill");
  const fulfilled = new Set(
    objectives.flatMap((root) =>
      (root.expression.kind === "all"
        ? root.expression.operands
        : [root.expression]
      ).map((expression) => JSON.stringify(expression)),
    ),
  );
  const conditions: RequirementRoot[] = [];
  for (const root of roots) {
    if (root.phase === "fulfill") continue;
    const operands =
      root.expression.kind === "all"
        ? root.expression.operands
        : [root.expression];
    const distinct = operands.filter(
      (expression) =>
        !fulfilled.has(JSON.stringify(expression)) &&
        !(
          expression.kind === "predicate" &&
          expression.predicate.kind === "quest_state" &&
          expression.predicate.questId === questId
        ),
    );
    if (distinct.length) {
      conditions.push({ ...root, expression: combine("all", distinct) });
    }
  }
  return { objectives, conditions };
}

interface TierCount {
  tier: number;
  count: number;
}

interface TierXp {
  tier: number;
  xp: number;
}

interface AlchemyPageData {
  profession: {
    id: string;
    name: string;
    description: string;
    category: string;
    max_level: number;
    achievement_id: string;
    achievement_name: string;
  };
  recipes: AlchemyRecipe[];
  locations: StationLocation[];
  acquisitionItems: Record<string, AcquisitionItem>;
  acquisitionRows: AcquisitionRows;
  acquisitionNames: Readonly<Record<string, string>>;
  quests: AlchemyQuest[];
  itemIconPaths: Record<string, string | null>;
  recipeCounts: TierCount[];
  xpByTier: TierXp[];
}

export const load: PageServerLoad = async (): Promise<AlchemyPageData> => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });
  const execute: AcquisitionQuery = async (sql, params) =>
    db.prepare(sql).all(...params) as Record<string, unknown>[];

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
    WHERE id = 'alchemy'
  `,
    )
    .get() as AlchemyPageData["profession"];

  const rawRecipes = db
    .prepare(
      `
    SELECT
      d.id,
      ar.id as recipe_id,
      ar.result_item_id,
      d.result_amount,
      i.name as result_item_name,
      i.tooltip_html as result_tooltip_html,
      i.quality as result_quality,
      d.tier as level_required,
      d.experience as alchemy_exp
    FROM alchemy_recipes ar
    JOIN acquisition_recipe_details d ON d.alchemy_recipe_id = ar.id
    JOIN items i ON i.id = ar.result_item_id
    ORDER BY level_required, i.name
  `,
    )
    .all() as Omit<AlchemyRecipe, "methods">[];

  const recipeModel = await loadAcquisition(execute, {
    kind: "recipes",
    recipeIds: rawRecipes.map((recipe) => recipe.recipe_id),
  });
  const recipes: AlchemyRecipe[] = rawRecipes.map((recipe) => {
    const method = recipeModel.methodViews.get(recipe.id);
    if (!method) throw new Error(`Missing alchemy method ${recipe.id}`);
    return { ...recipe, methods: [method] };
  });
  const acquisitionItems = await loadAcquisitionItems(execute, recipeModel);

  const locations = db
    .prepare(
      `
    SELECT DISTINCT s.id, s.zone_id, s.zone_name, s.sub_zone_name
    FROM alchemy_tables s
    JOIN acquisition_providers_alchemy_tables p ON p.alchemy_table_id = s.id
    JOIN acquisition_recipe_details d ON d.id = p.method_id
    ORDER BY s.zone_name, s.sub_zone_name
  `,
    )
    .all() as StationLocation[];

  const questRows = db
    .prepare(
      `
    WITH RECURSIVE chain(id) AS (
      SELECT id FROM quests WHERE id = 'the_alchemist_apprentice_i'
      UNION
      SELECT p.quest_id FROM quest_predecessors p JOIN chain c ON p.predecessor_quest_id = c.id
    )
    SELECT q.* FROM quests q JOIN chain c ON c.id = q.id
    ORDER BY q.level_recommended, q.name, q.id
  `,
    )
    .all() as Record<string, unknown>[];
  const questModel = await loadAcquisition(execute, {
    kind: "requirements",
    entities: questRows.map((q) => ({ kind: "quest", id: String(q.id) })),
  });
  const questRowsById = new Map(
    questRows.map((quest) => [String(quest.id), quest]),
  );
  const predecessors = new Map<string, string[]>();
  for (const edge of questModel.rows.facts.quest_predecessors ?? []) {
    if (typeof edge.predecessor_quest_id !== "string") continue;
    const questId = String(edge.quest_id);
    const targets = predecessors.get(questId) ?? [];
    targets.push(edge.predecessor_quest_id);
    predecessors.set(questId, targets);
  }
  const orderedQuestRows: Record<string, unknown>[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  function visitQuest(quest: Record<string, unknown>): void {
    const id = String(quest.id);
    if (visited.has(id)) return;
    if (visiting.has(id))
      throw new Error(`Cyclic alchemy quest chain at ${id}`);
    visiting.add(id);
    for (const predecessorId of predecessors.get(id) ?? []) {
      const predecessor = questRowsById.get(predecessorId);
      if (predecessor) visitQuest(predecessor);
    }
    visiting.delete(id);
    visited.add(id);
    orderedQuestRows.push(quest);
  }
  for (const quest of questRows) visitQuest(quest);
  const rewardItems = db.prepare(`
    SELECT i.id as item_id, i.name as item_name, i.tooltip_html, r.amount
    FROM quest_reward_slots r JOIN items i ON i.id = r.item_id
    WHERE r.quest_id = ? ORDER BY r.ordinal
  `);
  const completionNpcs = db.prepare(`
    SELECT n.id as npc_id, n.name as npc_name FROM npc_quest_memberships m
    JOIN npcs n ON n.id = m.npc_id WHERE m.quest_id = ? AND m.role = 'complete'
    ORDER BY m.ordinal, n.id
  `);
  const quests: AlchemyQuest[] = orderedQuestRows.map((q) => ({
    id: String(q.id),
    name: String(q.name),
    display_type: String(q.display_type),
    level_required: Number(q.level_required),
    level_recommended: Number(q.level_recommended),
    is_main_quest: Boolean(q.is_main_quest),
    is_epic_quest: Boolean(q.is_epic_quest),
    is_adventurer_quest: Boolean(q.is_adventurer_quest),
    is_repeatable: Boolean(q.is_repeatable),
    completion_npcs: completionNpcs.all(q.id) as QuestNpc[],
    reward_items: rewardItems.all(q.id) as QuestItem[],
    reward_exp: Number(q.reward_experience),
    reward_gold: Number(q.reward_gold),
    reward_alchemy_skill: Number(q.increase_alchemy_skill),
    ...questRequirementSections(
      String(q.id),
      questModel.requirements.get(`quest:${String(q.id)}`) ?? [],
    ),
  }));

  // Get recipe counts per tier
  const recipeCounts = db
    .prepare(
      `
    SELECT tier, COUNT(*) as count
    FROM acquisition_recipe_details WHERE display_kind = 'alchemy'
    GROUP BY tier ORDER BY tier
  `,
    )
    .all() as TierCount[];

  // Get XP per tier (all recipes in a tier share the same alchemy_exp)
  const xpByTier = db
    .prepare(
      `
    SELECT tier, MAX(experience) as xp
    FROM acquisition_recipe_details WHERE display_kind = 'alchemy'
    GROUP BY tier ORDER BY tier
  `,
    )
    .all() as TierXp[];

  const itemIconPaths = getItemIconPaths(
    db,
    quests.flatMap((quest) => [
      ...quest.reward_items.map((item) => item.item_id),
    ]),
  );
  db.close();

  return {
    profession,
    recipes,
    locations,
    acquisitionItems,
    acquisitionRows: recipeModel.rows,
    acquisitionNames: Object.assign(
      {},
      projectAcquisitionNames(recipeModel),
      projectAcquisitionNames(questModel),
    ),
    quests,
    itemIconPaths,
    recipeCounts,
    xpByTier,
  };
};

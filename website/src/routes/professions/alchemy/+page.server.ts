import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import {
  getRecipeDefinitions,
  buildRecipeObtainabilityTree,
} from "$lib/server/obtainability";
import { getItemIconPaths } from "$lib/server/item-icon-paths";

export const prerender = true;

interface QuestItem {
  item_id: string;
  item_name: string;
  tooltip_html: string | null;
  amount: number;
  quality: number | null;
}

export const load: PageServerLoad = async () => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });
  try {
    const profession = db
      .prepare(
        `SELECT p.*, a.name AS achievement_name FROM professions p
      LEFT JOIN achievements a ON a.id=p.achievement_id WHERE p.id='alchemy'`,
      )
      .get() as {
      id: string;
      name: string;
      description: string;
      category: string;
      max_level: number;
      achievement_id: string;
      achievement_name: string;
    };
    const routes = db.prepare("SELECT id FROM alchemy_recipes").all() as {
      id: string;
    }[];
    const definitions = (
      await getRecipeDefinitions(
        db,
        routes.map((r) => r.id),
      )
    ).filter((d) => d.type === "Alchemy");
    const recipes = [];
    for (const definition of definitions) {
      recipes.push({
        id: definition.method_id,
        result_item_id: definition.result_item_id,
        result_item_name: definition.result_item_name,
        result_tooltip_html: definition.result_tooltip_html,
        result_quality: definition.result_quality,
        level_required: definition.tier,
        alchemy_exp: definition.xp,
        obtainabilityTree: await buildRecipeObtainabilityTree(db, definition),
      });
    }
    recipes.sort(
      (a, b) =>
        a.level_required - b.level_required ||
        a.result_item_name.localeCompare(b.result_item_name),
    );
    const locations = db
      .prepare(
        `SELECT DISTINCT s.id, s.zone_id, s.zone_name, s.sub_zone_name
      FROM alchemy_tables s JOIN acquisition_providers_alchemy_tables p ON p.alchemy_table_id=s.id
      JOIN acquisition_recipe_details d ON d.id=p.method_id WHERE d.display_kind='alchemy'
      ORDER BY s.zone_name, s.sub_zone_name`,
      )
      .all() as {
      id: string;
      zone_id: string;
      zone_name: string;
      sub_zone_name: string | null;
    }[];
    const questRows = db
      .prepare(
        `WITH RECURSIVE chain(id) AS (
      SELECT id FROM quests WHERE id='the_alchemist_apprentice_i'
      UNION SELECT p.quest_id FROM quest_predecessors p JOIN chain c ON p.predecessor_quest_id=c.id
    ) SELECT q.* FROM quests q JOIN chain c ON c.id=q.id ORDER BY q.level_recommended, q.name, q.id`,
      )
      .all() as {
      id: string;
      name: string;
      display_type: string;
      level_required: number;
      level_recommended: number;
      is_main_quest: number;
      is_epic_quest: number;
      is_adventurer_quest: number;
      is_repeatable: number;
      reward_experience: number;
      reward_gold: number;
      increase_alchemy_skill: number;
    }[];
    const predecessorRows = db
      .prepare(
        `SELECT quest_id, predecessor_quest_id FROM quest_predecessors WHERE predecessor_quest_id IS NOT NULL`,
      )
      .all() as { quest_id: string; predecessor_quest_id: string }[];
    const byId = new Map(questRows.map((q) => [q.id, q]));
    const ordered: typeof questRows = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    function visit(quest: (typeof questRows)[number]) {
      if (visited.has(quest.id)) return;
      if (visiting.has(quest.id))
        throw new Error(`Cyclic alchemy quest chain at ${quest.id}`);
      visiting.add(quest.id);
      for (const edge of predecessorRows) {
        const predecessor =
          edge.quest_id === quest.id
            ? byId.get(edge.predecessor_quest_id)
            : undefined;
        if (predecessor) visit(predecessor);
      }
      visiting.delete(quest.id);
      visited.add(quest.id);
      ordered.push(quest);
    }
    questRows.forEach(visit);
    const objectiveItems = db.prepare(`SELECT COALESCE(i.id,'') AS item_id,
      COALESCE(i.name,'Unpublished item') AS item_name, i.tooltip_html, i.quality, o.amount
      FROM quest_objectives o JOIN quest_objective_items t ON t.id=o.id
      LEFT JOIN items i ON i.id=t.item_id WHERE o.quest_id=? ORDER BY o.ordinal`);
    const brewItems = db.prepare(`SELECT COALESCE(i.id,'') AS item_id,
      COALESCE(i.name,'Unpublished item') AS item_name, i.tooltip_html, i.quality, o.amount
      FROM quest_objectives o JOIN quest_objective_brews t ON t.id=o.id
      LEFT JOIN items i ON i.id=t.item_id WHERE o.quest_id=? ORDER BY o.ordinal`);
    const rewardItems = db.prepare(`SELECT COALESCE(i.id,'') AS item_id,
      COALESCE(i.name,'Unpublished item') AS item_name, i.tooltip_html, i.quality, r.amount
      FROM quest_reward_slots r LEFT JOIN items i ON i.id=r.item_id
      WHERE r.quest_id=? ORDER BY r.ordinal`);
    const completionNpcs = db.prepare(`SELECT n.id AS npc_id, n.name AS npc_name
      FROM npc_quest_memberships m JOIN npcs n ON n.id=m.npc_id
      WHERE m.quest_id=? AND m.role='complete' ORDER BY m.ordinal, n.id`);
    const quests = ordered.map((q) => ({
      id: q.id,
      name: q.name,
      display_type: q.display_type,
      level_required: q.level_required,
      level_recommended: q.level_recommended,
      is_main_quest: Boolean(q.is_main_quest),
      is_epic_quest: Boolean(q.is_epic_quest),
      is_adventurer_quest: Boolean(q.is_adventurer_quest),
      is_repeatable: Boolean(q.is_repeatable),
      objective_items: objectiveItems.all(q.id) as QuestItem[],
      potion_to_brew: (brewItems.all(q.id) as QuestItem[])[0] ?? null,
      npc_to_find:
        (
          completionNpcs.all(q.id) as { npc_id: string; npc_name: string }[]
        )[0] ?? null,
      reward_items: (rewardItems.all(q.id) as QuestItem[]).filter(
        (item) => item.item_id,
      ),
      reward_exp: q.reward_experience,
      reward_gold: q.reward_gold,
      reward_alchemy_skill: q.increase_alchemy_skill,
    }));
    const recipeCounts = db
      .prepare(
        `SELECT tier, COUNT(*) AS count FROM acquisition_recipe_details
      WHERE display_kind='alchemy' GROUP BY tier ORDER BY tier`,
      )
      .all() as { tier: number; count: number }[];
    const xpByTier = db
      .prepare(
        `SELECT tier, MAX(experience) AS xp FROM acquisition_recipe_details
      WHERE display_kind='alchemy' GROUP BY tier ORDER BY tier`,
      )
      .all() as { tier: number; xp: number }[];
    const itemIconPaths = getItemIconPaths(
      db,
      quests.flatMap((q) =>
        [
          ...q.objective_items,
          ...(q.potion_to_brew ? [q.potion_to_brew] : []),
          ...q.reward_items,
        ]
          .map((i) => i.item_id)
          .filter(Boolean),
      ),
    );
    return {
      profession,
      recipes,
      locations,
      quests,
      itemIconPaths,
      recipeCounts,
      xpByTier,
    };
  } finally {
    db.close();
  }
};

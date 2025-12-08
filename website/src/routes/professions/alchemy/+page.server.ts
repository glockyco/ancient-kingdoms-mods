import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import type { ObtainabilityNode } from "$lib/types/recipes";
import { buildObtainabilityTree } from "$lib/server/obtainability";

export const prerender = true;

interface AlchemyRecipe {
  id: string;
  result_item_id: string;
  result_item_name: string;
  result_tooltip_html: string | null;
  result_quality: number;
  level_required: number;
  obtainabilityTree: ObtainabilityNode;
}

interface StationLocation {
  zone_id: string;
  zone_name: string;
  sub_zone_name: string | null;
  position_x: number;
  position_y: number;
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
  objective_items: QuestItem[];
  potion_to_brew: QuestItem | null;
  npc_to_find: QuestNpc | null;
  reward_items: QuestItem[];
  reward_exp: number;
  reward_gold: number;
  reward_alchemy_skill: number;
}

interface TierCount {
  tier: number;
  count: number;
}

interface AlchemyPageData {
  profession: {
    id: string;
    name: string;
    description: string;
    category: string;
    max_level: number;
    steam_achievement_id: string | null;
  };
  recipes: AlchemyRecipe[];
  locations: StationLocation[];
  quests: AlchemyQuest[];
  recipeCounts: TierCount[];
}

export const load: PageServerLoad = (): AlchemyPageData => {
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
      steam_achievement_id
    FROM professions
    WHERE id = 'alchemy'
  `,
    )
    .get() as AlchemyPageData["profession"];

  const rawRecipes = db
    .prepare(
      `
    SELECT
      ar.id,
      ar.result_item_id,
      i.name as result_item_name,
      i.tooltip_html as result_tooltip_html,
      i.quality as result_quality,
      ar.level_required
    FROM alchemy_recipes ar
    JOIN items i ON i.id = ar.result_item_id
    ORDER BY ar.level_required, i.name
  `,
    )
    .all() as Omit<AlchemyRecipe, "obtainabilityTree">[];

  const recipes: AlchemyRecipe[] = rawRecipes.map((recipe) => {
    const visited = new Set<string>();
    const obtainabilityTree = buildObtainabilityTree(
      db,
      recipe.result_item_id,
      1,
      0,
      visited,
      true,
    );
    return { ...recipe, obtainabilityTree };
  });

  const locations = db
    .prepare(
      `
    SELECT zone_id, zone_name, sub_zone_name, position_x, position_y
    FROM alchemy_tables
    ORDER BY zone_name, sub_zone_name
  `,
    )
    .all() as StationLocation[];

  // Get alchemy quest line (walk the chain from the first quest)
  interface RawQuest {
    id: string;
    name: string;
    display_type: string;
    level_required: number;
    level_recommended: number;
    is_main_quest: number;
    is_epic_quest: number;
    is_adventurer_quest: number;
    gather_items: string | null;
    rewards: string | null;
    potion_item_id: string | null;
    potions_amount: number;
    end_npc_id: string | null;
    increase_alchemy_skill: number;
  }

  interface RawGatherItem {
    item_id: string;
    amount: number;
  }

  interface RawRewardItem {
    item_id: string;
    class_specific: string | null;
  }

  // Prepare lookup statements
  const getItem = db.prepare(`
    SELECT id, name, tooltip_html FROM items WHERE id = ?
  `);

  const getNpc = db.prepare(`
    SELECT id, name FROM npcs WHERE id = ?
  `);

  function lookupItems(
    rawItems: { item_id: string; amount?: number }[],
  ): QuestItem[] {
    return rawItems
      .map((raw) => {
        const item = getItem.get(raw.item_id) as {
          id: string;
          name: string;
          tooltip_html: string | null;
        } | null;
        if (!item) return null;
        return {
          item_id: item.id,
          item_name: item.name,
          tooltip_html: item.tooltip_html,
          amount: raw.amount ?? 1,
        };
      })
      .filter((item): item is QuestItem => item !== null);
  }

  function lookupPotion(
    itemId: string | null,
    amount: number,
  ): QuestItem | null {
    if (!itemId) return null;
    const item = getItem.get(itemId) as {
      id: string;
      name: string;
      tooltip_html: string | null;
    } | null;
    if (!item) return null;
    return {
      item_id: item.id,
      item_name: item.name,
      tooltip_html: item.tooltip_html,
      amount,
    };
  }

  function lookupNpc(npcId: string | null): QuestNpc | null {
    if (!npcId) return null;
    const npc = getNpc.get(npcId) as { id: string; name: string } | null;
    if (!npc) return null;
    return { npc_id: npc.id, npc_name: npc.name };
  }

  const quests: AlchemyQuest[] = [];
  let currentQuestId: string | null = "the_alchemist_apprentice_i";

  while (currentQuestId) {
    const rawQuest = db
      .prepare(
        `
      SELECT
        id,
        name,
        display_type,
        level_required,
        level_recommended,
        is_main_quest,
        is_epic_quest,
        is_adventurer_quest,
        gather_items,
        rewards,
        potion_item_id,
        potions_amount,
        end_npc_id,
        increase_alchemy_skill
      FROM quests
      WHERE id = ?
    `,
      )
      .get(currentQuestId) as RawQuest | undefined;

    if (!rawQuest) break;

    // Parse JSON fields
    const gatherItems: RawGatherItem[] = rawQuest.gather_items
      ? (JSON.parse(rawQuest.gather_items) as RawGatherItem[])
      : [];

    const rewards = rawQuest.rewards
      ? (JSON.parse(rawQuest.rewards) as {
          exp?: number;
          gold?: number;
          items?: RawRewardItem[];
        })
      : {};

    quests.push({
      id: rawQuest.id,
      name: rawQuest.name,
      display_type: rawQuest.display_type,
      level_required: rawQuest.level_required,
      level_recommended: rawQuest.level_recommended,
      is_main_quest: !!rawQuest.is_main_quest,
      is_epic_quest: !!rawQuest.is_epic_quest,
      is_adventurer_quest: !!rawQuest.is_adventurer_quest,
      objective_items: lookupItems(gatherItems),
      potion_to_brew: lookupPotion(
        rawQuest.potion_item_id,
        rawQuest.potions_amount,
      ),
      npc_to_find: lookupNpc(rawQuest.end_npc_id),
      reward_items: lookupItems(rewards.items ?? []),
      reward_exp: rewards.exp ?? 0,
      reward_gold: rewards.gold ?? 0,
      reward_alchemy_skill: rawQuest.increase_alchemy_skill,
    });

    // Find the next quest in the chain (quest that has this one as predecessor)
    const nextQuest = db
      .prepare(
        `
      SELECT id FROM quests
      WHERE json_extract(predecessor_ids, '$[0]') = ?
    `,
      )
      .get(currentQuestId) as { id: string } | undefined;

    currentQuestId = nextQuest?.id ?? null;
  }

  // Get recipe counts per tier
  const recipeCounts = db
    .prepare(
      `
    SELECT level_required as tier, COUNT(*) as count
    FROM alchemy_recipes
    GROUP BY level_required
    ORDER BY level_required
  `,
    )
    .all() as TierCount[];

  db.close();

  return { profession, recipes, locations, quests, recipeCounts };
};

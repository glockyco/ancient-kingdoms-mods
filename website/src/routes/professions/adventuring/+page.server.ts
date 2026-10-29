import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";

import { DB_SOURCE_PATH } from "$lib/constants/constants";
import { adventuringSkillGain } from "$lib/calculation/adventuring";

export const prerender = true;

interface QuestObjective {
  type: "kill" | "gather";
  target_id: string;
  target_name: string;
  amount: number;
}

interface QuestRewardItem {
  item_id: string;
  item_name: string;
  tooltip_html: string | null;
  class_specific: string | null;
}

interface AdventurerQuest {
  id: string;
  name: string;
  display_type: string;
  level_required: number;
  level_recommended: number;
  veteran_level_recommended: number;
  is_main_quest: boolean;
  is_epic_quest: boolean;
  is_adventurer_quest: boolean;
  is_repeatable: boolean;
  objectives: QuestObjective[];
  reward_items: QuestRewardItem[];
  reward_adventuring_skill: number;
}

interface VendorUnlock {
  item_id: string;
  item_name: string;
  quality: number;
  tooltip_html: string | null;
  visual_public_path: string | null;
  adventuring_level_needed: number;
  sold_by: {
    npc_id: string;
    npc_name: string;
  }[];
  currencies: {
    item_id: string | null;
    item_name: string;
    price: number;
  }[];
}

interface AdventurerNpc {
  npc_id: string;
  npc_name: string;
  zone_id: string;
  zone_name: string;
  sub_zone_name: string | null;
  position_x: number;
  position_y: number;
}

interface AdventuringPageData {
  profession: {
    id: string;
    name: string;
    description: string;
    category: string;
    max_level: number;
    achievement_id: string;
    achievement_name: string;
  };
  questGivers: AdventurerNpc[];
  merchants: AdventurerNpc[];
  quests: AdventurerQuest[];
  questPoolOrder: string[];
  vendorUnlocks: VendorUnlock[];
}

export const load = (async (): Promise<AdventuringPageData> => {
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
    WHERE id = 'adventuring'
  `,
    )
    .get() as AdventuringPageData["profession"];

  const questGivers = db
    .prepare(
      `
    SELECT
      n.id as npc_id,
      n.name as npc_name,
      ns.zone_id,
      z.name as zone_name,
      zt.name as sub_zone_name,
      ns.position_x,
      ns.position_y
    FROM npcs n
    JOIN npc_spawns ns ON ns.npc_id = n.id
    JOIN zones z ON ns.zone_id = z.id
    LEFT JOIN zone_triggers zt ON ns.sub_zone_id = zt.id
    WHERE json_extract(n.roles, '$.is_taskgiver_adventurer') = 1
    ORDER BY z.name, n.name
  `,
    )
    .all() as AdventurerNpc[];

  const merchants = db
    .prepare(
      `
    SELECT
      n.id as npc_id,
      n.name as npc_name,
      ns.zone_id,
      z.name as zone_name,
      zt.name as sub_zone_name,
      ns.position_x,
      ns.position_y
    FROM npcs n
    JOIN npc_spawns ns ON ns.npc_id = n.id
    JOIN zones z ON ns.zone_id = z.id
    LEFT JOIN zone_triggers zt ON ns.sub_zone_id = zt.id
    WHERE json_extract(n.roles, '$.is_merchant_adventurer') = 1
    ORDER BY z.name, n.name
  `,
    )
    .all() as AdventurerNpc[];

  // Raw quest data from database
  interface RawQuest {
    id: string;
    name: string;
    display_type: string;
    level_required: number;
    level_recommended: number;
    veteran_level_recommended: number;
    is_main_quest: number;
    is_epic_quest: number;
    is_adventurer_quest: number;
    is_repeatable: number;
    reward_experience: number;
  }

  const rawQuests = db
    .prepare(
      `
    SELECT
      id,
      name,
      display_type,
      level_required,
      level_recommended,
      veteran_level_recommended,
      is_main_quest,
      is_epic_quest,
      is_adventurer_quest,
      is_repeatable,
      reward_experience
    FROM quests
    WHERE is_adventurer_quest = 1
    ORDER BY level_recommended, name
  `,
    )
    .all() as RawQuest[];

  const questPoolOrder = (
    db
      .prepare(
        `
    SELECT membership.quest_id
    FROM npc_quest_memberships membership
    JOIN npcs npc ON npc.id = membership.npc_id
    WHERE membership.role = 'offer'
      AND json_extract(npc.roles, '$.is_taskgiver_adventurer') = 1
    GROUP BY membership.quest_id
    ORDER BY MIN(membership.ordinal), membership.quest_id
  `,
      )
      .all() as { quest_id: string }[]
  ).map(({ quest_id }) => quest_id);

  const objectiveStatement = db.prepare(`
    SELECT CASE WHEN objective.kind = 'monster' THEN 'kill' ELSE 'gather' END AS type,
      COALESCE(monster.monster_id, item.item_id) AS target_id,
      COALESCE(m.name, i.name) AS target_name,
      objective.amount
    FROM quest_objectives objective
    LEFT JOIN quest_objective_monsters monster ON monster.id = objective.id
    LEFT JOIN quest_objective_items item ON item.id = objective.id
    LEFT JOIN monsters m ON m.id = monster.monster_id
    LEFT JOIN items i ON i.id = item.item_id
    WHERE objective.quest_id = ? AND objective.withheld = 0
      AND objective.kind IN ('monster', 'item')
    ORDER BY objective.ordinal
  `);
  const rewardStatement = db.prepare(`
    WITH rewards AS (
      SELECT item.id AS item_id, item.name AS item_name, item.tooltip_html,
        class.name AS class_specific, slot.amount
      FROM quest_reward_slots slot
      JOIN items item ON item.id = slot.item_id
      LEFT JOIN classes class ON class.id = slot.class_id
      WHERE slot.quest_id = ? AND slot.item_withheld = 0 AND slot.class_withheld = 0
    ), common_rewards AS (
      SELECT item_id, amount FROM rewards GROUP BY item_id, amount
      HAVING COUNT(DISTINCT class_specific) = (SELECT COUNT(*) FROM classes)
    )
    SELECT DISTINCT reward.item_id, reward.item_name, reward.tooltip_html,
      CASE WHEN common.item_id IS NOT NULL THEN NULL ELSE reward.class_specific END AS class_specific
    FROM rewards reward LEFT JOIN common_rewards common
      ON common.item_id = reward.item_id AND common.amount = reward.amount
  `);
  const quests: AdventurerQuest[] = rawQuests.map((raw) => {
    const objectives = objectiveStatement.all(raw.id) as QuestObjective[];
    const rewardItems = rewardStatement.all(raw.id) as QuestRewardItem[];

    // Source: server-scripts/PlayerQuests.cs:403-405.
    const adventuringSkillIncrease = Math.min(
      1,
      adventuringSkillGain(raw.reward_experience),
    );

    return {
      id: raw.id,
      name: raw.name,
      display_type: raw.display_type,
      level_required: raw.level_required,
      level_recommended: raw.level_recommended,
      veteran_level_recommended: raw.veteran_level_recommended,
      is_main_quest: !!raw.is_main_quest,
      is_epic_quest: !!raw.is_epic_quest,
      is_adventurer_quest: !!raw.is_adventurer_quest,
      is_repeatable: !!raw.is_repeatable,
      objectives,
      reward_items: rewardItems,
      reward_adventuring_skill: adventuringSkillIncrease,
    };
  });

  const vendorUnlockRows = db
    .prepare(
      `
    SELECT
      i.id as item_id,
      i.name as item_name,
      i.quality,
      i.tooltip_html,
      va.public_path AS visual_public_path,
      i.adventuring_level_needed,
      n.id as npc_id,
      n.name as npc_name,
      input.item_id as currency_item_id,
      currency.name as currency_item_name,
      input.amount as price
    FROM acquisition_vendor_details detail
    JOIN items i ON i.id = detail.offered_item_id
    JOIN acquisition_providers_npcs provider ON provider.method_id = detail.id
    JOIN npcs n ON n.id = provider.npc_id
    JOIN acquisition_cost_groups cost ON cost.method_id = detail.id
    JOIN acquisition_inputs input ON input.cost_group_id = cost.id
    LEFT JOIN items currency ON currency.id = input.item_id
    LEFT JOIN visual_assets va
      ON va.domain = 'item' AND va.entity_id = i.id AND va.kind = 'icon'
    WHERE i.adventuring_level_needed > 0
      AND json_extract(n.roles, '$.is_merchant_adventurer') = 1
    ORDER BY i.adventuring_level_needed, i.name, n.name
  `,
    )
    .all() as {
    item_id: string;
    item_name: string;
    quality: number;
    tooltip_html: string | null;
    visual_public_path: string | null;
    adventuring_level_needed: number;
    npc_id: string;
    npc_name: string;
    currency_item_id: string | null;
    currency_item_name: string | null;
    price: number;
  }[];

  const vendorUnlockMap = new Map<string, VendorUnlock>();
  for (const row of vendorUnlockRows) {
    const unlock = vendorUnlockMap.get(row.item_id) ?? {
      item_id: row.item_id,
      item_name: row.item_name,
      quality: row.quality,
      tooltip_html: row.tooltip_html,
      visual_public_path: row.visual_public_path,
      adventuring_level_needed: row.adventuring_level_needed,
      sold_by: [],
      currencies: [],
    };

    if (!unlock.sold_by.some((seller) => seller.npc_id === row.npc_id)) {
      unlock.sold_by.push({ npc_id: row.npc_id, npc_name: row.npc_name });
    }

    const currencyName = row.currency_item_name ?? "Gold";
    if (
      !unlock.currencies.some(
        (currency) =>
          currency.item_id === row.currency_item_id &&
          currency.price === row.price,
      )
    ) {
      unlock.currencies.push({
        item_id: row.currency_item_id,
        item_name: currencyName,
        price: row.price,
      });
    }

    vendorUnlockMap.set(row.item_id, unlock);
  }

  const vendorUnlocks = Array.from(vendorUnlockMap.values());

  db.close();

  return {
    profession,
    questGivers,
    merchants,
    quests,
    questPoolOrder,
    vendorUnlocks,
  };
}) satisfies PageServerLoad;

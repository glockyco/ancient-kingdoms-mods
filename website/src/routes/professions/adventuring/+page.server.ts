import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";

import { DB_STATIC_PATH } from "$lib/constants/constants";

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
  is_main_quest: boolean;
  is_epic_quest: boolean;
  is_adventurer_quest: boolean;
  is_repeatable: boolean;
  objective: QuestObjective | null;
  reward_items: QuestRewardItem[];
  reward_adventuring_skill: number;
}

interface VendorUnlock {
  item_id: string;
  item_name: string;
  tooltip_html: string | null;
  adventuring_level_needed: number;
  sold_by: {
    npc_id: string;
    npc_name: string;
  }[];
  currencies: {
    item_id: string | null;
    item_name: string;
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
    steam_achievement_id: string | null;
    steam_achievement_name: string | null;
  };
  questGivers: AdventurerNpc[];
  merchants: AdventurerNpc[];
  quests: AdventurerQuest[];
  questPoolOrder: string[];
  vendorUnlocks: VendorUnlock[];
}

export const load: PageServerLoad = (): AdventuringPageData => {
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
    is_main_quest: number;
    is_epic_quest: number;
    is_adventurer_quest: number;
    is_repeatable: number;
    quest_type: string;
    kill_target_1_id: string | null;
    kill_amount_1: number;
    gather_item_1_id: string | null;
    gather_amount_1: number;
    rewards: string | null;
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
      is_main_quest,
      is_epic_quest,
      is_adventurer_quest,
      is_repeatable,
      quest_type,
      kill_target_1_id,
      kill_amount_1,
      gather_item_1_id,
      gather_amount_1,
      rewards
    FROM quests
    WHERE is_adventurer_quest = 1
    ORDER BY level_recommended, name
  `,
    )
    .all() as RawQuest[];

  // Source: server-scripts/Utils.cs:521-524 — daily Adventurer quest selection reads the shared npcAdventurerReference quest list.
  const questPoolOrder = (() => {
    const row = db
      .prepare(
        `
      SELECT quests_offered
      FROM npcs
      WHERE json_extract(roles, '$.is_taskgiver_adventurer') = 1
        AND quests_offered IS NOT NULL
      ORDER BY id
      LIMIT 1
    `,
      )
      .get() as { quests_offered: string | null } | undefined;

    if (!row?.quests_offered) {
      return rawQuests.map((quest) => quest.id);
    }

    return (JSON.parse(row.quests_offered) as { id: string }[]).map(
      (quest) => quest.id,
    );
  })();

  // Lookup helpers
  const getMonster = db.prepare(`SELECT id, name FROM monsters WHERE id = ?`);
  const getItem = db.prepare(
    `SELECT id, name, tooltip_html FROM items WHERE id = ?`,
  );

  const quests: AdventurerQuest[] = rawQuests.map((raw) => {
    // Build objective
    let objective: QuestObjective | null = null;
    if (raw.quest_type === "kill" && raw.kill_target_1_id) {
      const monster = getMonster.get(raw.kill_target_1_id) as {
        id: string;
        name: string;
      } | null;
      if (monster) {
        objective = {
          type: "kill",
          target_id: monster.id,
          target_name: monster.name,
          amount: raw.kill_amount_1,
        };
      }
    } else if (raw.quest_type === "gather" && raw.gather_item_1_id) {
      const item = getItem.get(raw.gather_item_1_id) as {
        id: string;
        name: string;
      } | null;
      if (item) {
        objective = {
          type: "gather",
          target_id: item.id,
          target_name: item.name,
          amount: raw.gather_amount_1,
        };
      }
    }

    // Parse rewards (include all items, both universal and class-specific)
    const rewards = raw.rewards
      ? (JSON.parse(raw.rewards) as {
          exp?: number;
          gold?: number;
          items?: { item_id: string; class_specific: string | null }[];
        })
      : {};
    const rewardItems: QuestRewardItem[] = (rewards.items ?? [])
      .map((ri) => {
        const item = getItem.get(ri.item_id) as {
          id: string;
          name: string;
          tooltip_html: string | null;
        } | null;
        if (!item) return null;
        return {
          item_id: item.id,
          item_name: item.name,
          tooltip_html: item.tooltip_html,
          class_specific: ri.class_specific,
        };
      })
      .filter(
        (item: QuestRewardItem | null): item is QuestRewardItem =>
          item !== null,
      );

    // Source: server-scripts/PlayerQuests.cs:323-326 — Adventuring skill increase is rewardExperience * 5E-08f.
    const adventuringSkillIncrease = (rewards.exp ?? 0) * 0.00000005;

    return {
      id: raw.id,
      name: raw.name,
      display_type: raw.display_type,
      level_required: raw.level_required,
      level_recommended: raw.level_recommended,
      is_main_quest: !!raw.is_main_quest,
      is_epic_quest: !!raw.is_epic_quest,
      is_adventurer_quest: !!raw.is_adventurer_quest,
      is_repeatable: !!raw.is_repeatable,
      objective,
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
      i.tooltip_html,
      i.adventuring_level_needed,
      n.id as npc_id,
      n.name as npc_name,
      json_extract(sold.value, '$.currency_item_id') as currency_item_id,
      json_extract(sold.value, '$.currency_item_name') as currency_item_name
    FROM items i
    JOIN npcs n
      ON n.items_sold IS NOT NULL
    JOIN json_each(n.items_sold) sold
      ON json_extract(sold.value, '$.item_id') = i.id
    WHERE i.adventuring_level_needed > 0
      AND json_extract(n.roles, '$.is_merchant_adventurer') = 1
    ORDER BY i.adventuring_level_needed, i.name, n.name
  `,
    )
    .all() as {
    item_id: string;
    item_name: string;
    tooltip_html: string | null;
    adventuring_level_needed: number;
    npc_id: string;
    npc_name: string;
    currency_item_id: string | null;
    currency_item_name: string | null;
  }[];

  const vendorUnlockMap = new Map<string, VendorUnlock>();
  for (const row of vendorUnlockRows) {
    const unlock = vendorUnlockMap.get(row.item_id) ?? {
      item_id: row.item_id,
      item_name: row.item_name,
      tooltip_html: row.tooltip_html,
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
        (currency) => currency.item_id === row.currency_item_id,
      )
    ) {
      unlock.currencies.push({
        item_id: row.currency_item_id,
        item_name: currencyName,
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
};

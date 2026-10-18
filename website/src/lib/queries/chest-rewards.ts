import type {
  ChestDefinition,
  ChestReward,
} from "$lib/calculation/chest-rewards";

export interface ChestRewardRow extends ChestReward {
  chest_item_id: string;
  chest_name: string;
  chest_num_items: number;
  quality: number;
  tooltip_html: string | null;
  item_type: string | null;
  relic_buff_id: string | null;
  relic_buff_name: string | null;
  withheld: number;
  display_name: string;
}

// The chest calculator deduplicates by item_name. Canonical groups retain anonymous name equivalence.
export const CHEST_REWARDS_QUERY = `
  SELECT definition.item_id AS chest_item_id, c.name AS chest_name,
         rule.num_items AS chest_num_items,
         COALESCE(entry.item_id, 'anonymous:' || entry.id) AS item_id,
         'group:' || entry.duplicate_group AS item_name,
         COALESCE(i.name, 'Unpublished reward') AS display_name,
         i.quality, i.tooltip_html, i.item_type,
         i.relic_buff_id, i.relic_buff_name,
         entry.ordinal AS roll_order, entry.probability AS roll_chance,
         entry.scales_with_treasure_hunter, entry.withheld
  FROM item_pool_definitions definition
  JOIN loot_chest_rules rule ON rule.pool_id = definition.pool_id
  JOIN loot_pool_entries entry ON entry.pool_id = definition.pool_id
  JOIN items c ON c.id = definition.item_id
  LEFT JOIN items i ON i.id = entry.item_id
`;

export function assembleChests(
  rows: ChestRewardRow[],
): ChestDefinition<ChestRewardRow>[] {
  const chests = new Map<string, ChestDefinition<ChestRewardRow>>();
  for (const row of rows) {
    let chest = chests.get(row.chest_item_id);
    if (!chest) {
      chest = {
        id: row.chest_item_id,
        num_items: row.chest_num_items,
        rewards: [],
      };
      chests.set(row.chest_item_id, chest);
    }
    chest.rewards.push(row);
  }
  return [...chests.values()];
}

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
}

export const CHEST_REWARDS_QUERY = `
  SELECT r.chest_item_id, c.name AS chest_name, c.chest_num_items,
         r.item_id, i.name AS item_name, i.quality, i.tooltip_html, i.item_type,
         i.relic_buff_id, i.relic_buff_name,
         r.roll_order, r.roll_chance, r.scales_with_treasure_hunter
  FROM chest_item_rewards r
  JOIN items c ON c.id = r.chest_item_id
  JOIN items i ON i.id = r.item_id
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

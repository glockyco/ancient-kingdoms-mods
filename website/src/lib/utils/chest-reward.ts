/** The fields of a chest that decide its reward chance. */
export interface ChestRewardFields {
  readonly chest_reward_probability: number;
  readonly gold_min: number;
  readonly gold_max: number;
  readonly item_reward_id: string | null;
}

/**
 * The chance that opening a chest gives anything: its gold, its reward item
 * and its random drop. Only a chest with a reward item or a gold range rolls,
 * and a probability of 0 skips the roll, so every opening of any other chest
 * gives its contents.
 */
// Source: server-scripts/GatherItem.cs:OnInteractServer — a positive probChestReward replaces the certain roll for a chest with a reward item or a positive gold minimum and maximum, and a failed roll gives nothing.
export function chestRewardChance(chest: ChestRewardFields): number {
  const rolls =
    chest.chest_reward_probability > 0 &&
    (chest.item_reward_id !== null ||
      (chest.gold_min > 0 && chest.gold_max > 0));
  return rolls ? Math.min(chest.chest_reward_probability, 1) : 1;
}

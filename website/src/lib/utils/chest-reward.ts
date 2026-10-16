/**
 * The chance that opening a chest gives its gold and item reward, or null when
 * every opening gives it.
 */
// Source: server-scripts/GatherItem.cs:OnInteractServer — a positive probChestReward replaces the certain roll for chests with a gold or item reward.
export function chestRewardChance(probability: number): number | null {
  return probability > 0 && probability < 1 ? probability : null;
}

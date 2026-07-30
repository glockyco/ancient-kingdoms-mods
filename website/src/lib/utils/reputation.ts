export interface ReputationTier {
  id: number;
  name: string;
  min_value: number | null;
  max_value: number | null;
  is_hostile: boolean;
}

/**
 * Tier a reputation value falls in. Bounds are inclusive-low, exclusive-high,
 * matching the game's cascading comparisons; NULL is unbounded.
 *
 * Source: server-scripts/UIFactions.cs:78-146 — adaptTextFaction's thresholds.
 */
export function reputationTierName(
  tiers: ReputationTier[],
  value: number,
): string {
  const tier = tiers.find(
    (t) =>
      (t.min_value === null || value >= t.min_value) &&
      (t.max_value === null || value < t.max_value),
  );
  return tier?.name ?? "Unknown";
}

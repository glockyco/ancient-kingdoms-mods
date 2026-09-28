import { PROFESSION_MECHANICS } from "$lib/data/professions/mechanics";

const mechanics = PROFESSION_MECHANICS.treasure_hunter;

export interface ChestReward {
  item_id: string;
  item_name: string;
  item_type: string | null;
  quality: number;
  tooltip_html: string | null;
  roll_order: number;
  base_roll_chance: number;
  baseline_open_chance: number;
  scales_with_treasure_hunter: boolean;
  relic_buff_id: string | null;
  relic_buff_name: string | null;
}

export interface AdjustedChestReward extends ChestReward {
  adjusted_open_chance: number;
  change_from_baseline: number;
}

export interface ChestSimulationOptions {
  trials?: number;
  seed?: number;
  targetRewards?: number;
  maxPasses?: number;
}

class SeededRandom {
  seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
  }

  next() {
    this.seed = (1664525 * this.seed + 1013904223) >>> 0;
    return this.seed / 0x100000000;
  }
}

/**
 * Calculates the estimated chance each reward appears in one opened Buried
 * Treasure Chest at the selected Treasure Hunter skill.
 *
 * Mirrors the chest-reward selection loop in
 * `server-scripts/ChestItem.cs:24,26-27,30-31,61`: rewards are rolled in configured order,
 * duplicate item names cannot be awarded (line 31), each pass continues until
 * `numItemsPerChest` unique rewards are picked, and the outer loop is capped at
 * 10 passes (line 24). Treasure Hunter only modifies relic rolls on the Buried
 * Treasure Chest specifically (line 30: `nameItem == "Buried Treasure Chest"
 * && item.data is RelicItem`), and the bonus is `treasureHunterLevel * 0.1f`
 * added to the per-roll probability.
 *
 */
export function calculateAdjustedChestRewards(
  rewards: ChestReward[],
  skill: number,
  options: ChestSimulationOptions = {},
): AdjustedChestReward[] {
  const trials = options.trials ?? 50_000;
  const targetRewards = options.targetRewards ?? 3;
  const maxPasses = options.maxPasses ?? 10;
  const seed = options.seed ?? 0x7a3c_2026;
  const random = new SeededRandom(seed);
  const orderedRewards = [...rewards].sort(
    (a, b) => a.roll_order - b.roll_order,
  );
  const counts = new Map(orderedRewards.map((reward) => [reward.item_id, 0]));

  for (let trial = 0; trial < trials; trial++) {
    const selectedItemNames = new Set<string>();
    let passes = 0;

    // Source: server-scripts/ChestItem.cs:24 — `while (num < numItemsPerChest && num2 < 10)`.
    while (selectedItemNames.size < targetRewards && passes < maxPasses) {
      for (const reward of orderedRewards) {
        // Source: server-scripts/ChestItem.cs:30-31 — the roll precedes the duplicate-name check.

        // Source: server-scripts/ChestItem.cs:30 — relics on Buried Treasure Chest get `treasureHunterLevel * 0.1f` added; the chest-name guard is enforced upstream by the loader scoping to `buried_treasure_chest`.
        const rollChance = reward.scales_with_treasure_hunter
          ? Math.min(
              1,
              reward.base_roll_chance +
                skill * mechanics.procChance.skillFactor,
            )
          : reward.base_roll_chance;

        if (
          random.next() < rollChance &&
          !selectedItemNames.has(reward.item_name)
        ) {
          selectedItemNames.add(reward.item_name);
          counts.set(reward.item_id, (counts.get(reward.item_id) ?? 0) + 1);
        }

        // Source: server-scripts/ChestItem.cs:61-64 — break out of the reward loop once the slot count is reached.
        if (selectedItemNames.size >= targetRewards) break;
      }

      passes++;
    }
  }

  return orderedRewards.map((reward) => {
    const adjusted_open_chance = (counts.get(reward.item_id) ?? 0) / trials;
    return {
      ...reward,
      adjusted_open_chance,
      change_from_baseline: adjusted_open_chance - reward.baseline_open_chance,
    };
  });
}

export function sortChestRewardsForDisplay(
  a: AdjustedChestReward,
  b: AdjustedChestReward,
): number {
  if (a.scales_with_treasure_hunter !== b.scales_with_treasure_hunter) {
    return a.scales_with_treasure_hunter ? -1 : 1;
  }

  return a.item_name.localeCompare(b.item_name);
}

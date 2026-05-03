/**
 * @typedef {object} ChestReward
 * @property {string} item_id
 * @property {string} item_name
 * @property {string | null} item_type
 * @property {number} quality
 * @property {string | null} tooltip_html
 * @property {number} roll_order
 * @property {number} base_roll_chance
 * @property {number} baseline_open_chance
 * @property {boolean} scales_with_treasure_hunter
 */

/**
 * @typedef {ChestReward & {
 *   adjusted_open_chance: number,
 *   change_from_baseline: number,
 * }} AdjustedChestReward
 */

/**
 * @typedef {object} ChestSimulationOptions
 * @property {number} [trials]
 * @property {number} [seed]
 * @property {number} [targetRewards]
 * @property {number} [maxPasses]
 */

class SeededRandom {
  /** @type {number} */
  seed;

  /** @param {number} seed */
  constructor(seed) {
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
 * The simulation mirrors server-scripts/ChestItem.cs: rewards are rolled in
 * configured order, duplicate item names cannot be awarded, and the chest stops
 * after enough unique rewards or after the maximum pass count.
 *
 * @param {ChestReward[]} rewards
 * @param {number} skill Treasure Hunter skill as a 0..1 fraction.
 * @param {ChestSimulationOptions} [options]
 * @returns {AdjustedChestReward[]}
 */
export function calculateAdjustedChestRewards(rewards, skill, options = {}) {
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
    const selectedItemNames = new Set();
    let passes = 0;

    while (selectedItemNames.size < targetRewards && passes < maxPasses) {
      for (const reward of orderedRewards) {
        if (selectedItemNames.has(reward.item_name)) continue;

        const rollChance = reward.scales_with_treasure_hunter
          ? Math.min(1, reward.base_roll_chance + skill * 0.1)
          : reward.base_roll_chance;

        if (random.next() < rollChance) {
          selectedItemNames.add(reward.item_name);
          counts.set(reward.item_id, (counts.get(reward.item_id) ?? 0) + 1);
        }

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

/**
 * @param {AdjustedChestReward} a
 * @param {AdjustedChestReward} b
 */
export function sortChestRewardsForDisplay(a, b) {
  if (a.scales_with_treasure_hunter !== b.scales_with_treasure_hunter) {
    return a.scales_with_treasure_hunter ? -1 : 1;
  }

  return a.item_name.localeCompare(b.item_name);
}

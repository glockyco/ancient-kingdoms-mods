import { describe, expect, test } from "vitest";
import {
  calculateChestRewards,
  type ChestDefinition,
  type ChestReward,
} from "./chest-rewards";

function chest(chances: number[], count = 3): ChestDefinition {
  return {
    id: "test",
    num_items: count,
    rewards: chances.map((chance, index) => ({
      item_id: `item_${index}`,
      item_name: `Item ${index}`,
      roll_order: index,
      roll_chance: chance,
      scales_with_treasure_hunter: false,
    })),
  };
}

function simulate(
  input: ChestDefinition,
  skill: number,
  trials: number,
): number[] {
  let seed = 0x7a3c2026;
  const counts = input.rewards.map(() => 0);
  const ordered = [...input.rewards].sort(
    (a, b) => a.roll_order - b.roll_order,
  );
  for (let trial = 0; trial < trials; trial++) {
    const selected = new Set<string>();
    for (let pass = 0; pass < 10 && selected.size < input.num_items; pass++) {
      for (let index = 0; index < ordered.length; index++) {
        const reward = ordered[index];
        seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
        const roll = seed / 0x100000000;
        const chance =
          reward.roll_chance +
          (reward.scales_with_treasure_hunter ? skill * 0.1 : 0);
        if (roll < chance && !selected.has(reward.item_name)) {
          counts[index]++;
          selected.add(reward.item_name);
        }
        if (selected.size >= input.num_items) break;
      }
    }
  }
  return counts.map((count) => count / trials);
}

describe("calculateChestRewards", () => {
  test("guaranteed rolls stop at the item count in configured order", () => {
    const input = chest([1, 1, 1, 1], 2);
    input.rewards.reverse();
    expect(
      calculateChestRewards(input, 0).map((reward) => reward.open_chance),
    ).toEqual([1, 1, 0, 0]);
  });

  test("a name can be awarded only once even through distinct item ids", () => {
    const input = chest([0.5, 1, 1], 2);
    input.rewards[1].item_name = input.rewards[0].item_name;
    const result = calculateChestRewards(input, 0);
    expect(result.map((reward) => reward.open_chance)).toEqual([0.5, 0.5, 1]);
    expect(result.reduce((sum, reward) => sum + reward.open_chance, 0)).toBe(2);
  });

  test("stops after ten passes even with unfilled slots", () => {
    expect(
      calculateChestRewards(chest([0.1], 3), 0)[0].open_chance,
    ).toBeCloseTo(1 - 0.9 ** 10, 14);
    expect(calculateChestRewards(chest([0], 1), 0)[0].open_chance).toBe(0);
  });

  test("Treasure Hunter changes only flagged rolls and clamps success at one", () => {
    const input = chest([0.05, 0.05, 0.95], 3);
    input.rewards[0].scales_with_treasure_hunter = true;
    input.rewards[2].scales_with_treasure_hunter = true;
    const result = calculateChestRewards(input, 1);
    expect(result[0].open_chance).toBeCloseTo(1 - 0.85 ** 10, 14);
    expect(result[1].open_chance).toBeCloseTo(1 - 0.95 ** 10, 14);
    expect(result[2].open_chance).toBeCloseTo(1, 14);
    expect(calculateChestRewards(input, 0)[0].open_chance).toBeCloseTo(
      1 - 0.95 ** 10,
      14,
    );
    expect(calculateChestRewards(input, 1)).toBe(result);
  });

  test("matches a seeded simulation within sampling error", () => {
    const input = chest([0.04, 0.11, 0.31, 0.08, 0.5, 0.6], 3);
    input.rewards[1].scales_with_treasure_hunter = true;
    input.rewards[3].item_name = input.rewards[0].item_name;
    const trials = 200_000;
    for (const skill of [0, 0.73]) {
      const exact = calculateChestRewards(input, skill);
      const observed = simulate(input, skill, trials);
      exact.forEach((reward, index) => {
        const error = Math.sqrt(
          (reward.open_chance * (1 - reward.open_chance)) / trials,
        );
        expect(Math.abs(observed[index] - reward.open_chance)).toBeLessThan(
          5 * error + 1 / trials,
        );
      });
      expect(
        exact.reduce((sum, reward) => sum + reward.open_chance, 0),
      ).toBeLessThanOrEqual(3 + 1e-12);
    }
  });

  test("a seven-item, 28-reward bag finishes quickly and matches simulation", () => {
    const input = chest(
      Array.from({ length: 28 }, (_, index) => (index < 6 ? 0.15 : 0.1)),
      7,
    );
    const start = performance.now();
    const exact = calculateChestRewards(input, 0);
    expect(performance.now() - start).toBeLessThan(1000);
    const trials = 100_000;
    const observed = simulate(input, 0, trials);
    exact.forEach((reward, index) => {
      const error = Math.sqrt(
        (reward.open_chance * (1 - reward.open_chance)) / trials,
      );
      expect(Math.abs(observed[index] - reward.open_chance)).toBeLessThan(
        5 * error + 1 / trials,
      );
    });
    expect(
      exact.reduce((sum, reward) => sum + reward.open_chance, 0),
    ).toBeLessThanOrEqual(7 + 1e-12);
  });

  test("missing inputs name their field", () => {
    const input = chest([1]);
    delete (input.rewards[0] as Partial<ChestReward>).roll_chance;
    expect(() => calculateChestRewards(input, 0)).toThrow(
      "chest_item_rewards.roll_chance",
    );
    expect(() => calculateChestRewards({ ...input, num_items: 0 }, 0)).toThrow(
      "items.chest_num_items",
    );
  });
});

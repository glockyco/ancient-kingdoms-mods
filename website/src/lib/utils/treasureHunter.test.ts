import { describe, expect, it } from "vitest";
import {
  calculateAdjustedChestRewards,
  type ChestReward,
} from "./treasureHunter";

function reward(
  id: string,
  name: string,
  chance: number,
  order: number,
  scales = false,
): ChestReward {
  return {
    item_id: id,
    item_name: name,
    item_type: scales ? "relic" : "general",
    quality: 0,
    tooltip_html: null,
    roll_order: order,
    base_roll_chance: chance,
    baseline_open_chance: 0,
    scales_with_treasure_hunter: scales,
    relic_buff_id: null,
    relic_buff_name: null,
  };
}

describe("buried chest reward selection", () => {
  // Source: server-scripts/ChestItem.cs:24-31,61-66 — order, unique names, and the slot cap.
  it("rolls duplicates before rejecting their names and stops at the reward limit", () => {
    const results = calculateAdjustedChestRewards(
      [
        reward("late", "Later", 0.5, 3),
        reward("first", "Same", 1, 1),
        reward("duplicate", "Same", 1, 2),
      ],
      0,
      { trials: 1, seed: 0, targetRewards: 2, maxPasses: 1 },
    );
    expect(
      results.map(({ item_id, adjusted_open_chance }) => [
        item_id,
        adjusted_open_chance,
      ]),
    ).toEqual([
      ["first", 1],
      ["duplicate", 0],
      ["late", 0],
    ]);
    const limited = calculateAdjustedChestRewards(
      [reward("first", "First", 1, 0), reward("second", "Second", 1, 1)],
      0,
      { trials: 1, seed: 0, targetRewards: 1 },
    );
    expect(limited.map((r) => r.adjusted_open_chance)).toEqual([1, 0]);
  });

  // Source: server-scripts/ChestItem.cs:24,30 — ten passes, plus 0.1 × skill for relics only.
  it("continues on later passes and increases only relic roll chance", () => {
    const ordinary = reward("ordinary", "Ordinary", 0.5, 0);
    const relic = reward("relic", "Relic", 0.2, 0, true);
    const options = { trials: 1, seed: 682, targetRewards: 1 };
    expect(
      calculateAdjustedChestRewards([ordinary], 0, {
        ...options,
        maxPasses: 1,
      })[0].adjusted_open_chance,
    ).toBe(0);
    expect(
      calculateAdjustedChestRewards([ordinary], 0, {
        ...options,
        maxPasses: 2,
      })[0].adjusted_open_chance,
    ).toBe(1);
    expect(
      calculateAdjustedChestRewards([ordinary], 1, {
        ...options,
        maxPasses: 1,
      })[0].adjusted_open_chance,
    ).toBe(0);
    expect(
      calculateAdjustedChestRewards([relic], 0, {
        trials: 1,
        seed: 0,
        targetRewards: 1,
        maxPasses: 1,
      })[0].adjusted_open_chance,
    ).toBe(0);
    expect(
      calculateAdjustedChestRewards([relic], 1, {
        trials: 1,
        seed: 0,
        targetRewards: 1,
        maxPasses: 1,
      })[0].adjusted_open_chance,
    ).toBe(1);
    const tenPassReward = reward("late", "Late", 0.3, 0);
    expect(
      calculateAdjustedChestRewards([tenPassReward], 0, {
        trials: 1,
        seed: 276,
        targetRewards: 1,
      })[0].adjusted_open_chance,
    ).toBe(0);
    expect(
      calculateAdjustedChestRewards([tenPassReward], 0, {
        trials: 1,
        seed: 276,
        targetRewards: 1,
        maxPasses: 11,
      })[0].adjusted_open_chance,
    ).toBe(1);
  });
});

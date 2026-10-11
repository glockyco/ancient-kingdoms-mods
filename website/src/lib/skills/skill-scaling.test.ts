import { describe, expect, test } from "vitest";
import type { SkillDetailView } from "$lib/types/skills";
import {
  scalingColumns,
  computeScalingValue,
  showLevelScaling,
} from "./skill-scaling";

function skill(overrides: Partial<SkillDetailView> = {}): SkillDetailView {
  return {
    max_level: 5,
    duration_base: 0,
    duration_per_level: 0,
    ...overrides,
  } as SkillDetailView;
}

describe("skill rank scaling", () => {
  test("only nonzero per-rank fields produce columns, including decreasing values", () => {
    const columns = scalingColumns(
      skill({
        damage: { base_value: 10, bonus_per_level: 0 },
        mana_cost: { base_value: 10, bonus_per_level: -2 },
        cooldown: { base_value: 2, bonus_per_level: 1 },
      }),
    );
    expect(columns.map((col) => col.field)).toEqual([
      { base_value: 10, bonus_per_level: -2 },
      { base_value: 2, bonus_per_level: 1 },
    ]);
    expect(computeScalingValue(columns[0], 3)).toBe("6");
    expect(computeScalingValue(columns[1], 3)).toBe("4s");
  });
  test("duration scales only upward and is excluded for Reaper Form", () => {
    expect(
      scalingColumns(skill({ duration_base: 4, duration_per_level: 2 }))[0]
        .field,
    ).toEqual({ base_value: 4, bonus_per_level: 2 });
    expect(scalingColumns(skill({ duration_per_level: -2 }))).toEqual([]);
    expect(
      scalingColumns(
        skill({ duration_per_level: 2, is_necromancer_reaper_form: true }),
      ),
    ).toEqual([]);
  });
  test("negative regeneration uses magnitude for both base and growth", () => {
    const columns = scalingColumns(
      skill({
        healing_per_second_bonus: { base_value: -2, bonus_per_level: -3 },
        health_percent_per_second_bonus: {
          base_value: -0.1,
          bonus_per_level: -0.05,
        },
      }),
    );
    expect(columns.map((col) => computeScalingValue(col, 3))).toEqual([
      "8",
      "20%",
    ]);
  });
  test("the table needs multiple ranks and either a scaling column or scroll mastery", () => {
    const columns = scalingColumns(
      skill({ damage: { base_value: 1, bonus_per_level: 1 } }),
    );
    expect(showLevelScaling(skill(), [], false)).toBe(false);
    expect(showLevelScaling(skill(), [], true)).toBe(true);
    expect(showLevelScaling(skill(), columns, false)).toBe(true);
    expect(showLevelScaling(skill({ max_level: 1 }), columns, true)).toBe(
      false,
    );
  });
});

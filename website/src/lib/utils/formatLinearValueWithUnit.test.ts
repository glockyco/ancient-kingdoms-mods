import { describe, expect, it } from "vitest";
import { formatLinearValueWithUnit } from "./formatSkillEffect";

describe("unit-bearing skill formulas", () => {
  it.each([
    [3, 1, "s", "2s + 1s × rank"],
    [9, 1, " yd", "8 yd + 1 yd × rank"],
    [8, 0, " yd", "8 yd"],
    [2, 0, "s", "2s"],
    [1, 1, "s", "1s × rank"],
    [10, -1, "s", "11s − 1s × rank"],
    [3, 1, "", "2 + 1 × rank"],
  ])("formats %s + %s per level with %s", (base, perLevel, unit, expected) => {
    expect(
      formatLinearValueWithUnit(
        { base_value: base, bonus_per_level: perLevel },
        unit,
      ),
    ).toBe(expected);
  });
});

import { describe, expect, it } from "vitest";
import { formatLinearValueWithUnit } from "./formatSkillEffect";

describe("unit-bearing skill formulas", () => {
  it.each([
    [3, 1, "s", "3s + 1s × (rank − 1)"],
    [9, 1, " yd", "9 yd + 1 yd × (rank − 1)"],
    [8, 0, " yd", "8 yd"],
    [2, 0, "s", "2s"],
    [1, 1, "s", "1s × rank"],
    [10, -1, "s", "10s − 1s × (rank − 1)"],
    [1, 4, "", "1 + 4 × (rank − 1)"],
  ])(
    "states %s + %s per rank with %s from its rank-1 value",
    (base, perLevel, unit, expected) => {
      expect(
        formatLinearValueWithUnit(
          { base_value: base, bonus_per_level: perLevel },
          unit,
        ),
      ).toBe(expected);
    },
  );
});

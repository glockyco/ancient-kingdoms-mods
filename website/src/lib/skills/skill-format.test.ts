import { describe, expect, test } from "vitest";
import {
  formatMasteryNeeded,
  formatPercent,
  hasLinearValue,
  isNegativeLinear,
  convertTooltip,
} from "./skill-format";

describe("skill display formatting", () => {
  test.each([
    [1, "at least 0.0%"],
    [2, "at least 7.5%"],
    [3, "above 12.5%"],
    [4, "at least 17.5%"],
    [5, "above 22.5%"],
  ])(
    "mastery threshold for rank %s reflects even rounding",
    (rank, expected) => {
      expect(formatMasteryNeeded(Number(rank))).toBe(expected);
    },
  );
  test("page percentages retain two decimal places and nonzero small chances", () => {
    expect(formatPercent(0.12345)).toBe("12.35%");
    expect(formatPercent(-0.0225)).toBe("−2.25%");
    expect(formatPercent(0.00001)).toBe("0.001%");
  });
  test("a level-only value is present but its sign is decided by its base", () => {
    expect(hasLinearValue(null)).toBe(false);
    expect(hasLinearValue({ base_value: 0, bonus_per_level: -1 })).toBe(true);
    expect(isNegativeLinear({ base_value: 0, bonus_per_level: -1 })).toBe(
      false,
    );
    expect(isNegativeLinear({ base_value: -1, bonus_per_level: 1 })).toBe(true);
  });
  test("tooltip color survives while layout tags are removed", () => {
    expect(
      convertTooltip("<color=#aBc123>A</color><size=12>B</size>\n<pos=4>C"),
    ).toBe('<span style="color:#aBc123">A</span>B<br>    C');
    expect(convertTooltip(null)).toBe("");
  });
});

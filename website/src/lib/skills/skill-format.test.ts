import { describe, expect, test } from "vitest";
import {
  formatMasteryNeeded,
  formatPercent,
  hasLinearValue,
  isNegativeLinear,
  convertTooltip,
} from "./skill-format";
import { formatSeconds } from "$lib/calculation/format";

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
    expect(formatPercent(12.345)).toBe("1\u202F234.5%");
    expect(formatPercent(-0)).toBe("0%");
  });
  test("long durations group hours without changing compact units", () => {
    expect(formatSeconds(3_600_000)).toBe("1\u202F000h");
    expect(formatSeconds(2.45)).toBe("2.45s");
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

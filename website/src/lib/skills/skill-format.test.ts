import { describe, expect, test } from "vitest";
import { hasLinearValue, convertTooltip } from "./skill-format";
import { formatLinearStat } from "$lib/utils/formatSkillEffect";

describe("skill display formatting", () => {
  test("a level-only value is present", () => {
    expect(hasLinearValue(null)).toBe(false);
    expect(hasLinearValue({ base_value: 0, bonus_per_level: -1 })).toBe(true);
  });
  test("stat fields use signed catalogue formats and preserve negative regeneration", () => {
    expect(
      formatLinearStat("health_max_bonus", {
        base_value: 2000,
        bonus_per_level: 0,
      }),
    ).toBe("+2,000");
    expect(
      formatLinearStat("critical_chance_bonus", {
        base_value: 0.05833,
        bonus_per_level: 0,
      }),
    ).toBe("+5.83%");
    expect(
      formatLinearStat("healing_per_second_bonus", {
        base_value: -1.25,
        bonus_per_level: 0,
      }),
    ).toBe("−1.25");
    expect(
      formatLinearStat("health_max_bonus", {
        base_value: 20,
        bonus_per_level: 5,
      }),
    ).toBe("+20 + 5 × (rank − 1)");
  });
  test("tooltip color survives while layout tags are removed", () => {
    expect(
      convertTooltip("<color=#aBc123>A</color><size=12>B</size>\n<pos=4>C"),
    ).toBe('<span style="color:#aBc123">A</span>B<br>    C');
    expect(convertTooltip(null)).toBe("");
  });
});

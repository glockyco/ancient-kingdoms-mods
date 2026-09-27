import { describe, expect, test } from "vitest";
import { altarVeteranLevelBonus } from "./altar";

describe("altarVeteranLevelBonus", () => {
  test("rounds a half level to the nearest even level, like Mathf.RoundToInt", () => {
    expect(altarVeteranLevelBonus(20)).toBe(0);
    expect(altarVeteranLevelBonus(60)).toBe(2);
    expect(altarVeteranLevelBonus(100)).toBe(2);
  });

  test("rounds past a half level up", () => {
    expect(altarVeteranLevelBonus(30)).toBe(1);
  });
});

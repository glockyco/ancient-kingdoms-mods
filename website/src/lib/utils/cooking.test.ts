import { describe, expect, test } from "vitest";
import {
  COOKING_SUCCESS_FLOOR,
  cookingSkillGainChancePercent,
  cookingSkillGainRange,
  cookingSuccessPercent,
  isCookable,
  isCookingEffortless,
  rawCookingSuccessChance,
} from "./cooking";

describe("rawCookingSuccessChance", () => {
  test("tier 0 always succeeds regardless of skill", () => {
    expect(rawCookingSuccessChance(0, 0)).toBe(1);
    expect(rawCookingSuccessChance(0, 100)).toBe(1);
  });

  test("tier 1 is 0.4 + 2*skill, capped at 1", () => {
    expect(rawCookingSuccessChance(1, 0)).toBeCloseTo(0.4, 5);
    expect(rawCookingSuccessChance(1, 20)).toBeCloseTo(0.8, 5);
    expect(rawCookingSuccessChance(1, 30)).toBe(1);
  });

  test("tier 2 is 0.2 + skill, capped at 1", () => {
    expect(rawCookingSuccessChance(2, 0)).toBeCloseTo(0.2, 5);
    expect(rawCookingSuccessChance(2, 50)).toBeCloseTo(0.7, 5);
    expect(rawCookingSuccessChance(2, 80)).toBe(1);
  });

  test("tier 3 is 0.95*skill", () => {
    expect(rawCookingSuccessChance(3, 100)).toBeCloseTo(0.95, 5);
    expect(rawCookingSuccessChance(3, 50)).toBeCloseTo(0.475, 5);
  });

  test("tier 4+ is 0.9*skill (never reaches 100%)", () => {
    expect(rawCookingSuccessChance(4, 100)).toBeCloseTo(0.9, 5);
    expect(rawCookingSuccessChance(4, 50)).toBeCloseTo(0.45, 5);
    expect(rawCookingSuccessChance(5, 100)).toBeCloseTo(0.9, 5);
  });
});

describe("isCookable (UICraftingStation < 0.1 gate)", () => {
  test("floor is 0.1", () => {
    expect(COOKING_SUCCESS_FLOOR).toBe(0.1);
  });

  test("tier 4 needs ~11.11% cooking to clear the gate", () => {
    expect(isCookable(4, 11)).toBe(false); // 0.099
    expect(isCookable(4, 12)).toBe(true); // 0.108
  });

  test("tier 3 needs ~10.53% cooking to clear the gate", () => {
    expect(isCookable(3, 10)).toBe(false); // 0.095
    expect(isCookable(3, 11)).toBe(true); // 0.1045
  });

  test("tiers 0-2 are always cookable (base chance already >= 0.1)", () => {
    expect(isCookable(0, 0)).toBe(true);
    expect(isCookable(1, 0)).toBe(true);
    expect(isCookable(2, 0)).toBe(true);
  });
});

describe("cookingSuccessPercent", () => {
  test("food shows 0% below the gate, real chance above", () => {
    expect(cookingSuccessPercent(4, 11, true)).toBe(0);
    expect(cookingSuccessPercent(4, 12, true)).toBeCloseTo(10.8, 5);
    expect(cookingSuccessPercent(4, 100, true)).toBeCloseTo(90, 5);
    expect(cookingSuccessPercent(3, 100, true)).toBeCloseTo(95, 5);
  });

  test("non-food (e.g. Dragonbait Stew) shows 0% when not cookable, 100% when cookable", () => {
    expect(cookingSuccessPercent(4, 11, false)).toBe(0);
    expect(cookingSuccessPercent(4, 12, false)).toBe(100);
    expect(cookingSuccessPercent(4, 100, false)).toBe(100);
  });

  test("low tiers never drop to 0%", () => {
    expect(cookingSuccessPercent(0, 0, true)).toBe(100);
    expect(cookingSuccessPercent(1, 0, true)).toBeCloseTo(40, 5);
  });
});

describe("isCookingEffortless (strict > thresholds)", () => {
  test("tier 0 above 25%, tier 1 above 50%, tier 2 above 75%", () => {
    expect(isCookingEffortless(0, 25)).toBe(false);
    expect(isCookingEffortless(0, 26)).toBe(true);
    expect(isCookingEffortless(1, 50)).toBe(false);
    expect(isCookingEffortless(1, 51)).toBe(true);
    expect(isCookingEffortless(2, 75)).toBe(false);
    expect(isCookingEffortless(2, 76)).toBe(true);
  });

  test("tier 3+ is never effortless", () => {
    expect(isCookingEffortless(3, 100)).toBe(false);
    expect(isCookingEffortless(4, 100)).toBe(false);
  });
});

describe("cookingSkillGainChancePercent", () => {
  test("90% at 0 skill, 40% at 100 skill", () => {
    expect(cookingSkillGainChancePercent(0)).toBeCloseTo(90, 5);
    expect(cookingSkillGainChancePercent(100)).toBeCloseTo(40, 5);
    expect(cookingSkillGainChancePercent(50)).toBeCloseTo(65, 5);
  });
});

describe("cookingSkillGainRange", () => {
  test("non-food never grants cooking skill", () => {
    expect(cookingSkillGainRange(4, 100, false)).toBeNull();
  });

  test("food below the gate grants nothing", () => {
    expect(cookingSkillGainRange(4, 11, true)).toBeNull();
  });

  test("food turned into an effortless task grants nothing", () => {
    expect(cookingSkillGainRange(0, 30, true)).toBeNull();
  });

  test("food gain range is Random(1-3) / (rawSuccess * 3000)", () => {
    const range = cookingSkillGainRange(4, 100, true);
    expect(range).not.toBeNull();
    expect(range!.min).toBeCloseTo((1 / (0.9 * 3000)) * 100, 5);
    expect(range!.max).toBeCloseTo((3 / (0.9 * 3000)) * 100, 5);
  });
});

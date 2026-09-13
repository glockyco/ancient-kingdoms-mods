import { describe, expect, test } from "vitest";
import {
  ALCHEMY_SUCCESS_FLOOR,
  alchemySkillGainChancePercent,
  alchemySkillGainRange,
  alchemySuccessPercent,
  isAlchemyCraftable,
  isAlchemyEffortless,
  rawAlchemySuccessChance,
} from "./alchemy";

describe("rawAlchemySuccessChance", () => {
  test("level 0 always succeeds regardless of skill", () => {
    expect(rawAlchemySuccessChance(0, 0)).toBe(1);
    expect(rawAlchemySuccessChance(0, 100)).toBe(1);
  });

  test("level 1 is 0.4 + 2*skill, capped at 1", () => {
    expect(rawAlchemySuccessChance(1, 0)).toBeCloseTo(0.4, 5);
    expect(rawAlchemySuccessChance(1, 20)).toBeCloseTo(0.8, 5);
    expect(rawAlchemySuccessChance(1, 30)).toBe(1);
  });

  test("level 2 is 0.2 + skill, capped at 1", () => {
    expect(rawAlchemySuccessChance(2, 0)).toBeCloseTo(0.2, 5);
    expect(rawAlchemySuccessChance(2, 50)).toBeCloseTo(0.7, 5);
    expect(rawAlchemySuccessChance(2, 80)).toBe(1);
  });

  test("level 3 is 1.05*skill, capped at 1", () => {
    expect(rawAlchemySuccessChance(3, 100)).toBe(1);
    expect(rawAlchemySuccessChance(3, 50)).toBeCloseTo(0.525, 5);
  });

  test("level 4+ equals skill", () => {
    expect(rawAlchemySuccessChance(4, 100)).toBe(1);
    expect(rawAlchemySuccessChance(4, 50)).toBeCloseTo(0.5, 5);
    expect(rawAlchemySuccessChance(5, 100)).toBe(1);
  });
});

describe("isAlchemyCraftable (table < 0.1 gate)", () => {
  test("floor is 0.1", () => {
    expect(ALCHEMY_SUCCESS_FLOOR).toBe(0.1);
  });

  test("level 4 needs 10% alchemy to clear the gate", () => {
    expect(isAlchemyCraftable(4, 9)).toBe(false);
    expect(isAlchemyCraftable(4, 10)).toBe(true);
  });

  test("level 3 needs about 9.53% alchemy to clear the gate", () => {
    expect(isAlchemyCraftable(3, 9)).toBe(false);
    expect(isAlchemyCraftable(3, 10)).toBe(true);
  });

  test("levels 0-2 are always craftable (base chance already >= 0.1)", () => {
    expect(isAlchemyCraftable(0, 0)).toBe(true);
    expect(isAlchemyCraftable(1, 0)).toBe(true);
    expect(isAlchemyCraftable(2, 0)).toBe(true);
  });
});

describe("alchemySuccessPercent", () => {
  test("shows 0% below the gate, real chance above (no always-succeeds case)", () => {
    expect(alchemySuccessPercent(4, 9)).toBe(0);
    expect(alchemySuccessPercent(4, 10)).toBeCloseTo(10, 5);
    expect(alchemySuccessPercent(4, 100)).toBe(100);
    expect(alchemySuccessPercent(3, 100)).toBe(100);
  });

  test("low levels never drop to 0%", () => {
    expect(alchemySuccessPercent(0, 0)).toBe(100);
    expect(alchemySuccessPercent(1, 0)).toBeCloseTo(40, 5);
  });
});

describe("isAlchemyEffortless (strict > thresholds)", () => {
  test("level 0 above 25%, level 1 above 50%, level 2 above 75%", () => {
    expect(isAlchemyEffortless(0, 25)).toBe(false);
    expect(isAlchemyEffortless(0, 26)).toBe(true);
    expect(isAlchemyEffortless(1, 50)).toBe(false);
    expect(isAlchemyEffortless(1, 51)).toBe(true);
    expect(isAlchemyEffortless(2, 75)).toBe(false);
    expect(isAlchemyEffortless(2, 76)).toBe(true);
  });

  test("level 3+ is never effortless", () => {
    expect(isAlchemyEffortless(3, 100)).toBe(false);
    expect(isAlchemyEffortless(4, 100)).toBe(false);
  });
});

describe("alchemySkillGainChancePercent", () => {
  test("follows the 95%-to-35% quadratic curve", () => {
    expect(alchemySkillGainChancePercent(0)).toBeCloseTo(95, 5);
    expect(alchemySkillGainChancePercent(100)).toBeCloseTo(35, 5);
    expect(alchemySkillGainChancePercent(50)).toBeCloseTo(80, 5);
  });
});

describe("alchemySkillGainRange", () => {
  test("below the gate grants nothing", () => {
    expect(alchemySkillGainRange(4, 9)).toBeNull();
  });

  test("an effortless recipe grants nothing", () => {
    expect(alchemySkillGainRange(0, 30)).toBeNull();
  });

  test("gain range is Random(1-3) / (rawSuccess * 1000) — 3x cooking's", () => {
    const range = alchemySkillGainRange(4, 100);
    expect(range).not.toBeNull();
    expect(range!.min).toBeCloseTo((1 / 1000) * 100, 5);
    expect(range!.max).toBeCloseTo((3 / 1000) * 100, 5);
  });
});

import { describe, expect, test } from "vitest";
import {
  PROFESSION_MECHANICS,
  isEffortlessAtTier,
  linearProcChance,
  rawTierSuccessChance,
  skillGainChance,
  thresholdedDamageReduction,
} from "./mechanics";

const EXPECTED_CRAFTING_TIERS = [
  [1, 0, 0],
  [0.4, 0, 2],
  [0.2, 0, 1],
  [0, 0, 0.95],
  [0, 0, 0.9],
];

const EXPECTED_GATHERING_TIERS = [
  [0.8, 1, 1],
  [0.3, 0.2, 1],
  [0, 0.15, 0.6],
  [0, 0.1, 0.5],
  [0, 0.05, 0.4],
];

function tierValues(
  tiers: readonly {
    constant: number;
    toolFactor: number;
    skillFactor: number;
  }[],
): number[][] {
  return tiers.map((tier) => [
    tier.constant,
    tier.toolFactor,
    tier.skillFactor,
  ]);
}

describe("profession mechanics record", () => {
  test("matches the five crafting tier formulas", () => {
    expect(tierValues(PROFESSION_MECHANICS.alchemy.success.tiers)).toEqual(
      EXPECTED_CRAFTING_TIERS,
    );
    expect(tierValues(PROFESSION_MECHANICS.cooking.success.tiers)).toEqual(
      EXPECTED_CRAFTING_TIERS,
    );
  });

  test("matches the five gathering tier formulas", () => {
    expect(tierValues(PROFESSION_MECHANICS.mining.success.tiers)).toEqual(
      EXPECTED_GATHERING_TIERS,
    );
    expect(tierValues(PROFESSION_MECHANICS.fishing.success.tiers)).toEqual(
      EXPECTED_GATHERING_TIERS,
    );
  });

  test("uses strict no-skill thresholds", () => {
    const thresholds = PROFESSION_MECHANICS.mining.effortless;
    expect(isEffortlessAtTier(thresholds, 0, 25)).toBe(false);
    expect(isEffortlessAtTier(thresholds, 0, 25.01)).toBe(true);
    expect(isEffortlessAtTier(thresholds, 1, 50)).toBe(false);
    expect(isEffortlessAtTier(thresholds, 1, 50.01)).toBe(true);
    expect(isEffortlessAtTier(thresholds, 2, 75)).toBe(false);
    expect(isEffortlessAtTier(thresholds, 2, 75.01)).toBe(true);
  });

  test("applies the Slayer threshold and damage reduction", () => {
    const rule = PROFESSION_MECHANICS.slayer.damageReduction;
    expect(thresholdedDamageReduction(rule, 9.99)).toBe(0);
    expect(thresholdedDamageReduction(rule, 10)).toBeCloseTo(0.01);
    expect(thresholdedDamageReduction(rule, 100)).toBeCloseTo(0.1);
  });

  test("computes record-driven success, skill gain, and proc chances", () => {
    expect(
      rawTierSuccessChance(PROFESSION_MECHANICS.mining.success, 4, 100, 4),
    ).toBeCloseTo(0.6);
    expect(
      skillGainChance(PROFESSION_MECHANICS.fishing.skillGain, 0),
    ).toBeCloseTo(0.6);
    expect(
      linearProcChance(PROFESSION_MECHANICS.radiant_seeker.procChance, 100),
    ).toBeCloseTo(0.25);
  });
});

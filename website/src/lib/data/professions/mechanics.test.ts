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
  [0, 0, 1.05],
  [0, 0, 1],
];

const EXPECTED_GATHERING_TIERS = [
  [0.8, 1, 1],
  [0.3, 0.2, 1],
  [0, 0.15, 0.7],
  [0, 0.1, 0.6],
  [0, 0.05, 0.5],
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

  test("matches the five herbalism tier formulas", () => {
    expect(tierValues(PROFESSION_MECHANICS.herbalism.success.tiers)).toEqual([
      [1, 0, 0],
      [0.3, 0, 2],
      [0.15, 0, 1],
      [0, 0, 1.05],
      [0, 0, 1],
    ]);
    expect(
      rawTierSuccessChance(PROFESSION_MECHANICS.herbalism.success, 3, 60),
    ).toBeCloseTo(0.63);
  });

  // Source: server-scripts/GatherItem.cs:567-575 — low tiers stop granting skill above strict thresholds.
  test("herbalism gain uses a quadratic chance and strict effortless tiers", () => {
    const mechanics = PROFESSION_MECHANICS.herbalism;
    expect(skillGainChance(mechanics.skillGain, 50)).toBeCloseTo(0.8);
    expect(skillGainChance(mechanics.skillGain, 100)).toBeCloseTo(0.35);
    expect(isEffortlessAtTier(mechanics.effortless, 1, 50)).toBe(false);
    expect(isEffortlessAtTier(mechanics.effortless, 1, 51)).toBe(true);
    expect(isEffortlessAtTier(mechanics.effortless, 3, 100)).toBe(false);
  });

  // Source: server-scripts/GatherItem.cs:343-350 — a plant below 10% cannot be gathered.
  test("herbalism reaches the attempt floor at 10% tier-four skill", () => {
    const rule = PROFESSION_MECHANICS.herbalism.success;
    expect(rawTierSuccessChance(rule, 4, 9)).toBeLessThan(rule.floor);
    expect(rawTierSuccessChance(rule, 4, 10)).toBeCloseTo(rule.floor);
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
    ).toBeCloseTo(0.7);
    expect(
      skillGainChance(PROFESSION_MECHANICS.fishing.skillGain, 0),
    ).toBeCloseTo(0.65);
    expect(
      linearProcChance(PROFESSION_MECHANICS.radiant_seeker.procChance, 100),
    ).toBeCloseTo(0.25);
  });
});

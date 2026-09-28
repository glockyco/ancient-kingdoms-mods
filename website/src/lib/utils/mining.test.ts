import { describe, expect, it } from "vitest";
import {
  isMineable,
  isMiningEffortless,
  miningSkillGainChancePercent,
  miningSkillGainRange,
  miningSuccessPercent,
  rawMiningSuccessChance,
} from "./mining";

describe("mining server rules", () => {
  // Source: server-scripts/Utils.cs:GetSuccessProbMining and GatherItem.cs:360-365.
  it("refuses attempts below 20% but permits one exactly at the floor", () => {
    expect(rawMiningSuccessChance(4, 3, 0)).toBeCloseTo(0.15);
    expect(isMineable(4, 3, 0)).toBe(false);
    expect(miningSuccessPercent(4, 3, 0)).toBe(0);
    expect(rawMiningSuccessChance(4, 4, 0)).toBeCloseTo(0.2);
    expect(isMineable(4, 4, 0)).toBe(true);
    expect(miningSuccessPercent(4, 4, 0)).toBeCloseTo(20);
    expect(rawMiningSuccessChance(0, 4, 100)).toBe(1);
  });

  // Source: server-scripts/GatherItem.cs:588-603 — strict thresholds, quadratic chance, inverse success gain.
  it("uses strict effortless thresholds and inverse-success skill gain", () => {
    expect(isMiningEffortless(0, 25)).toBe(false);
    expect(isMiningEffortless(0, 25.01)).toBe(true);
    expect(isMiningEffortless(1, 50)).toBe(false);
    expect(isMiningEffortless(1, 50.01)).toBe(true);
    expect(isMiningEffortless(2, 75)).toBe(false);
    expect(isMiningEffortless(2, 75.01)).toBe(true);
    expect(miningSkillGainChancePercent(0)).toBe(95);
    expect(miningSkillGainChancePercent(50)).toBe(80);
    expect(miningSkillGainChancePercent(100)).toBe(35);
    expect(miningSkillGainRange(1, 1, 0)).toEqual({ min: 0.2, max: 0.6 });
    expect(miningSkillGainRange(4, 3, 0)).toBeNull();
    expect(miningSkillGainRange(0, 0, 26)).toBeNull();
  });
});

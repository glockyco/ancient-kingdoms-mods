import { describe, expect, it } from "vitest";
import { slayerMastery } from "./slayer";

describe("slayerMastery", () => {
  it("adds 1% Slayer mastery per capped target and 0.02% per other kill", () => {
    expect(slayerMastery(30, 120).total).toBeCloseTo(0.324, 6);
  });

  it("stops at 100% once the targets would exceed it", () => {
    expect(slayerMastery(100, 0).total).toBeCloseTo(1, 6);
    expect(slayerMastery(120, 400).total).toBe(1);
  });
});

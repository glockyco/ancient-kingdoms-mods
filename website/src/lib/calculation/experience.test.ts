import { describe, expect, it } from "vitest";
import {
  deathExperience,
  evaluateKillExperience,
  levelExperience,
  killExperience,
  veteranExperience,
} from "./experience";

describe("experience calculations", () => {
  it("reads published float-evaluated level costs", () => {
    const costs = Array.from({ length: 49 }, () => 0);
    costs[39] = 602060;
    costs[40] = 710431;
    expect(levelExperience(costs).example!({ level: 40 }).result).toContain(
      "602,060",
    );
    expect(levelExperience(costs).example!({ level: 41 }).result).toContain(
      "710,431",
    );
  });
  it("uses the current unspent-plus-ranks veteran total", () => {
    expect(veteranExperience().example!({ veteran: 199 }).result).toContain(
      "4,980,000",
    );
    expect(veteranExperience().example!({ veteran: 8 + 51 }).result).toContain(
      "2,180,000",
    );
  });
  it("rounds a split upward and the party bonus to even", () => {
    expect(evaluateKillExperience(1, 20, 20, 3, false)).toMatchObject({
      share: 1,
      balanced: 1,
      bonus: 2,
      total: 3,
    });
    expect(evaluateKillExperience(3, 20, 20, 3, false).total).toBe(3);
    expect(evaluateKillExperience(1000, 20, 20, 3, false).total).toBe(1169);
  });
  it("adds the dungeon percentage before rounding and honors the cutoff", () => {
    expect(evaluateKillExperience(100, 30, 20, 1, true).total).toBe(40);
    expect(evaluateKillExperience(100, 41, 20, 1, true)).toMatchObject({
      multiplier: 0,
      roundedShare: 0,
      balanced: 0,
      total: 0,
    });
    expect(evaluateKillExperience(100, 10, 30, 1, false).total).toBe(150);
  });
  it("uses the numeric values of labelled dungeon choices", () => {
    const calculation = killExperience();
    const input = calculation.inputs!.find(({ key }) => key === "dungeon")!;
    expect(input.choices!.map(({ value }) => value)).toEqual([0, 1]);
    const totals = input.choices!.map(
      ({ value }) => evaluateKillExperience(100, 20, 20, 1, value === 1).total,
    );
    expect(totals).toEqual([100, 110]);
  });
  it("rounds death losses to even before capping by current progress", () => {
    expect(
      deathExperience().example!({ requiredXp: 25, currentXp: 100 }).result,
    ).toContain("2 XP");
    expect(
      deathExperience().example!({ requiredXp: 35, currentXp: 100 }).result,
    ).toContain("4 XP");
    expect(
      deathExperience().example!({ requiredXp: 1000, currentXp: 9 }).result,
    ).toContain("9 XP");
  });
});

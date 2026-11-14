import Database from "better-sqlite3";
import { describe, expect, test } from "vitest";
import type { AcquisitionQuery } from "$lib/acquisition/types";
import { loadChambersRules } from "$lib/chambers/rules";
import { bandCovers, quantityLabel, scalingView, trialDraws } from "./model";

// Expected values are the game's own results for these entries, called through the
// exporter. A run at level 40 with no veteran points and a run at level 50 with 100.
const db = new Database("data/compendium.db", { readonly: true });
const query: AcquisitionQuery = async (sql, params) =>
  db.prepare(sql).all(...params) as Record<string, unknown>[];
const rules = await loadChambersRules(query);

describe("Chambers scaling view", () => {
  test("level 40 with no veteran points", () => {
    const view = scalingView(rules, 40, 0);
    expect(view.ordinary.map((row) => row.level)).toEqual([37, 38, 39, 40, 41]);
    expect(view.guardian.map((row) => row.level)).toEqual([40, 41]);
    expect(view.chambers.map((row) => row.likely.health)).toEqual([
      4200, 4347, 4494, 17976,
    ]);
    expect(view.chambers.map((row) => row.likely.power)).toEqual([
      180, 184, 189, 265,
    ]);
    expect(view.completionExperience).toBe(150000);
    expect(quantityLabel(view.rewardBand)).toBe("1 - 2");
  });

  test("level 50 with 100 veteran points", () => {
    const view = scalingView(rules, 50, 100);
    expect(view.maximumLevelBonus).toBe(6);
    expect(view.ordinary.map((row) => row.level)).toEqual([
      47, 48, 49, 50, 51, 52, 53, 54, 55, 56,
    ]);
    expect(view.guardian.map((row) => row.level)).toEqual([
      50, 51, 52, 53, 54, 55, 56,
    ]);
    expect(view.chambers.map((row) => row.likely.health)).toEqual([
      13045, 13502, 13958, 55832,
    ]);
    expect(view.chambers.map((row) => row.likely.power)).toEqual([
      391, 401, 411, 575,
    ]);
    for (const row of view.chambers) {
      expect(row.healthMin).toBeLessThan(row.healthMax);
      expect(
        row.levels.reduce((sum, level) => sum + level.probability, 0),
      ).toBeCloseTo(1, 12);
    }
    expect(view.completionExperience).toBe(250000);
    expect(quantityLabel(view.rewardBand)).toBe("2 - 4");
  });

  test("the final guardian shares chamber 3's room index and a distinct level range", () => {
    const view = scalingView(rules, 50, 20);
    const [, , third, guardian] = view.chambers;
    expect(guardian.chamber).toBe(third.chamber);
    expect(guardian.levels[0].level).toBe(50);
    expect(third.levels[0].level).toBe(47);
  });

  test("an input outside the exported domain is refused, not nudged", () => {
    expect(() => scalingView(rules, 39, 0)).toThrow(RangeError);
    expect(() => scalingView(rules, 50, 201)).toThrow(RangeError);
  });
});

describe("Chambers reward bands", () => {
  test("exactly one band covers each entry at the band edges", () => {
    for (const [level, veteran, quantity] of [
      [49, 200, "1 - 2"],
      [50, 99, "1 - 3"],
      [50, 100, "2 - 4"],
      [50, 199, "2 - 4"],
      [50, 200, "3 - 5"],
    ] as const) {
      const covering = rules.rewardBands.filter((band) =>
        bandCovers(band, level, veteran),
      );
      expect(covering).toHaveLength(1);
      expect(quantityLabel(covering[0])).toBe(quantity);
    }
  });
});

describe("Chambers trial bag", () => {
  test("counts the draws of each kind", () => {
    const draws = trialDraws(
      (
        db
          .prepare("SELECT trial_kind FROM chambers_trial_bag ORDER BY ordinal")
          .all() as { trial_kind: string }[]
      ).map((row) => row.trial_kind),
    );
    expect(
      Object.fromEntries(draws.map((row) => [row.kind, row.count])),
    ).toEqual({
      Battle: 2,
      Waves: 2,
      Riddle: 1,
      Runes: 1,
      Manuscript: 1,
    });
  });
});

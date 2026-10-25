import { describe, expect, it } from "vitest";
import { mercenaryStats, mercenaryHiringOdds } from "./mercenary-stats";
import type { Curves } from "$lib/utils/merc-stats";
import { computeAll } from "$lib/utils/merc-stats";

const curves: Curves = {
  Warrior: { hp_base: 110, hp_per: 110, mana_base: 0, mana_per: 0 },
  Ranger: { hp_base: 80, hp_per: 80, mana_base: 15, mana_per: 5 },
  Cleric: { hp_base: 80, hp_per: 80, mana_base: 20, mana_per: 10 },
  Rogue: { hp_base: 60, hp_per: 60, mana_base: 0, mana_per: 0 },
  Wizard: { hp_base: 50, hp_per: 50, mana_base: 20, mana_per: 15 },
  Druid: { hp_base: 55, hp_per: 55, mana_base: 20, mana_per: 10 },
  Bard: { hp_base: 70, hp_per: 70, mana_base: 0, mana_per: 0 },
  Necromancer: { hp_base: 50, hp_per: 50, mana_base: 20, mana_per: 15 },
};

function classAt(cls: string, level: number, veteran: number) {
  return computeAll(level, veteran, curves).find(
    (result) => result.cls === cls,
  )!;
}
describe("mercenary stat worked examples", () => {
  it("uses the calculator's low resource endpoints and zero combat roll", () => {
    const example = mercenaryStats(
      classAt("Warrior", 50, 200),
      50,
      200,
      curves,
      "Dwarf",
    ).example!({});
    expect(example.result.match(/\d[\d\u202F]*/g)).toEqual([
      "8\u202F875",
      "216",
      "215",
    ]);
  });
  it("rounds Intelligence halves to even before adding veteran points", () => {
    const low = mercenaryStats(classAt("Wizard", 10, 0), 10, 0, curves, "Human")
      .example!({});
    const high = mercenaryStats(
      classAt("Wizard", 14, 0),
      14,
      0,
      curves,
      "Human",
    ).example!({});
    expect(low.result).toMatch(/8 Spell/);
    expect(high.result).toMatch(/10 Spell/);
  });
});

describe("mercenary hiring expectations", () => {
  it("combines race and stat probabilities without whole-hire rounding", () => {
    const result = mercenaryHiringOdds(0.25, 0.4, 50).example!({}).result;
    expect(result).toContain("10%");
    expect(result).toContain("10 hires");
    expect(result).toContain("500 gold");
  });
  it("uses the singular hire unit for a guaranteed result", () => {
    expect(mercenaryHiringOdds(1, 1, 50).example!({}).result).toContain(
      "1 hire and",
    );
  });
  it("rounds the display but calculates gold from unrounded expected hires", () => {
    const result = mercenaryHiringOdds(1, 0.3, 100).example!({}).result;
    expect(result).toContain("3.3 hires");
    expect(result).toContain("333 gold");
  });
});

import { describe, expect, it } from "vitest";
import {
  applyHonestyGain,
  escortStats,
  honorPoints,
  honorPointsAtLevel,
  isEligibleLevel,
  sacrificeItemLevel,
  sacrificeOfferingPoints,
  valorQuarryLevels,
} from "./virtues";

const grimlok = { level: 38, health: 30000, isBoss: true, isElite: false };

describe("Honor", () => {
  it("gives a level 38 boss with 30,000 Health 30 points without a level bonus", () => {
    expect(honorPointsAtLevel(grimlok)).toBe(30);
  });

  it("doubles the base points for a foe 10 or more levels above you", () => {
    expect(honorPoints(grimlok, 28)).toBe(60);
    expect(honorPoints(grimlok, 20)).toBe(60);
  });

  it("gives a weak foe at least 1 point", () => {
    expect(
      honorPointsAtLevel({
        level: 10,
        health: 1,
        isBoss: false,
        isElite: false,
      }),
    ).toBe(1);
  });
});

describe("level window", () => {
  it("counts monsters from 2 levels below you", () => {
    expect(isEligibleLevel(40, 38)).toBe(true);
    expect(isEligibleLevel(40, 37)).toBe(false);
  });

  it("names Valor quarries from 2 levels below to 5 above", () => {
    expect(valorQuarryLevels(40)).toEqual([38, 45]);
  });
});

describe("Honesty", () => {
  it("raises a positive gain and rounds half to even", () => {
    expect(applyHonestyGain(100, 0)).toBe(102);
    expect(applyHonestyGain(100, 5)).toBe(125);
  });

  it("leaves losses and an inactive blessing alone", () => {
    expect(applyHonestyGain(-50, 5)).toBe(-50);
    expect(applyHonestyGain(100, null)).toBe(100);
  });
});

describe("Sacrifice", () => {
  const boots = {
    item_level: 50,
    quality: 1,
    sellable: 1,
    destroyable: 1,
    is_quest_item: 0,
  };

  it("rounds an offering down in thousandths of a point", () => {
    expect(sacrificeOfferingPoints([120], 2500)).toBe(4);
    expect(sacrificeOfferingPoints([25, 25], 0)).toBe(1);
    expect(sacrificeOfferingPoints([49], 0)).toBe(0);
  });

  it("caps an offering at the maximum points", () => {
    expect(sacrificeOfferingPoints([], 99_000_000)).toBe(15000);
  });

  it("refuses Common, unsellable and quest equipment", () => {
    expect(sacrificeItemLevel(boots)).toBe(50);
    expect(sacrificeItemLevel({ ...boots, quality: 0 })).toBe(0);
    expect(sacrificeItemLevel({ ...boots, sellable: 0 })).toBe(0);
    expect(sacrificeItemLevel({ ...boots, is_quest_item: 1 })).toBe(0);
  });
});

describe("stranded adventurer", () => {
  const monster = (level: number) => ({
    level,
    health_base: 100,
    health_per_level: 10,
    health_multiplier: 1.5,
  });

  it("takes the median level and the median Health ×1.5", () => {
    expect(escortStats([monster(33), monster(30), monster(31)])).toEqual({
      level: 31,
      health: 900,
    });
  });

  it("rounds an even count's median half to even", () => {
    expect(escortStats([monster(30), monster(31)])?.level).toBe(30);
  });

  it("has no adventurer without ordinary monsters", () => {
    expect(escortStats([])).toBeNull();
  });
});

import { describe, expect, test } from "vitest";
import {
  computeAll,
  hirePrice,
  charismaDiscount,
  obtainableRaces,
  pRaceAtRecruiter,
  type Curves,
} from "./merc-stats";

// Curves from the shipped compendium DB (pets where is_mercenary=1).
const CURVES: Curves = {
  Warrior: { hp_base: 110, hp_per: 110, mana_base: 0, mana_per: 0 },
  Rogue: { hp_base: 60, hp_per: 60, mana_base: 0, mana_per: 0 },
  Cleric: { hp_base: 80, hp_per: 80, mana_base: 20, mana_per: 10 },
  Wizard: { hp_base: 50, hp_per: 50, mana_base: 20, mana_per: 15 },
  Druid: { hp_base: 55, hp_per: 55, mana_base: 20, mana_per: 10 },
  Ranger: { hp_base: 80, hp_per: 80, mana_base: 15, mana_per: 5 },
};

function row(cls: string, race: string, level: number, veteran: number) {
  const c = computeAll(level, veteran, CURVES).find((x) => x.cls === cls)!;
  return c.rows.find((r) => r.race === race)!;
}

describe("computeAll", () => {
  test("Warrior/Dwarf at level 50 veteran 200 (banker's rounding edge cases)", () => {
    const r = row("Warrior", "Dwarf", 50, 200);
    expect(r.hp).toEqual([8875, 9150]);
    expect(r.atk).toEqual([16, 50]);
    expect(r.spell).toEqual([15, 49]);
  });

  test("Warrior/Felarii base-combat factor (bc 0.95)", () => {
    const r = row("Warrior", "Felarii", 50, 200);
    expect(r.atk).toEqual([16, 63]);
  });

  test("Wizard/Human caster row at 50/200", () => {
    const r = row("Wizard", "Human", 50, 200);
    expect(r.hp).toEqual([3875, 4000]);
    expect(r.mana).toEqual([1595, 1632]);
    expect(r.spell).toEqual([38, 82]);
  });

  test("low level: Warrior/Dwarf at 20/0", () => {
    expect(row("Warrior", "Dwarf", 20, 0).hp).toEqual([2450, 2560]);
  });

  test("ineligible race is marked, not computed", () => {
    expect(row("Rogue", "Elf", 50, 0).eligible).toBe(false);
  });

  test("Drassar is recruiter-only for a class that can be it", () => {
    const r = row("Wizard", "Drassar", 50, 200);
    expect(r.eligible).toBe(true);
    expect(r.preferredOnly).toBe(true);
    expect(r.hp).toEqual([3875, 4000]);
    expect(r.mana).toEqual([1557, 1595]);
    expect(r.spell).toEqual([38, 85]);
  });

  test("a Druid is never Drassar", () => {
    expect(row("Druid", "Drassar", 50, 200).eligible).toBe(false);
  });
});

describe("hiring cost helpers", () => {
  test("hire price", () => {
    expect(hirePrice(50, 0)).toBe(420);
    expect(hirePrice(10, 0)).toBe(20);
    expect(hirePrice(50, 200)).toBe(3420);
  });

  test("charisma discount caps at 25%", () => {
    expect(charismaDiscount(0)).toBe(0);
    expect(charismaDiscount(60)).toBeCloseTo(0.12, 10);
    expect(charismaDiscount(125)).toBe(0.25);
    expect(charismaDiscount(200)).toBe(0.25);
  });

  test("a race no recruiter hires is unobtainable, whatever the pool says", () => {
    // One recruiter, hiring Dwarf: a Wizard cannot be Dwarf, so the preference
    // cannot apply and the roll falls back to the whole Wizard pool.
    expect(obtainableRaces("Wizard", ["Dwarf"])).toEqual([
      "Human",
      "Elf",
      "Dark Elf",
      "Fire Goblin",
      "Felarii",
    ]);
    // Every recruiter states a race, so only those races are reachable.
    expect(obtainableRaces("Wizard", ["Human", "Elf"])).toEqual([
      "Human",
      "Elf",
    ]);
    // Losing the only Felarii recruiter removes Felarii, with no rule per race.
    expect(obtainableRaces("Druid", ["Human", "Elf", "Fire Goblin"])).toEqual([
      "Human",
      "Elf",
      "Fire Goblin",
    ]);
    // A pool-less race needs its own recruiter.
    expect(obtainableRaces("Wizard", ["Drassar"])).toEqual(["Drassar"]);
    expect(obtainableRaces("Druid", ["Drassar"])).toEqual([
      "Human",
      "Elf",
      "Fire Goblin",
      "Felarii",
    ]);
  });

  test("race probability follows the recruiter preference", () => {
    expect(pRaceAtRecruiter("Wizard", "Human", "Human")).toBe(1);
    expect(pRaceAtRecruiter("Wizard", "Felarii", "Human")).toBe(0);
    expect(pRaceAtRecruiter("Wizard", "Drassar", "Drassar")).toBe(1);
    // Dwarf is outside the Wizard pool, so the preference cannot apply.
    expect(pRaceAtRecruiter("Wizard", "Human", "Dwarf")).toBe(1 / 5);
    expect(pRaceAtRecruiter("Wizard", "Dwarf", "Dwarf")).toBe(0);
    // A Druid cannot be Drassar, so that recruiter rolls the Druid pool.
    expect(pRaceAtRecruiter("Druid", "Human", "Drassar")).toBe(1 / 4);
    expect(pRaceAtRecruiter("Druid", "Drassar", "Drassar")).toBe(0);
  });
});

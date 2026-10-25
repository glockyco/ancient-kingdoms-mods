import { describe, expect, it } from "vitest";
import { monsterKillReputation, npcKillReputation } from "./killReputation";

const baseMonster = {
  level_min: 10,
  level_max: 10,
  health: 4500,
  is_boss: false,
  is_elite: false,
  improve_faction: ["Army of Order"],
  decrease_faction: ["Dark Alliance"],
};

describe("monsterKillReputation", () => {
  it.each([
    [{}, 12, 7.5],
    [{ is_elite: true }, 120, 10],
    [{ is_boss: true, is_elite: true }, 240, 20],
    [{ level_min: 7, level_max: 7 }, 9, 5.25],
  ] as const)(
    "keeps rank multipliers and fractional amounts for %j",
    (overrides, gain, loss) => {
      expect(
        monsterKillReputation({ ...baseMonster, ...overrides }),
      ).toMatchObject([
        {
          direction: "improve",
          amount_min: gain,
          amount_max: gain,
          factions: ["Army of Order"],
        },
        {
          direction: "decrease",
          amount_min: loss,
          amount_max: loss,
          factions: ["Dark Alliance"],
        },
      ]);
    },
  );

  it("retains both bounds across different spawn levels", () => {
    expect(
      monsterKillReputation({ ...baseMonster, level_max: 14 }),
    ).toMatchObject([
      { direction: "improve", amount_min: 12, amount_max: 16 },
      { direction: "decrease", amount_min: 7.5, amount_max: 10.5 },
    ]);
  });

  it("uses midpoint-to-even rounding for the health contribution", () => {
    expect(
      monsterKillReputation({ ...baseMonster, health: 1000 })[0].amount_min,
    ).toBe(10);
    expect(
      monsterKillReputation({ ...baseMonster, health: 3000 })[0].amount_min,
    ).toBe(12);
  });

  it("applies one amount to all factions in a direction and omits empty directions", () => {
    expect(
      monsterKillReputation({
        ...baseMonster,
        improve_faction: ["Army of Order", "Elven Kingdom"],
        decrease_faction: [],
      }),
    ).toMatchObject([
      {
        direction: "improve",
        amount_min: 12,
        amount_max: 12,
        factions: ["Army of Order", "Elven Kingdom"],
      },
    ]);
  });
});

describe("npcKillReputation", () => {
  it.each([
    [8, false, 12, 40],
    [60, true, 5400, 300],
    [7, false, 10.5, 35],
  ] as const)(
    "keeps gain and loss rules at level %s, notable=%s",
    (level, is_notable, gain, loss) => {
      expect(
        npcKillReputation({
          level,
          is_notable,
          invincible: false,
          improve_faction: ["Army of Order"],
          decrease_faction: ["The Forsaken"],
        }),
      ).toMatchObject([
        { direction: "improve", amount_min: gain, amount_max: gain },
        { direction: "decrease", amount_min: loss, amount_max: loss },
      ]);
    },
  );

  it("changes no reputation for an NPC that cannot be killed", () => {
    expect(
      npcKillReputation({
        level: 50,
        is_notable: false,
        invincible: true,
        improve_faction: ["The Forsaken"],
        decrease_faction: ["Children of Illithor"],
      }),
    ).toEqual([]);
  });
});

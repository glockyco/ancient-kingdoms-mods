import { describe, expect, it } from "vitest";
import { monsterKillReputation, npcKillReputation } from "./killReputation";

const baseMonster = {
  level_min: 10,
  level_max: 10,
  is_boss: false,
  is_elite: false,
  improve_faction: ["Army of Order"],
  decrease_faction: ["Dark Alliance"],
};

describe("monsterKillReputation", () => {
  it("uses normal multipliers (improve 1, decrease 0.5)", () => {
    expect(monsterKillReputation(baseMonster)).toEqual([
      { direction: "improve", amount: "10", factions: ["Army of Order"] },
      { direction: "decrease", amount: "5", factions: ["Dark Alliance"] },
    ]);
  });

  it("uses elite multipliers (improve 10, decrease 1)", () => {
    const elite = { ...baseMonster, is_elite: true };
    expect(monsterKillReputation(elite).map((e) => e.amount)).toEqual([
      "100",
      "10",
    ]);
  });

  it("uses boss multipliers (improve 20, decrease 2) and prefers boss over elite", () => {
    const boss = { ...baseMonster, is_boss: true, is_elite: true };
    expect(monsterKillReputation(boss).map((e) => e.amount)).toEqual([
      "200",
      "20",
    ]);
  });

  it("preserves the half-point produced by fractional multipliers", () => {
    const oddLevel = { ...baseMonster, level_min: 7, level_max: 7 };
    expect(monsterKillReputation(oddLevel).map((e) => e.amount)).toEqual([
      "7",
      "3.5",
    ]);
  });

  it("renders a range across the spawn levels", () => {
    const ranged = { ...baseMonster, level_min: 10, level_max: 14 };
    expect(monsterKillReputation(ranged).map((e) => e.amount)).toEqual([
      "10-14",
      "5-7",
    ]);
  });

  it("groups every faction of a direction under one shared amount", () => {
    const worldBoss = {
      level_min: 58,
      level_max: 58,
      is_boss: true,
      is_elite: false,
      improve_faction: [
        "Army of Order",
        "Elven Kingdom",
        "Children of Illithor",
        "Dark Alliance",
      ],
      decrease_faction: [],
    };
    expect(monsterKillReputation(worldBoss)).toEqual([
      {
        direction: "improve",
        amount: "1,160",
        factions: [
          "Army of Order",
          "Elven Kingdom",
          "Children of Illithor",
          "Dark Alliance",
        ],
      },
    ]);
  });

  it("omits a direction with no factions", () => {
    const improveOnly = { ...baseMonster, decrease_faction: [] };
    expect(monsterKillReputation(improveOnly).map((e) => e.direction)).toEqual([
      "improve",
    ]);
  });
});

describe("npcKillReputation", () => {
  it("uses improve 1.5 and decrease 5 multipliers", () => {
    const npc = {
      level: 8,
      improve_faction: ["Army of Order"],
      decrease_faction: ["The Forsaken"],
    };
    expect(npcKillReputation(npc)).toEqual([
      { direction: "improve", amount: "12", factions: ["Army of Order"] },
      { direction: "decrease", amount: "40", factions: ["The Forsaken"] },
    ]);
  });

  it("preserves the half-point from the improve multiplier", () => {
    const npc = {
      level: 7,
      improve_faction: ["Army of Order"],
      decrease_faction: [],
    };
    expect(npcKillReputation(npc).map((e) => e.amount)).toEqual(["10.5"]);
  });
});

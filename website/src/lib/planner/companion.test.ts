import { describe, expect, it } from "vitest";
import type { CasterBaseCurves, CasterEquipmentPiece } from "./caster";
import {
  buildCompanionCombatState,
  companionProgressionAttributes,
  companionSkillLevel,
  type CompanionArchetype,
  type CompanionRace,
} from "./companion";

const curves: CasterBaseCurves = {
  health: { base: 100, perLevel: 0 },
  mana: { base: 100, perLevel: 0 },
  energy: { base: 100, perLevel: 0 },
  damage: { base: 1, perLevel: 0 },
  magicDamage: { base: 1, perLevel: 0 },
  defense: { base: 0, perLevel: 0 },
  magicResist: { base: 0, perLevel: 0 },
  poisonResist: { base: 0, perLevel: 0 },
  fireResist: { base: 0, perLevel: 0 },
  coldResist: { base: 0, perLevel: 0 },
  diseaseResist: { base: 0, perLevel: 0 },
  blockChance: { base: 0, perLevel: 0 },
  accuracy: { base: 0, perLevel: 0 },
  criticalChance: { base: 0, perLevel: 0 },
};

function state(args: {
  archetype?: CompanionArchetype;
  race?: CompanionRace;
  ownerLevel?: number;
  veteranPoints?: number;
  roll?:
    | { mode: "best" }
    | {
        mode: "owned";
        healthMultiplier: number;
        resourceMultiplier: number;
        baseCombat: number;
      };
  equipment?: readonly CasterEquipmentPiece[];
}) {
  return buildCompanionCombatState({
    archetype: args.archetype ?? "warrior",
    race: args.race ?? "human",
    ownerLevel: args.ownerLevel ?? 1,
    veteranPoints: args.veteranPoints ?? 0,
    roll: args.roll ?? {
      mode: "owned",
      healthMultiplier: 1,
      resourceMultiplier: 1,
      baseCombat: 10,
    },
    caster: {
      curves,
      learnedBooks: { ids: [], catalog: [] },
      equipment: args.equipment ?? [],
    },
  });
}

describe("companion state", () => {
  it("derives skill levels from owner and veteran progression", () => {
    expect(companionSkillLevel(50, 200, 50)).toBe(30);
    expect(companionSkillLevel(50, 200, 5)).toBe(5);
  });

  it.each([
    ["warrior", "constitution", 6],
    ["ranger", "dexterity", 6],
    ["cleric", "wisdom", 6],
    ["rogue", "dexterity", 6],
    ["wizard", "intelligence", 6],
    ["druid", "wisdom", 6],
  ] as const)(
    "applies the %s progression cadence",
    (archetype, leadingAttribute, expected) => {
      expect(
        companionProgressionAttributes(archetype, 12)[leadingAttribute],
      ).toBe(expected);
    },
  );

  it.each([
    ["human", 44, 1, 1],
    ["elf", 34, 0.95, 1.05],
    ["dwarf", 34, 1.05, 0.95],
    ["dark_elf", 44, 0.95, 1.05],
    ["fire_goblin", 44, 1, 0.95],
    ["felarii", 47, 0.95, 0.95],
    ["drassar", 47, 1, 0.95],
  ] as const)(
    "uses the reachable best %s hire roll",
    (race, combat, health, mana) => {
      const result = state({
        archetype: "wizard",
        race,
        ownerLevel: 50,
        roll: { mode: "best" },
      });
      expect(result.baseCombat).toBe(combat);
      expect(result.healthMultiplier).toBeCloseTo(health);
      expect(result.resourceMultiplier).toBeCloseTo(mana);
      expect(result.assumptions).toContain("best_rehire_roll");
    },
  );

  it("adds veteran accumulation to a best roll but not to base combat", () => {
    const result = state({
      archetype: "wizard",
      ownerLevel: 50,
      veteranPoints: 200,
      roll: { mode: "best" },
    });
    expect(result.baseCombat).toBe(44);
    expect(result.healthMultiplier).toBeCloseTo(1.5);
    expect(result.resourceMultiplier).toBeCloseTo(1.5);
  });

  it("uses an owned roll exactly", () => {
    const result = state({
      roll: {
        mode: "owned",
        healthMultiplier: 0.93,
        resourceMultiplier: 1.02,
        baseCombat: 47,
      },
      veteranPoints: 200,
    });
    expect(result.healthMultiplier).toBe(0.93);
    expect(result.resourceMultiplier).toBe(1.02);
    expect(result.baseCombat).toBe(47);
    expect(result.assumptions).toContain("owned_roll");
  });

  it("applies a mana multiplier and preserves the inert energy multiplier defect", () => {
    const wizard = state({
      archetype: "wizard",
      roll: {
        mode: "owned",
        healthMultiplier: 1,
        resourceMultiplier: 1.5,
        baseCombat: 10,
      },
    });
    const warrior = state({
      archetype: "warrior",
      roll: {
        mode: "owned",
        healthMultiplier: 1,
        resourceMultiplier: 1.5,
        baseCombat: 10,
      },
    });
    expect(wizard.sheet.mana).toBe(150);
    expect(warrior.sheet.energy).toBe(100);
    expect(warrior.assumptions).toContain("energy_multiplier_ignored");
  });

  it("feeds companion equipment through direct and attribute stat contributions", () => {
    const piece = (item: {
      damage?: number;
      strength?: number;
    }): CasterEquipmentPiece => ({
      slot: 0,
      amount: 1,
      durability: 10,
      item,
    });
    const bare = state({}).sheet.damage;
    const direct = state({ equipment: [piece({ damage: 20 })] }).sheet.damage;
    const attribute = state({ equipment: [piece({ strength: 10 })] }).sheet
      .damage;
    const both = state({ equipment: [piece({ damage: 20, strength: 10 })] })
      .sheet.damage;
    expect(direct - bare).toBe(20);
    expect(attribute - bare).toBe(10);
    expect(both - bare).toBe(30);
  });
});

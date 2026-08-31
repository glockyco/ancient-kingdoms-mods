import { describe, expect, it } from "vitest";
import type { CasterBaseCurves, CasterEquipmentPiece } from "./caster";
import {
  buildCompanionCombatState,
  companionActionCadence,
  companionProgressionAttributes,
  companionSkillLevel,
  expectedCompanionActions,
  type CompanionAction,
  type CompanionArchetype,
  type CompanionMovementState,
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
    caster: { curves, equipment: args.equipment ?? [] },
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

describe("companion cadence", () => {
  it("does not take weapon delay and reduces a followup cooldown with haste", () => {
    const ordinary = companionActionCadence({
      castTime: 0.4,
      cooldown: 1,
      followupDefaultAttack: true,
      isSpell: false,
      haste: 0,
    });
    const hasted = companionActionCadence({
      castTime: 0.4,
      cooldown: 1,
      followupDefaultAttack: true,
      isSpell: false,
      haste: 0.5,
    });
    const special = companionActionCadence({
      castTime: 0.4,
      cooldown: 0.2,
      followupDefaultAttack: false,
      isSpell: false,
      haste: 0.9,
    });
    expect(ordinary).toMatchObject({ period: 1.4, cooldown: 1 });
    expect(hasted).toMatchObject({ period: 0.9, cooldown: 0.5 });
    expect(special.cooldown).toBe(0.2);
    expect(special.period).toBeCloseTo(0.6);
  });
});

function companionAction(
  overrides: Partial<CompanionAction> & Pick<CompanionAction, "id">,
): CompanionAction {
  return {
    isDefault: false,
    isSpecial: true,
    isOffensive: true,
    isDebuff: false,
    ready: true,
    expectedDamage: 90,
    castTime: 0.5,
    cooldown: 1,
    followupDefaultAttack: false,
    isSpell: false,
    haste: 0,
    manaCost: 0,
    ...overrides,
  };
}

function expectation(args: {
  actions: readonly CompanionAction[];
  archetype?: CompanionArchetype;
  hasHeals?: boolean;
  currentMana?: number;
  maximumMana?: number;
  movement?: CompanionMovementState;
}) {
  return expectedCompanionActions({
    archetype: args.archetype ?? "wizard",
    hasHeals: args.hasHeals ?? false,
    currentMana: args.currentMana ?? 100,
    maximumMana: args.maximumMana ?? 100,
    movement: args.movement ?? "in_range",
    actions: args.actions,
  });
}

const defaultAction = companionAction({
  id: "default",
  isDefault: true,
  isSpecial: false,
  expectedDamage: 30,
  castTime: 0.5,
  cooldown: 1,
  followupDefaultAttack: true,
});

describe("companion action expectation", () => {
  it("shares the three-second special gate uniformly among ready actions", () => {
    const result = expectation({
      actions: [
        defaultAction,
        companionAction({ id: "a" }),
        companionAction({ id: "b" }),
      ],
    });
    expect(
      result.actionRates.find((rate) => rate.actionId === "a")?.usesPerSecond,
    ).toBeCloseTo(1 / 6);
    expect(
      result.actionRates.find((rate) => rate.actionId === "b")?.usesPerSecond,
    ).toBeCloseTo(1 / 6);
    expect(
      result.actionRates.find((rate) => rate.actionId === "a")?.binding,
    ).toBe("special_selection");
  });

  it("redistributes selection share when one action's cadence is slower", () => {
    const result = expectation({
      actions: [
        defaultAction,
        companionAction({ id: "slow", castTime: 0, cooldown: 10 }),
        companionAction({ id: "fast", castTime: 0, cooldown: 1 }),
      ],
    });
    expect(
      result.actionRates.find((rate) => rate.actionId === "slow")
        ?.usesPerSecond,
    ).toBeCloseTo(0.1);
    expect(
      result.actionRates.find((rate) => rate.actionId === "fast")
        ?.usesPerSecond,
    ).toBeCloseTo(1 / 3 - 0.1);
    expect(
      result.actionRates.find((rate) => rate.actionId === "slow")?.binding,
    ).toBe("cooldown");
    expect(
      result.actionRates.find((rate) => rate.actionId === "fast")?.binding,
    ).toBe("special_selection");
  });

  it("gives a ready Warrior Challenge priority outside random selection", () => {
    const result = expectation({
      archetype: "warrior",
      actions: [
        defaultAction,
        companionAction({ id: "challenge", isWarriorChallenge: true }),
        companionAction({ id: "other" }),
      ],
    });
    expect(
      result.actionRates.find((rate) => rate.actionId === "challenge")
        ?.usesPerSecond,
    ).toBeCloseTo(1 / 1.5);
    expect(
      result.actionRates.find((rate) => rate.actionId === "other")
        ?.usesPerSecond,
    ).toBeCloseTo(1 / 3);
  });

  it("preserves exactly 35 percent mana for healer offense", () => {
    const offensive = companionAction({ id: "offense", manaCost: 10 });
    const allowed = expectation({
      hasHeals: true,
      currentMana: 45,
      maximumMana: 100,
      actions: [defaultAction, offensive],
    });
    const refused = expectation({
      hasHeals: true,
      currentMana: 44,
      maximumMana: 100,
      actions: [defaultAction, offensive],
    });
    expect(allowed.exclusions).not.toContainEqual({
      actionId: "offense",
      reason: "healer_reserve",
    });
    expect(refused.exclusions).toContainEqual({
      actionId: "offense",
      reason: "healer_reserve",
    });
  });

  it("excludes an existing debuff and a non-offensive support action", () => {
    const result = expectation({
      actions: [
        defaultAction,
        companionAction({
          id: "debuff",
          isDebuff: true,
          targetAlreadyHasDebuff: true,
        }),
        companionAction({ id: "buff", isOffensive: false }),
      ],
    });
    expect(result.exclusions).toEqual([
      { actionId: "debuff", reason: "existing_debuff" },
      { actionId: "buff", reason: "not_offensive" },
    ]);
  });

  it.each([
    ["in_range", "reachable_in_range", "number"],
    ["closing_distance", "movement_can_reduce_rate", "object"],
    ["engine_controlled", "movement_can_reduce_rate", "object"],
    ["hold_position_out_of_range", "held_out_of_range", "number"],
  ] as const)(
    "qualifies the %s movement state",
    (movement, qualification, reachableType) => {
      const result = expectation({ actions: [defaultAction], movement });
      expect(result.movementQualification).toBe(qualification);
      expect(typeof result.reachableExpectedDamagePerSecond).toBe(
        reachableType,
      );
      if (movement === "hold_position_out_of_range") {
        expect(result.reachableExpectedDamagePerSecond).toBe(0);
      }
    },
  );
});

import { describe, expect, it } from "vitest";
import {
  actionGateRefusal,
  evaluateSkillAllocation,
  weaponGateRefusal,
  type ActionGateSkill,
  type ActionGateState,
  type AllocatableSkill,
} from "./legality";

function skill(
  overrides: Partial<AllocatableSkill> & Pick<AllocatableSkill, "id">,
): AllocatableSkill {
  return {
    player_classes: ["warrior"],
    tier: 0,
    max_level: 5,
    learn_default: false,
    is_veteran: false,
    level_requirement: { base_value: 1, bonus_per_level: 0 },
    skill_point_cost: { base_value: 1, bonus_per_level: 0 },
    required_spent_points: 0,
    prerequisite_skill_id: null,
    prerequisite_level: 0,
    prerequisite2_skill_id: null,
    prerequisite2_level: 0,
    ...overrides,
  };
}

function allocation(
  skills: readonly AllocatableSkill[],
  requestedLevels: Readonly<Record<string, number>>,
  overrides: Partial<{
    classId: string;
    level: number;
    veteranPoints: number;
  }> = {},
) {
  return evaluateSkillAllocation({
    classId: "warrior",
    level: 50,
    veteranPoints: 0,
    skills,
    requestedLevels,
    ...overrides,
  });
}

describe("evaluateSkillAllocation", () => {
  it("keeps normal and veteran budgets separate", () => {
    const normal = skill({ id: "normal", max_level: 49 });
    const veteran = skill({ id: "veteran", max_level: 3, is_veteran: true });
    const result = allocation(
      [normal, veteran],
      { normal: 49, veteran: 2 },
      { veteranPoints: 2 },
    );
    expect(result.feasible).toBe(true);
    expect(result.normalPointsSpent).toBe(49);
    expect(result.veteranPointsSpent).toBe(2);
  });

  it("rejects veteran points below the level cap", () => {
    const result = allocation([], {}, { level: 49, veteranPoints: 1 });
    expect(result.failures).toContainEqual({ code: "veteran_before_cap" });
  });

  it("rejects upgrades above their level requirement and point budget", () => {
    const levelLocked = skill({
      id: "level_locked",
      level_requirement: { base_value: 10, bonus_per_level: 10 },
    });
    const expensive = skill({
      id: "expensive",
      skill_point_cost: { base_value: 2, bonus_per_level: 0 },
    });
    expect(
      allocation([levelLocked], { level_locked: 2 }, { level: 19 }).failures,
    ).toContainEqual({
      code: "level_requirement",
      skillId: "level_locked",
    });
    expect(
      allocation([expensive], { expensive: 1 }, { level: 2 }).failures,
    ).toContainEqual({
      code: "point_budget",
      skillId: "expensive",
    });
  });

  it("finds an upgrade order that satisfies spent-point gates", () => {
    const locked = skill({ id: "locked", required_spent_points: 1 });
    const seed = skill({ id: "seed" });
    const result = allocation([locked, seed], { locked: 1, seed: 1 });
    expect(result.feasible).toBe(true);
    expect(result.levels).toMatchObject({ locked: 1, seed: 1 });
  });

  it("requires both predecessors at their stated levels", () => {
    const first = skill({ id: "first" });
    const second = skill({ id: "second" });
    const dependent = skill({
      id: "dependent",
      prerequisite_skill_id: "first",
      prerequisite_level: 2,
      prerequisite2_skill_id: "second",
      prerequisite2_level: 1,
    });
    expect(
      allocation([first, second, dependent], {
        first: 2,
        second: 0,
        dependent: 1,
      }).failures,
    ).toContainEqual({ code: "prerequisite", skillId: "dependent" });
    expect(
      allocation([first, second, dependent], {
        first: 2,
        second: 1,
        dependent: 1,
      }).feasible,
    ).toBe(true);
  });

  it("enforces tier limits above each skill's default level", () => {
    const choices = ["a", "b", "c"].map((id) =>
      skill({ id, tier: 1, learn_default: true, max_level: 2 }),
    );
    const result = allocation(choices, { a: 2, b: 2, c: 2 });
    expect(result.failures).toContainEqual({
      code: "tier_limit",
      skillId: "c",
    });
  });

  it("rejects unknown, wrong-class, and invalid allocations", () => {
    const mage = skill({ id: "mage", player_classes: ["wizard"] });
    const ordinary = skill({ id: "ordinary" });
    const result = allocation([mage, ordinary], {
      absent: 1,
      mage: 1,
      ordinary: 6,
    });
    expect(result.failures.map((failure) => failure.code)).toEqual([
      "unknown_skill",
      "wrong_class",
      "invalid_level",
    ]);
  });
});

const gateSkill: ActionGateSkill = {
  id: "strike",
  requiredWeaponCategory: "WeaponSword",
  allowDungeon: true,
  isAssassination: false,
  manaCost: 0,
  energyCost: 0,
};

function gateState(overrides: Partial<ActionGateState> = {}): ActionGateState {
  return {
    learnedLevel: 1,
    casterHealth: 100,
    casterMana: 100,
    casterEnergy: 100,
    inDungeon: false,
    weapon: {
      classId: "warrior",
      equippedWeaponCategory: "WeaponSword2H",
      mainHandOccupied: true,
      offhandOccupied: false,
    },
    targetHealth: 100,
    targetMaximumHealth: 100,
    ...overrides,
  };
}

describe("engine cast preconditions", () => {
  it.each([
    [{ learnedLevel: 0 }, "not_learned"],
    [{ casterHealth: 0 }, "caster_dead"],
    [{ casterMana: 4 }, "mana", { manaCost: 5 }],
    [{ casterEnergy: 4 }, "energy", { energyCost: 5 }],
    [{ inDungeon: true }, "dungeon", { allowDungeon: false }],
  ] as const)(
    "returns %s as %s",
    (
      stateOverride: Partial<ActionGateState>,
      expected: string,
      skillOverride: Partial<ActionGateSkill> = {},
    ) => {
      expect(
        actionGateRefusal(
          { ...gateSkill, ...skillOverride },
          gateState(stateOverride),
        ),
      ).toBe(expected);
    },
  );

  it("matches the engine's special offhand and Rogue weapon checks", () => {
    const weapon = gateState().weapon;
    expect(weaponGateRefusal(weapon, "Bow")).toBe("requires Bow");
    expect(
      weaponGateRefusal({ ...weapon, offhandOccupied: true }, "Bow"),
    ).toBeNull();
    expect(
      weaponGateRefusal(
        { ...weapon, classId: "rogue", mainHandOccupied: false },
        "WeaponSword",
      ),
    ).toBe("requires an occupied main hand");
    expect(weaponGateRefusal(weapon, "WeaponDagger")).toBe(
      "requires WeaponDagger",
    );
  });

  it("uses the engine's rounded quarter-health assassination boundary", () => {
    const assassination = {
      ...gateSkill,
      isAssassination: true,
      requiredWeaponCategory: "",
    };
    expect(
      actionGateRefusal(
        assassination,
        gateState({ targetHealth: 3, targetMaximumHealth: 10 }),
      ),
    ).toBe("assassination_health");
    expect(
      actionGateRefusal(
        assassination,
        gateState({ targetHealth: 2, targetMaximumHealth: 10 }),
      ),
    ).toBeNull();
    expect(
      actionGateRefusal(
        assassination,
        gateState({ targetHealth: 0, targetMaximumHealth: 10 }),
      ),
    ).toBe("target_dead");
  });
});

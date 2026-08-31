import { describe, expect, it } from "vitest";
import type { BuildEnvelope } from "./build-envelope";
import type { CasterBaseCurves, CasterStatInput } from "./caster";
import {
  evaluateDeterministicFixture,
  type DeterministicEvaluationFixture,
} from "./evaluate";
import type { DamageSkillSpec } from "./hit";
import { createDefaultEvaluationScenario } from "./scenario";

const build: BuildEnvelope = {
  serializedSchemaVersion: 1,
  captureSchemaVersion: 1,
  modelVersion: "1",
  gameData: {
    gameVersion: "0.9.31.1",
    steamBuildId: "24986533",
    assemblySha256: "fixture-sha",
  },
};

const curves: CasterBaseCurves = {
  health: { base: 100, perLevel: 0 },
  mana: { base: 100, perLevel: 0 },
  energy: { base: 10, perLevel: 0 },
  damage: { base: 100, perLevel: 0 },
  magicDamage: { base: 100, perLevel: 0 },
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

const caster: CasterStatInput = {
  kind: "player",
  level: 50,
  attributes: {
    strength: 0,
    constitution: 0,
    dexterity: 0,
    intelligence: 0,
    wisdom: 0,
    charisma: 0,
  },
  curves,
  equipment: [],
};

function damageSkill(
  overrides: Partial<DamageSkillSpec> = {},
): DamageSkillSpec {
  return {
    id: "strike",
    skillClass: "target_damage",
    damageType: "normal",
    declaredDamage: 10,
    damagePercent: 0,
    isSpell: false,
    requiredWeaponCategory: "",
    ...overrides,
  };
}

function fixture(
  overrides: Partial<DeterministicEvaluationFixture> = {},
): DeterministicEvaluationFixture {
  const scenario = createDefaultEvaluationScenario({
    build,
    target: {
      id: "dummy",
      level: 50,
      stationary: true,
      defense: 0,
      magicResist: 0,
      poisonResist: 0,
      fireResist: 0,
      coldResist: 0,
      diseaseResist: 0,
      blockChance: 0,
      criticalResist: 0,
      bossOrElite: false,
      immuneDebuffs: false,
    },
    targetMaximumHealth: 1_000_000,
    roster: ["player"],
    horizonSeconds: 10,
    initialResources: [
      { entityId: "player", resource: "energy", current: 10, maximum: 10 },
    ],
  });
  return {
    id: "source/target-damage",
    scenario,
    casterEntityId: "player",
    casterClassId: "warrior",
    caster,
    weapons: [],
    resourceKind: "energy",
    resourceRecoveryPerTick: 0,
    weaponDelay: 25,
    targetHealth: { current: 1_000_000, maximum: 1_000_000 },
    actions: [
      {
        skill: damageSkill(),
        castTime: 0,
        cooldown: 4,
        resourceCost: 2,
      },
    ],
    ...overrides,
  };
}

describe("evaluateDeterministicFixture", () => {
  it("produces a repeatable event schedule and per-quantity output", () => {
    const first = evaluateDeterministicFixture(fixture(), build);
    const second = evaluateDeterministicFixture(fixture(), build);
    expect(first).toEqual(second);
    expect(first.actions[0]).toMatchObject({
      actionId: "strike",
      uses: 3,
      totalExpectedDamage: 330,
      hit: {
        avoidanceProbability: 0,
        landedDamage: 110,
        expectedDamage: 110,
      },
    });
    expect(first.totalExpectedDamage).toBe(330);
    expect(first.expectedDamagePerSecond).toBe(33);
    expect(first.rotation.endingResource).toBe(4);
  });

  it("honors explicit skill omission", () => {
    const result = evaluateDeterministicFixture(
      fixture({ selection: { strike: "exclude" } }),
      build,
    );
    expect(result.actions[0].uses).toBe(0);
    expect(result.rotation.exclusions).toContainEqual({
      actionId: "strike",
      reason: "user",
    });
  });

  it("refuses an incompatible build before evaluation", () => {
    const stale = { ...build, modelVersion: "2" };
    expect(() => evaluateDeterministicFixture(fixture(), stale)).toThrow(
      "Incompatible scenario version tuple",
    );
  });

  it("fails when the executable schedule exceeds declared ammunition", () => {
    const base = fixture();
    const scenario = {
      ...(base.scenario as object),
      ammunition: [{ entityId: "player", itemId: "arrow", quantity: 1 }],
    };
    expect(() =>
      evaluateDeterministicFixture(
        fixture({
          scenario,
          weapons: [
            {
              slot: 13,
              amount: 1,
              durability: 10,
              category: "Bow",
              damageBonus: 0,
              requiredAmmoId: "arrow",
            },
          ],
          actions: [
            {
              skill: damageSkill({
                skillClass: "target_projectile",
                requiredWeaponCategory: "Bow",
              }),
              castTime: 0,
              cooldown: 4,
              resourceCost: 0,
              ammunitionItemId: "arrow",
            },
          ],
        }),
        build,
      ),
    ).toThrow("requires 3 arrow; scenario supplies 1");
  });

  it("reports intentional engine-defect normalization separately", () => {
    const result = evaluateDeterministicFixture(
      fixture({
        casterClassId: "ranger",
        weapons: [
          {
            slot: 12,
            amount: 1,
            durability: 10,
            category: "WeaponSword",
            damageBonus: 0,
          },
          {
            slot: 13,
            amount: 1,
            durability: 0,
            category: "Bow",
            damageBonus: 100,
          },
        ],
        actions: [
          {
            skill: damageSkill({ requiredWeaponCategory: "Weapon" }),
            castTime: 0,
            cooldown: 4,
            resourceCost: 0,
          },
        ],
      }),
      build,
    );
    expect(result.normalizedDefects).toContain("broken offhand subtraction");
  });
});

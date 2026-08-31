import { describe, expect, it } from "vitest";
import type { DamageKind } from "./scenario";
import {
  debuffLandingProbability,
  hitAvoidanceProbability,
  isInvulnerable,
  mitigateLandedDamage,
  mitigationFraction,
  type TargetCombatStats,
} from "./target";

const target: TargetCombatStats = {
  level: 55,
  defense: 700,
  magicResist: 600,
  poisonResist: 500,
  fireResist: 400,
  coldResist: 300,
  diseaseResist: 200,
  blockChance: 0.17,
};

describe("target avoidance", () => {
  it("applies level difference and accuracy before the avoidance clamp", () => {
    expect(
      hitAvoidanceProbability({
        target,
        casterLevel: 50,
        casterAccuracy: 0.05,
        damageType: "normal",
      }),
    ).toBeCloseTo(0.145);
  });

  it("caps the level term and final probability independently", () => {
    expect(
      hitAvoidanceProbability({
        target: { ...target, level: 100, defense: 10_000, blockChance: 0.8 },
        casterLevel: 1,
        casterAccuracy: -0.5,
        damageType: "normal",
      }),
    ).toBe(0.9);
  });

  it("bypasses avoidance for resource burn", () => {
    expect(
      hitAvoidanceProbability({
        target,
        casterLevel: 1,
        casterAccuracy: -0.5,
        damageType: "normal",
        manaburn: true,
      }),
    ).toBe(0);
  });
});

describe("target mitigation", () => {
  it.each<[DamageKind, number]>([
    ["normal", 0.35],
    ["magic", 0.3],
    ["poison", 0.25],
    ["fire", 0.2],
    ["cold", 0.15],
    ["disease", 0.1],
  ])("uses the %s resistance school", (damageType, expected) => {
    expect(mitigationFraction(target, damageType)).toBeCloseTo(expected);
  });

  it("saturates at 1800 defense and keeps ten percent damage", () => {
    const saturated = { ...target, defense: 10_000 };
    expect(mitigationFraction(saturated, "normal")).toBe(0.9);
    expect(mitigateLandedDamage(1_000, saturated, "normal")).toBe(100);
  });

  it("ceilings each mitigation subtraction", () => {
    expect(mitigateLandedDamage(101, target, "normal")).toBe(65);
  });
});

describe("target debuff landing", () => {
  it("uses defense for melee debuffs and subtracts accuracy", () => {
    expect(
      debuffLandingProbability({
        target,
        casterLevel: 50,
        casterAccuracy: 0.1,
        school: "melee",
      }),
    ).toBeCloseTo(0.725);
  });

  it("applies the decrease-resists bonus before the floor", () => {
    expect(
      debuffLandingProbability({
        target: { ...target, magicResist: 200 },
        casterLevel: 55,
        casterAccuracy: 0,
        school: "magic",
        decreasesResists: true,
      }),
    ).toBe(1);
  });

  it("refuses immune targets unless the skill ignores immunity", () => {
    const immune = { ...target, immuneDebuffs: true };
    expect(
      debuffLandingProbability({
        target: immune,
        casterLevel: 55,
        casterAccuracy: 1,
        school: "magic",
      }),
    ).toBe(0);
    expect(
      debuffLandingProbability({
        target: immune,
        casterLevel: 55,
        casterAccuracy: 1,
        school: "magic",
        ignoresImmunity: true,
      }),
    ).toBe(1);
  });

  it("keeps boss movement debuffs below the engine threshold resisted", () => {
    expect(
      debuffLandingProbability({
        target: { ...target, bossOrElite: true },
        casterLevel: 55,
        casterAccuracy: 1,
        school: "melee",
        speedBonus: -11,
      }),
    ).toBe(0);
  });

  it("keeps at least ten percent landing probability", () => {
    expect(
      debuffLandingProbability({
        target: { ...target, fireResist: 10_000 },
        casterLevel: 1,
        casterAccuracy: -0.5,
        school: "fire",
      }),
    ).toBeCloseTo(0.1);
  });
});

describe("target invulnerability", () => {
  it("requires both defense and magic resistance thresholds", () => {
    expect(isInvulnerable({ ...target, defense: 10_000 })).toBe(false);
    expect(
      isInvulnerable({ ...target, defense: 10_000, magicResist: 10_000 }),
    ).toBe(true);
  });
});

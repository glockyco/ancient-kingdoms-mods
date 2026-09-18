import { describe, expect, it } from "vitest";
import {
  applyCooldownReduction,
  applyEffect,
  cleanupExpiredEffects,
  scaleTargetDebuff,
  targetStatsWithEffects,
  type EffectSpec,
  type TimedEffect,
} from "./effects";

function spec(overrides: Partial<EffectSpec> = {}): EffectSpec {
  return {
    skillId: "hunters_sigil",
    name: "Hunter's Sigil",
    category: "Debuff AC",
    duration: 30,
    recipient: "target",
    school: "melee",
    decreasesResists: false,
    debuffPowerAttribute: "strength",
    meleeDebuff: true,
    bonuses: { defense: -125 },
    damagePercent: 0,
    magicDamagePercent: 0,
    manaRecoveryPercent: 0,
    energyRecoveryPercent: 0,
    manaRecoveryFlat: 0,
    energyRecoveryFlat: 0,
    cooldownReductionPercent: 0,
    ...overrides,
  };
}

function effect(overrides: Partial<TimedEffect> = {}): TimedEffect {
  return {
    spec: spec(),
    sourceId: "player",
    recipientId: "dummy",
    appliedAt: 0,
    expiresAt: 30,
    ...overrides,
  };
}

describe("applyEffect", () => {
  it("replaces every effect in the incoming category, whatever its source or magnitude", () => {
    const stronger = effect();
    const weaker = effect({
      spec: spec({ skillId: "tangle_trap", bonuses: { defense: -40 } }),
      sourceId: "mercenary",
      appliedAt: 5,
      expiresAt: 35,
    });
    const applied = applyEffect([stronger], weaker);
    expect(applied.effects).toEqual([weaker]);
    expect(applied.replaced).toEqual([stronger]);
  });

  it("refreshes the same skill in place and keeps other categories", () => {
    const slow = effect({
      spec: spec({ skillId: "balance", category: "Slow" }),
    });
    const refreshed = effect({ appliedAt: 10, expiresAt: 40 });
    const applied = applyEffect([effect(), slow], refreshed);
    expect(applied.effects).toEqual([slow, refreshed]);
    expect(applied.replaced.map((entry) => entry.spec.skillId)).toEqual([
      "hunters_sigil",
    ]);
  });

  it("does not expire anything for an empty category", () => {
    const uncategorised = effect({
      spec: spec({ skillId: "hex", category: "" }),
    });
    expect(applyEffect([effect()], uncategorised).replaced).toEqual([]);
  });
});

describe("cleanupExpiredEffects", () => {
  it("removes an effect only once its duration has elapsed", () => {
    const expired = effect({ expiresAt: 30 });
    expect(cleanupExpiredEffects([expired], 29.9).expired).toEqual([]);
    expect(cleanupExpiredEffects([expired], 30).expired).toEqual([expired]);
  });
});

describe("scaleTargetDebuff", () => {
  it("captures half the caster's Strength in a melee defense penalty", () => {
    const scaled = scaleTargetDebuff(spec(), {
      strength: 18,
      constitution: 26,
      dexterity: 14,
      intelligence: 11,
      wisdom: 9,
      charisma: 9,
    });
    expect(scaled.bonuses.defense).toBe(-134);
  });
});

describe("targetStatsWithEffects", () => {
  it("adds the defensive bonuses of every active effect", () => {
    const stats = targetStatsWithEffects(
      {
        level: 55,
        defense: 700,
        magicResist: 100,
        poisonResist: 0,
        fireResist: 0,
        coldResist: 0,
        diseaseResist: 0,
        blockChance: 0.1,
      },
      [
        effect(),
        effect({
          spec: spec({ skillId: "hex", bonuses: { magicResist: -50 } }),
        }),
      ],
    );
    expect(stats.defense).toBe(575);
    expect(stats.magicResist).toBe(50);
  });
});

describe("applyCooldownReduction", () => {
  it("removes the smaller of the percentage and thirty seconds from each remaining cooldown", () => {
    const reduced = applyCooldownReduction(
      new Map([
        ["short", 20],
        ["long", 110],
        ["ready", 5],
      ]),
      10,
      0.5,
    );
    expect(reduced.get("short")).toBeCloseTo(15);
    expect(reduced.get("long")).toBeCloseTo(80);
    expect(reduced.get("ready")).toBe(10);
  });
});

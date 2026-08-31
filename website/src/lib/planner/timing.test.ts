import { describe, expect, it } from "vitest";
import {
  effectiveCastTime,
  effectiveSkillCooldown,
  fractionalCooldownCapacity,
  playerSkillRefractory,
  playerWeaponInterval,
  reduceActiveCooldown,
  scheduledCastCompletions,
  scheduledCooldownUses,
} from "./timing";

describe("player timing", () => {
  it("matches the measured weapon interval and haste floor", () => {
    expect(playerWeaponInterval(28, 0)).toBeCloseTo(1.12);
    expect(playerWeaponInterval(28, 0.5)).toBeCloseTo(0.56);
    expect(playerWeaponInterval(28, 0.8)).toBe(0.25);
  });

  it("selects refractory from the skill fields", () => {
    expect(
      playerSkillRefractory(
        { isSpell: false, requiredWeaponCategory: "Weapon" },
        28,
        0,
      ),
    ).toBeCloseTo(1.12);
    expect(
      playerSkillRefractory(
        { isSpell: true, requiredWeaponCategory: "Weapon" },
        28,
        0.8,
      ),
    ).toBe(0.75);
    expect(
      playerSkillRefractory(
        { isSpell: false, requiredWeaponCategory: "" },
        28,
        0.8,
      ),
    ).toBe(0.75);
  });

  it("applies spell haste only to spells", () => {
    expect(effectiveCastTime(2, true, 0.25)).toBe(1.5);
    expect(effectiveCastTime(2, false, 0.25)).toBe(2);
  });
});

describe("cooldown timing", () => {
  it("reduces only companion non-spell follow-up cooldowns", () => {
    const timing = {
      cooldown: 20,
      isSpell: false,
      followupDefaultAttack: true,
    };
    expect(effectiveSkillCooldown(timing, "player", 0.2)).toBe(20);
    expect(effectiveSkillCooldown(timing, "companion", 0.2)).toBe(16);
    expect(
      effectiveSkillCooldown({ ...timing, isSpell: true }, "companion", 0.2),
    ).toBe(20);
  });

  it("caps one active-cooldown reduction at thirty seconds", () => {
    expect(reduceActiveCooldown(200, 0.25)).toBe(170);
    expect(reduceActiveCooldown(20, 0.25)).toBe(15);
    expect(reduceActiveCooldown(0, 0.25)).toBe(0);
  });

  it("keeps fractional capacity out of the executable schedule", () => {
    expect(scheduledCooldownUses(60, 45)).toEqual([0, 45]);
    expect(fractionalCooldownCapacity(60, 45)).toBeCloseTo(2.3333333333);
    expect(scheduledCooldownUses(90, 120)).toEqual([0]);
    expect(fractionalCooldownCapacity(90, 120)).toBe(1.75);
    expect(scheduledCooldownUses(90, 45)).toEqual([0, 45, 90]);
    expect(fractionalCooldownCapacity(90, 45)).toBe(3);
  });

  it("starts cooldown after cast completion on the event timeline", () => {
    expect(
      scheduledCastCompletions({ horizon: 10, castTime: 1, cooldown: 4 }),
    ).toEqual([
      { readyAt: 0, completesAt: 1 },
      { readyAt: 5, completesAt: 6 },
    ]);
  });
});

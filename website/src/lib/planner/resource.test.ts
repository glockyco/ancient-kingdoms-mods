import { describe, expect, it } from "vitest";
import {
  applyIncomingDamageReturn,
  applyOutgoingDamageReturn,
  burnCurrentResource,
  followupEnergyReturn,
  incomingPhysicalEnergyReturn,
  recoverResourceTick,
  recoverResourceTicks,
  resourceRecoveryPerTick,
  setResourceCurrent,
  spendResource,
  type CombatResourceState,
} from "./resource";

const energy = (
  overrides: Partial<CombatResourceState> = {},
): CombatResourceState => ({
  kind: "energy",
  current: 40,
  maximum: 100,
  recoveryPerTick: 7,
  enabled: true,
  alive: true,
  ...overrides,
});

describe("resource state", () => {
  it("clamps current values and one-second recovery at resource bounds", () => {
    expect(setResourceCurrent(energy(), -5).current).toBe(0);
    expect(setResourceCurrent(energy(), 150).current).toBe(100);
    expect(recoverResourceTick(energy()).current).toBe(47);
    expect(recoverResourceTick(energy({ current: 98 })).current).toBe(100);
    expect(recoverResourceTick(energy({ alive: false })).current).toBe(40);
    expect(recoverResourceTick(energy({ enabled: false })).current).toBe(40);
  });

  it("advances an explicit number of fixed recovery ticks", () => {
    expect(recoverResourceTicks(energy(), 3).current).toBe(61);
    expect(() => recoverResourceTicks(energy(), 0.5)).toThrow(
      "non-negative integer",
    );
  });

  it("rounds passive and maintained-buff percentages separately", () => {
    expect(
      resourceRecoveryPerTick({
        base: 1,
        passivePercent: 0.025,
        buffPercent: -0.04,
        flatBonus: 2,
        maximum: 100,
      }),
    ).toBe(1);
  });

  it("charges only affordable non-negative costs", () => {
    expect(spendResource(energy(), 13).current).toBe(27);
    expect(() => spendResource(energy(), 41)).toThrow("insufficient energy");
    expect(() => spendResource(energy(), -1)).toThrow("must not be negative");
  });
});

describe("combat resource returns", () => {
  it.each([
    [1, 1],
    [100, 3],
    [10_000, 25],
  ])("returns energy from %i incoming physical damage", (damage, expected) => {
    expect(incomingPhysicalEnergyReturn(damage)).toBe(expected);
  });

  it("caps outgoing return by target health before damage", () => {
    expect(followupEnergyReturn(101, 50)).toBe(12);
    expect(followupEnergyReturn(101, 1_000)).toBe(25);
  });

  it("applies incoming return only to physical Warrior and Rogue damage", () => {
    expect(
      applyIncomingDamageReturn({
        state: energy(),
        classId: "warrior",
        damage: 100,
        damageType: "normal",
      }),
    ).toMatchObject({ amount: 3, state: { current: 43 } });
    expect(
      applyIncomingDamageReturn({
        state: energy(),
        classId: "rogue",
        damage: 100,
        damageType: "magic",
      }).amount,
    ).toBe(0);
  });

  it("separates melee follow-up and Mystic Spark returns", () => {
    expect(
      applyOutgoingDamageReturn({
        state: energy(),
        classId: "rogue",
        skillId: "attack",
        followupDefaultAttack: true,
        landedDamage: 101,
        targetCurrentHealth: 50,
      }),
    ).toMatchObject({ amount: 12, state: { current: 52 } });
    expect(
      applyOutgoingDamageReturn({
        state: { ...energy(), kind: "mana" },
        classId: "wizard",
        skillId: "mystic_spark",
        followupDefaultAttack: false,
        landedDamage: 101,
        targetCurrentHealth: 50,
      }).amount,
    ).toBe(12);
  });

  it("burns the entire current resource before later costs", () => {
    expect(burnCurrentResource(energy({ current: 37 }))).toEqual({
      state: energy({ current: 0 }),
      amount: 74,
    });
  });

  it("reproduces the measured Warrior and Fury recovery divergence", () => {
    const afterReturn = energy({ current: 4, recoveryPerTick: 0 });
    expect(recoverResourceTicks(afterReturn, 3).current).toBe(4);
    const rogueFury = {
      ...afterReturn,
      recoveryPerTick: resourceRecoveryPerTick({
        base: 0,
        passivePercent: 0,
        buffPercent: -0.04,
        flatBonus: 0,
        maximum: 25,
      }),
    };
    expect(recoverResourceTicks(rogueFury, 3).current).toBe(1);
  });
});

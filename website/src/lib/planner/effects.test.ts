import { describe, expect, it } from "vitest";
import {
  activeEffectsAt,
  applyCooldownReduction,
  applyTimedEffect,
  assertNoDurabilityLoss,
  consumeExpectedAmmunition,
  finiteRefreshUptime,
  shouldOmitWeakerEffect,
  steadyRefreshUptime,
  useDeclaredConsumable,
  type TimedEffect,
} from "./effects";

const effect = (overrides: Partial<TimedEffect> = {}): TimedEffect => ({
  id: "strong",
  ownerId: "player",
  category: "Debuff AC",
  appliedAt: 0,
  expiresAt: 30,
  contribution: 340,
  ...overrides,
});

describe("refresh effects", () => {
  it("computes exact finite and steady refresh uptime", () => {
    expect(
      finiteRefreshUptime({
        probability: 1,
        duration: 10,
        cadence: 30,
        horizon: 100,
      }),
    ).toBe(0.4);
    expect(steadyRefreshUptime(1, 10, 30)).toBeCloseTo(1 / 3);
    expect(steadyRefreshUptime(1, 40, 30)).toBe(1);
  });

  it("accounts for repeated Bernoulli refresh attempts", () => {
    const probability = 0.4;
    expect(steadyRefreshUptime(probability, 10, 2)).toBeCloseTo(
      1 - (1 - probability) ** 5,
    );
    expect(
      finiteRefreshUptime({
        probability,
        duration: 10,
        cadence: 2,
        horizon: 120,
      }),
    ).toBeCloseTo(0.905664);
  });

  it("reduces every active cooldown with the per-skill cap", () => {
    expect(
      applyCooldownReduction({ ready: 0, short: 20, long: 200 }, 0.25),
    ).toEqual({ ready: 0, short: 15, long: 170 });
  });
});

describe("effect categories", () => {
  it("keeps the newest same-owner category member even when weaker", () => {
    const weak = effect({
      id: "weak",
      appliedAt: 1,
      expiresAt: 31,
      contribution: 125,
    });
    expect(applyTimedEffect([effect()], weak)).toEqual([weak]);
  });

  it("isolates category ownership between player and companion", () => {
    const companion = effect({ id: "companion", ownerId: "mercenary" });
    const player = effect({ id: "player", contribution: 125 });
    expect(applyTimedEffect([companion], player)).toEqual([companion, player]);
  });

  it("keeps uncategorised effects and expires effects at their boundary", () => {
    const first = effect({ id: "first", category: "" });
    const second = effect({ id: "second", category: "" });
    const active = applyTimedEffect([first], second);
    expect(active).toHaveLength(2);
    expect(activeEffectsAt(active, 29.999)).toHaveLength(2);
    expect(activeEffectsAt(active, 30)).toHaveLength(0);
  });

  it("allows the solver to omit a weaker same-owner action", () => {
    expect(
      shouldOmitWeakerEffect([effect()], {
        ownerId: "player",
        category: "Debuff AC",
        contribution: 125,
      }),
    ).toBe(true);
    expect(
      shouldOmitWeakerEffect([effect()], {
        ownerId: "mercenary",
        category: "Debuff AC",
        contribution: 125,
      }),
    ).toBe(false);
  });
});

describe("consumables and ammunition", () => {
  it("uses only declared consumables and applies their timed effect", () => {
    const result = useDeclaredConsumable({
      declaredIds: new Set(["elixir"]),
      stack: { id: "elixir", quantity: 2, infinite: false },
      spec: {
        id: "elixir",
        effect: {
          id: "strength",
          category: "Buff Strength",
          duration: 600,
          contribution: 25,
        },
      },
      ownerId: "player",
      now: 5,
      effects: [],
    });
    expect(result.stack.quantity).toBe(1);
    expect(result.effects).toEqual([
      {
        id: "strength",
        ownerId: "player",
        category: "Buff Strength",
        appliedAt: 5,
        expiresAt: 605,
        contribution: 25,
      },
    ]);
    expect(() =>
      useDeclaredConsumable({
        declaredIds: new Set(),
        stack: { id: "elixir", quantity: 2, infinite: false },
        spec: { id: "elixir" },
        ownerId: "player",
        now: 0,
        effects: [],
      }),
    ).toThrow("not declared");
  });

  it("restores the matching resource without exceeding capacity", () => {
    const result = useDeclaredConsumable({
      declaredIds: new Set(["tonic"]),
      stack: { id: "tonic", quantity: 1, infinite: true },
      spec: {
        id: "tonic",
        resourceRestore: { kind: "mana", amount: 30 },
      },
      ownerId: "player",
      now: 0,
      effects: [],
      resource: {
        kind: "mana",
        current: 80,
        maximum: 100,
        recoveryPerTick: 0,
        enabled: true,
        alive: true,
      },
    });
    expect(result.stack.quantity).toBe(1);
    expect(result.resource?.current).toBe(100);
  });

  it("uses deterministic expected ammunition and refuses exhaustion", () => {
    expect(
      consumeExpectedAmmunition({
        available: 10,
        casts: 10,
        expectedPerCast: 0.5,
      }),
    ).toEqual({ remaining: 5, consumed: 5 });
    expect(() =>
      consumeExpectedAmmunition({
        available: 2,
        casts: 3,
        expectedPerCast: 1,
      }),
    ).toThrow("requires 3, has 2");
  });

  it("refuses durability-loss scenarios", () => {
    expect(() => assertNoDurabilityLoss(false)).not.toThrow();
    expect(() => assertNoDurabilityLoss(true)).toThrow(
      "durability loss is unsupported",
    );
  });
});

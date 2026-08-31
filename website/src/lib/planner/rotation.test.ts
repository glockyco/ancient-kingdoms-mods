import { describe, expect, it } from "vitest";
import {
  solvePlayerRotation,
  type PlayerRotationInput,
  type RotationAction,
} from "./rotation";

function action(
  overrides: Partial<RotationAction> & Pick<RotationAction, "id">,
): RotationAction {
  return {
    expectedDamage: 100,
    castTime: 0,
    cooldown: 10,
    refractory: 0.75,
    resourceCost: 0,
    ...overrides,
  };
}

function input(
  overrides: Partial<PlayerRotationInput> = {},
): PlayerRotationInput {
  return {
    horizon: 20,
    actions: [],
    initialResource: 100,
    maximumResource: 100,
    resourceRecoveryPerTick: 0,
    ...overrides,
  };
}

describe("solvePlayerRotation", () => {
  it("records deliberate omission of an otherwise available skill", () => {
    const result = solvePlayerRotation(
      input({
        actions: [action({ id: "included" }), action({ id: "omitted" })],
        selection: { included: "include", omitted: "exclude" },
      }),
    );
    expect(result.exclusions).toContainEqual({
      actionId: "omitted",
      reason: "user",
    });
    expect(result.abilityTotals.omitted).toBeUndefined();
    expect(result.abilityTotals.included.uses).toBe(3);
  });

  it("starts cooldown at completion and excludes casts that finish after the horizon", () => {
    const result = solvePlayerRotation(
      input({
        horizon: 10,
        actions: [action({ id: "cast", castTime: 1, cooldown: 4 })],
      }),
    );
    expect(
      result.events.map(({ startsAt, completesAt }) => [startsAt, completesAt]),
    ).toEqual([
      [0, 1],
      [5, 6],
    ]);
  });

  it("resets the next default attack when a skill completes", () => {
    const result = solvePlayerRotation(
      input({
        horizon: 5,
        actions: [
          action({ id: "cast", castTime: 1, cooldown: 100, refractory: 2 }),
        ],
        autoAttack: { id: "swing", expectedDamage: 10, interval: 2 },
      }),
    );
    expect(
      result.events.map(({ actionId, completesAt }) => [actionId, completesAt]),
    ).toEqual([
      ["cast", 1],
      ["swing", 3],
      ["swing", 5],
    ]);
  });

  it("lets an auto-attack fund a skill at the same timestamp", () => {
    const result = solvePlayerRotation(
      input({
        horizon: 1,
        actions: [action({ id: "spender", resourceCost: 2 })],
        autoAttack: {
          id: "swing",
          expectedDamage: 10,
          interval: 2,
          resourceGain: 2,
        },
        initialResource: 0,
        maximumResource: 10,
      }),
    );
    expect(
      result.events.map(({ actionId, startsAt }) => [actionId, startsAt]),
    ).toEqual([
      ["swing", 0],
      ["spender", 0],
      ["swing", 0.75],
    ]);
    expect(result.endingResource).toBe(2);
  });

  it("applies one-second recovery ticks during a cast before its completion cost", () => {
    const result = solvePlayerRotation(
      input({
        horizon: 2,
        actions: [action({ id: "channel", castTime: 2, resourceCost: 5 })],
        initialResource: 5,
        maximumResource: 10,
        resourceRecoveryPerTick: 1,
      }),
    );
    expect(result.events[0]).toMatchObject({
      resourceBefore: 5,
      resourceAfter: 2,
    });
  });

  it("uses value per resource when ready actions exceed the current pool", () => {
    const result = solvePlayerRotation(
      input({
        actions: [
          action({ id: "efficient", expectedDamage: 100, resourceCost: 10 }),
          action({ id: "weak", expectedDamage: 50, resourceCost: 10 }),
        ],
        initialResource: 10,
        maximumResource: 10,
      }),
    );
    expect(result.events.map(({ actionId }) => actionId)).toEqual([
      "efficient",
    ]);
  });

  it("uses value per cast time when the current pool funds every ready action", () => {
    const result = solvePlayerRotation(
      input({
        horizon: 3,
        actions: [
          action({
            id: "slow",
            expectedDamage: 100,
            castTime: 2,
            cooldown: 100,
          }),
          action({
            id: "fast",
            expectedDamage: 60,
            castTime: 1,
            cooldown: 100,
          }),
        ],
      }),
    );
    expect(result.events.map(({ actionId }) => actionId)).toEqual([
      "fast",
      "slow",
    ]);
  });

  it("keeps positive non-damage actions and explains static exclusions", () => {
    const result = solvePlayerRotation(
      input({
        actions: [
          action({ id: "debuff", expectedDamage: 0, objectiveValue: 20 }),
          action({
            id: "assassinate",
            preconditionRefusal: "target above 25% health",
          }),
          action({ id: "empty", expectedDamage: 0 }),
        ],
      }),
    );
    expect(result.abilityTotals.debuff.uses).toBe(3);
    expect(result.exclusions).toEqual([
      {
        actionId: "assassinate",
        reason: "precondition",
        detail: "target above 25% health",
      },
      { actionId: "empty", reason: "non_positive_value" },
    ]);
  });

  it("includes an auto-attack at the horizon endpoint", () => {
    const result = solvePlayerRotation(
      input({
        horizon: 4,
        autoAttack: { id: "swing", expectedDamage: 10, interval: 2 },
      }),
    );
    expect(result.events.map(({ startsAt }) => startsAt)).toEqual([0, 2, 4]);
  });

  it("rejects duplicate and unknown action controls", () => {
    expect(() =>
      solvePlayerRotation(
        input({ actions: [action({ id: "same" }), action({ id: "same" })] }),
      ),
    ).toThrow("duplicate action id same");
    expect(() =>
      solvePlayerRotation(input({ selection: { absent: "exclude" } })),
    ).toThrow("selection names unknown action absent");
  });
});

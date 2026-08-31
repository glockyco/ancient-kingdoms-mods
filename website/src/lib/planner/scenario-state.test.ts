import { describe, expect, it } from "vitest";
import type { BuildEnvelope } from "./build-envelope";
import {
  advanceScenarioState,
  consumeAmmunition,
  createInitialScenarioState,
} from "./scenario-state";
import { parseEvaluationScenario } from "./scenario";

const build: BuildEnvelope = {
  serializedSchemaVersion: 1,
  captureSchemaVersion: 1,
  modelVersion: "1",
  gameData: {
    gameVersion: "0.9.31.1",
    steamBuildId: "24986533",
    assemblySha256:
      "bd2521453b35dfb58c4feecc344d7fa5c8de5a8e73c58b5ff5aa5a4c12a9466fc",
  },
};

function scenarioWithEvents() {
  return parseEvaluationScenario(
    {
      schemaVersion: 1,
      build,
      name: "Incoming damage fixture",
      target: { id: "dummy", level: 55, stationary: true },
      horizonSeconds: 20,
      initialResources: [
        {
          entityId: "player",
          resource: "energy",
          current: 5,
          maximum: 10,
        },
      ],
      initialCooldowns: [
        { entityId: "player", skillId: "strike", remainingSeconds: 10 },
      ],
      activeBuffs: [
        {
          sourceEntityId: "player",
          targetEntityId: "player",
          skillId: "short_buff",
          skillLevel: 1,
          remainingSeconds: 5,
        },
      ],
      consumables: [{ entityId: "player", itemId: "food", quantity: 2 }],
      ammunition: [{ entityId: "player", itemId: "arrow", quantity: 3 }],
      incomingEvents: [
        {
          atSeconds: 2,
          targetEntityId: "player",
          amount: 20,
          damageType: "normal",
        },
        {
          atSeconds: 5,
          targetEntityId: "player",
          amount: 30,
          damageType: "fire",
        },
      ],
      roster: ["player"],
      targetCount: 1,
      durabilityLoss: false,
    },
    build,
  );
}

describe("scenario state", () => {
  it("materializes every initial state domain", () => {
    const state = createInitialScenarioState(scenarioWithEvents());

    expect(state.resources.get("player")?.get("energy")).toEqual({
      current: 5,
      maximum: 10,
    });
    expect(state.cooldowns[0]?.remainingSeconds).toBe(10);
    expect(state.activeBuffs[0]?.remainingSeconds).toBe(5);
    expect(state.consumables[0]?.quantity).toBe(2);
    expect(state.ammunition[0]?.quantity).toBe(3);
  });

  it("advances cooldowns and buffs and emits incoming events in order", () => {
    const initial = createInitialScenarioState(scenarioWithEvents());
    const first = advanceScenarioState(initial, 4);

    expect(first.incomingEvents.map((event) => event.amount)).toEqual([20]);
    expect(first.state.cooldowns[0]?.remainingSeconds).toBe(6);
    expect(first.state.activeBuffs[0]?.remainingSeconds).toBe(1);

    const second = advanceScenarioState(first.state, 5);
    expect(second.incomingEvents.map((event) => event.amount)).toEqual([30]);
    expect(second.state.cooldowns[0]?.remainingSeconds).toBe(5);
    expect(second.state.activeBuffs).toEqual([]);

    const third = advanceScenarioState(second.state, 20);
    expect(third.incomingEvents).toEqual([]);
    expect(third.state.cooldowns[0]?.remainingSeconds).toBe(0);
  });

  it("produces no taking-damage input when incoming events are empty", () => {
    const scenario = scenarioWithEvents();
    scenario.incomingEvents = [];
    const result = advanceScenarioState(
      createInitialScenarioState(scenario),
      scenario.horizonSeconds,
    );
    expect(result.incomingEvents).toEqual([]);
  });

  it("consumes ammunition and reports exhaustion", () => {
    const initial = createInitialScenarioState(scenarioWithEvents());
    const remaining = consumeAmmunition(initial, "player", "arrow", 2);

    expect(remaining.ammunition[0]?.quantity).toBe(1);
    expect(() => consumeAmmunition(remaining, "player", "arrow", 2)).toThrow(
      "required 2 arrow, available 1",
    );
  });
});

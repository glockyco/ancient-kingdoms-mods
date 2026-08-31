import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCENARIO_NAME,
  SCENARIO_SCHEMA_VERSION,
  assertSupportedTargetCount,
  createDefaultEvaluationScenario,
  parseEvaluationScenario,
} from "./scenario";
import type { BuildEnvelope } from "./build-envelope";

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

function validScenario(): Record<string, unknown> {
  return {
    schemaVersion: SCENARIO_SCHEMA_VERSION,
    build,
    name: "Fixture",
    target: { id: "dummy", level: 55, stationary: true },
    horizonSeconds: 60,
    initialResources: [
      {
        entityId: "player",
        resource: "energy",
        current: 5,
        maximum: 10,
      },
    ],
    initialCooldowns: [],
    activeBuffs: [],
    consumables: [],
    ammunition: [],
    incomingEvents: [],
    roster: ["player"],
    targetCount: 1,
    durabilityLoss: false,
  };
}

describe("assertSupportedTargetCount", () => {
  it("accepts the one-target model", () => {
    expect(() => assertSupportedTargetCount(1)).not.toThrow();
  });

  it.each([0, 2, 3])("refuses unsupported target count %i", (targetCount) => {
    expect(() => assertSupportedTargetCount(targetCount)).toThrow(
      `Unsupported target count ${targetCount}; expected 1`,
    );
  });
});

describe("parseEvaluationScenario", () => {
  it.each([
    "schemaVersion",
    "build",
    "name",
    "target",
    "horizonSeconds",
    "initialResources",
    "initialCooldowns",
    "activeBuffs",
    "consumables",
    "ammunition",
    "incomingEvents",
    "roster",
    "targetCount",
    "durabilityLoss",
  ])("refuses a missing %s field", (field) => {
    const scenario = validScenario();
    delete scenario[field];
    expect(() => parseEvaluationScenario(scenario, build)).toThrow();
  });

  it("refuses an incompatible version tuple", () => {
    const scenario = validScenario();
    scenario.build = { ...build, modelVersion: "2" };
    expect(() => parseEvaluationScenario(scenario, build)).toThrow(
      "Incompatible scenario version tuple",
    );
  });

  it("refuses an unsupported target count with the field value", () => {
    const scenario = validScenario();
    scenario.targetCount = 2;
    expect(() => parseEvaluationScenario(scenario, build)).toThrow(
      "Unsupported target count 2; expected 1",
    );
  });

  it("refuses durability loss independently from incoming damage", () => {
    const scenario = validScenario();
    scenario.durabilityLoss = true;
    expect(() => parseEvaluationScenario(scenario, build)).toThrow(
      "Unsupported durability loss in scenario.durabilityLoss",
    );
  });

  it("creates the explicit stationary dummy default at full health", () => {
    const scenario = createDefaultEvaluationScenario({
      build,
      targetId: "training_dummy",
      targetLevel: 55,
      targetMaximumHealth: 1_000_000,
      roster: ["player"],
      horizonSeconds: 120,
      initialResources: [
        {
          entityId: "player",
          resource: "mana",
          current: 400,
          maximum: 400,
        },
      ],
    });

    expect(scenario.name).toBe(DEFAULT_SCENARIO_NAME);
    expect(scenario.target.stationary).toBe(true);
    expect(scenario.incomingEvents).toEqual([]);
    expect(scenario.initialResources).toContainEqual({
      entityId: "training_dummy",
      resource: "health",
      current: 1_000_000,
      maximum: 1_000_000,
    });
  });
});

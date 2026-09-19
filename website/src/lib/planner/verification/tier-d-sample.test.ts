import { describe, expect, it } from "vitest";
import { parseObservationRecord } from "./corpus";
import { parseTierDWindowSample } from "./tier-d-sample";

function sample(): Record<string, unknown> {
  return {
    durationSeconds: 20,
    playerDamage: 100,
    companionDamage: [
      { entityId: "companion", archetype: "Rogue", damage: 50 },
    ],
    counts: { attempted: 10, accepted: 8, completed: 8, landed: 7 },
    fidelity: "perHitAttributed",
    fidelityLimit: null,
    resourceTransitions: [{ atSeconds: 0, mana: 100, energy: 20 }],
    maintainedEffects: [
      {
        skillId: "adrenaline_rush",
        name: "Adrenaline Rush",
        firstObservedAtSeconds: 1,
        lastObservedAtSeconds: 19,
      },
    ],
  };
}

describe("compact tier D samples", () => {
  it("parses the committed sample contract", () => {
    expect(parseTierDWindowSample(sample(), "sample", true)).toMatchObject({
      durationSeconds: 20,
      playerDamage: 100,
      counts: { attempted: 10, landed: 7 },
      resourceTransitions: [{ atSeconds: 0, mana: 100, energy: 20 }],
      maintainedEffects: [{ skillId: "adrenaline_rush" }],
    });
  });

  it.each([
    ["counts", undefined, "sample.counts must be an object"],
    [
      "resourceTransitions",
      [],
      "sample.resourceTransitions must be a non-empty array",
    ],
    ["playerDamage", Number.NaN, "sample.playerDamage must be a finite number"],
  ])("refuses malformed %s", (field, value, message) => {
    const malformed = { ...sample(), [field]: value };
    expect(() => parseTierDWindowSample(malformed, "sample", true)).toThrow(
      message,
    );
  });

  it("requires effect evidence for a class sample", () => {
    expect(() =>
      parseTierDWindowSample(
        { ...sample(), maintainedEffects: [] },
        "sample",
        true,
      ),
    ).toThrow("sample.maintainedEffects must identify a declared class effect");
  });

  it("refuses the legacy observation schema", () => {
    expect(() =>
      parseObservationRecord(
        {
          schemaVersion: 1,
          fixture: {},
          game: {},
          recordedAt: "2026-01-01T00:00:00Z",
          achieved: {},
          observation: { measurements: [] },
        },
        "legacy.json",
      ),
    ).toThrow("legacy.json.schemaVersion must be 2, received 1");
  });
});

import { describe, expect, it } from "vitest";
import { adaptCompleteCapture, parseCaptureBuildRecord } from "./capture-build";
import {
  LOGICAL_BUILD_SCHEMA_VERSION,
  parseLogicalBuildData,
  type LogicalBuildData,
} from "./logical-build";

function build(): LogicalBuildData {
  return {
    schemaVersion: LOGICAL_BUILD_SCHEMA_VERSION,
    player: {
      entityId: "player",
      classId: "warrior",
      raceId: "human",
      level: 50,
      veteranPoints: 200,
      attributes: {
        rawObserved: null,
        baseProgression: {
          strength: 20,
          constitution: 18,
          dexterity: 10,
          intelligence: 8,
          wisdom: 9,
          charisma: 7,
        },
        allocated: {
          strength: 120,
          constitution: 129,
          dexterity: 0,
          intelligence: 0,
          wisdom: 0,
          charisma: 0,
        },
        derivedObserved: null,
      },
      skills: [
        {
          skillId: "melee_attack",
          skillName: "Melee Attack",
          level: 3,
          pool: "normal",
        },
      ],
      equipment: [
        {
          slot: 12,
          itemId: "rusty_sword",
          itemName: "Rusty Sword",
          augmentId: null,
          durability: 100,
          amount: 1,
        },
      ],
    },
    companions: [],
    consumables: [
      { itemId: "roast_boar", itemName: "Roast Boar", quantity: 2 },
    ],
    ammunition: [{ itemId: "arrow", itemName: "Arrow", quantity: 40 }],
    learnedBookIds: ["forgotten_tome"],
    provenance: { kind: "authored", source: "adapter-test" },
  };
}

function capture(
  logicalBuild: unknown,
  learnedBooks: "complete" | "missing" = "complete",
) {
  return {
    captureSchemaVersion: 1,
    producer: {
      id: "character-state-export",
      version: "1",
      capturedAtUtc: "2026-08-01T12:00:00Z",
    },
    gameData: {
      gameVersion: "0.9.31.1",
      steamBuildId: "24986533",
      assemblySha256:
        "bd2521453b35dfb58c4fec344d7fa5c8de5a8e73c58b5ff5aa5a4c12a9466fc0",
    },
    modelCompatibility: "1",
    buildData: logicalBuild,
    completeness: {
      player: "complete",
      "player.attributes": "complete",
      "player.skills": "complete",
      "player.equipment": "complete",
      companions: "complete",
      consumables: "complete",
      ammunition: "complete",
      learnedBookIds: learnedBooks,
    },
    containers: [
      {
        containerId: "inventory",
        state: "complete",
        entryCount: 1,
        totalQuantity: 1,
      },
    ],
    ownedItems: [
      {
        instanceId: "inventory:0",
        itemId: "rusty_sword",
        itemName: "Rusty Sword",
        quantity: 1,
        containerId: "inventory",
        slot: null,
        augmentId: null,
        durability: 100,
      },
    ],
  };
}

describe("parseLogicalBuildData", () => {
  it("preserves stable identities, quantities, and attribute layers", () => {
    const parsed = parseLogicalBuildData(build());

    expect(parsed).toEqual(build());
    expect(parsed.player.attributes.baseProgression.strength).toBe(20);
    expect(parsed.player.attributes.allocated.strength).toBe(120);
    expect(parsed.player.attributes.rawObserved).toBeNull();
    expect(parsed.consumables[0]?.quantity).toBe(2);
    expect(parsed.ammunition[0]?.quantity).toBe(40);
  });

  it("refuses missing observations, unknown fields, and duplicate books", () => {
    const missing = structuredClone(build()) as unknown as Record<
      string,
      unknown
    >;
    const player = missing.player as Record<string, unknown>;
    const attributes = player.attributes as Record<string, unknown>;
    delete attributes.rawObserved;
    expect(() => parseLogicalBuildData(missing)).toThrow(
      "buildData.player.attributes.rawObserved is required",
    );

    expect(() =>
      parseLogicalBuildData({ ...build(), copiedBookGains: {} }),
    ).toThrow("buildData.copiedBookGains");
    expect(() =>
      parseLogicalBuildData({
        ...build(),
        learnedBookIds: ["forgotten_tome", "forgotten_tome"],
      }),
    ).toThrow("buildData.learnedBookIds[1] duplicates forgotten_tome");
  });
});

describe("parseCaptureBuildRecord", () => {
  it("adapts a complete capture without mixing outer metadata into the build", () => {
    const parsed = parseCaptureBuildRecord(capture(build()));

    expect(adaptCompleteCapture(parsed)).toEqual(build());
    expect(adaptCompleteCapture(parsed)).not.toHaveProperty("producer");
  });

  it("keeps a partial capture inspectable but blocks complete adaptation", () => {
    const parsed = parseCaptureBuildRecord(capture({}, "missing"));

    expect(parsed.completeness.learnedBookIds).toBe("missing");
    expect(() => adaptCompleteCapture(parsed)).toThrow(
      "capture.completeness.learnedBookIds is missing",
    );
  });

  it("rejects container metadata that does not match captured items", () => {
    const corrupt = capture(build());
    corrupt.containers[0]!.totalQuantity = 2;

    expect(() => parseCaptureBuildRecord(corrupt)).toThrow(
      "capture.containers.inventory.totalQuantity does not match ownedItems",
    );
  });
});

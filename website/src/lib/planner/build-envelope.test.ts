import { describe, expect, it } from "vitest";
import {
  assessBuildCompatibility,
  parseBuildEnvelope,
  type BuildEnvelope,
} from "./build-envelope";

const matchingBuild = (): BuildEnvelope => ({
  serializedSchemaVersion: 1,
  captureSchemaVersion: 1,
  modelVersion: "1",
  gameData: {
    gameVersion: "0.9.31.1",
    steamBuildId: "24986533",
    assemblySha256:
      "bd2521453b35dfb58c4feec344d7fa5c8de5a8e73c58b5ff5aa5a4c12a9466fc",
  },
});

describe("parseBuildEnvelope", () => {
  it.each([
    ["serializedSchemaVersion", 2, "Unsupported serialized schema"],
    ["captureSchemaVersion", 2, "Unsupported capture schema"],
  ] as const)("refuses an unknown %s", (field, value, message) => {
    const build = { ...matchingBuild(), [field]: value };

    expect(() => parseBuildEnvelope(build)).toThrow(message);
  });

  it("refuses incomplete game-data identity", () => {
    const build = matchingBuild();
    const gameData = { ...build.gameData } as Partial<
      BuildEnvelope["gameData"]
    >;
    delete gameData.assemblySha256;

    expect(() => parseBuildEnvelope({ ...build, gameData })).toThrow(
      "build.gameData.assemblySha256",
    );
  });
});

describe("assessBuildCompatibility", () => {
  it("requires a decision instead of accepting different game data", () => {
    const expected = matchingBuild();
    const actual = matchingBuild();
    actual.gameData.steamBuildId = "other-build";

    expect(assessBuildCompatibility(expected, actual)).toEqual({
      comparable: false,
      gameDataDecisionRequired: true,
      staleModel: false,
      reasons: [
        "Game-data versions differ and require an explicit compatibility decision",
      ],
    });
  });

  it("marks a stale model separately from game data", () => {
    const expected = matchingBuild();
    const actual = matchingBuild();
    actual.modelVersion = "older-model";

    expect(assessBuildCompatibility(expected, actual)).toEqual({
      comparable: false,
      gameDataDecisionRequired: false,
      staleModel: true,
      reasons: ["Model older-model differs from expected model 1"],
    });
  });
});

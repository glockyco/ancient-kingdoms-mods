import { describe, expect, it } from "vitest";
import {
  assessBuildCompatibility,
  parseBuildEnvelope,
  type BuildEnvelope,
} from "./build-envelope";

const matchingBuild = (): BuildEnvelope => ({
  serializedSchemaVersion: 3,
  modelVersion: "1",
  gameData: {
    gameVersion: "0.9.31.1",
    steamBuildId: "24986533",
    assemblySha256:
      "bd2521453b35dfb58c4feec344d7fa5c8de5a8e73c58b5ff5aa5a4c12a9466fc",
  },
});

describe("parseBuildEnvelope", () => {
  it("refuses an unknown serialized schema", () => {
    const build = { ...matchingBuild(), serializedSchemaVersion: 4 };

    expect(() => parseBuildEnvelope(build)).toThrow(
      "Unsupported serialized schema",
    );
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

  it.each([
    [
      "build.captureSchemaVersion",
      () => ({ ...matchingBuild(), captureSchemaVersion: 1 }),
    ],
    ["build.policy", () => ({ ...matchingBuild(), policy: "ignore" })],
    [
      "build.gameData.state",
      () => ({
        ...matchingBuild(),
        gameData: { ...matchingBuild().gameData, state: "ignored" },
      }),
    ],
  ] as const)("refuses unsupported field %s", (path, makeBuild) => {
    expect(() => parseBuildEnvelope(makeBuild())).toThrow(path);
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

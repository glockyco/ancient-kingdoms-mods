import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  compareExact,
  compareSupportBand,
  compareWelch,
  studentTCdf,
} from "./comparison";
import {
  classifyObservation,
  loadCorpus,
  type ObservationRecord,
} from "./corpus";
import { coverageFrom, formatVerdicts, verifyFixture } from "./report";

const repoRoot = "..";
const corpus = loadCorpus(repoRoot);
const catalog: unknown = JSON.parse(
  readFileSync("data/planner-data.json", "utf8"),
);

describe("comparison primitives", () => {
  it("fails one exact mismatch and passes float32-equal values", () => {
    expect(compareExact("x", 18, 18).status).toBe("pass");
    expect(compareExact("x", 18, 19)).toMatchObject({
      status: "fail",
      detail: "expected 18, observed 19",
    });
    expect(compareExact("x", 0.007, 0.007000000216066837).status).toBe("pass");
  });

  it("fails one hit outside the support band and reports inconclusive below the minimum", () => {
    expect(
      compareSupportBand("ratio", [0.55, 0.6, 0.64], [0.5265, 0.6435], 3)
        .status,
    ).toBe("pass");
    expect(
      compareSupportBand("ratio", [0.55, 0.7, 0.64], [0.5265, 0.6435], 3),
    ).toMatchObject({
      status: "fail",
      detail: expect.stringContaining("1 of 3 samples outside"),
    });
    expect(
      compareSupportBand("ratio", [0.55], [0.5265, 0.6435], 3).status,
    ).toBe("inconclusive");
  });

  it("rejects a shifted mean at 0.01 and accepts an equal one", () => {
    const model = Array.from(
      { length: 200 },
      (_, index) => 100 + (index % 10) - 4.5,
    );
    const shifted = model.slice(0, 40).map((value) => value + 6);
    const same = model.slice(0, 40);
    expect(
      compareWelch("mean", shifted, model, {
        minimumSamples: 20,
        significance: 0.01,
      }).status,
    ).toBe("fail");
    expect(
      compareWelch("mean", same, model, {
        minimumSamples: 20,
        significance: 0.01,
      }).status,
    ).toBe("pass");
    expect(
      compareWelch("mean", same.slice(0, 5), model, {
        minimumSamples: 20,
        significance: 0.01,
      }).status,
    ).toBe("inconclusive");
  });

  it("evaluates Student's t against tabulated values", () => {
    expect(studentTCdf(2.228, 10)).toBeCloseTo(0.975, 3);
    expect(studentTCdf(1.96, 1_000)).toBeCloseTo(0.975, 3);
    expect(studentTCdf(0, 5)).toBeCloseTo(0.5, 10);
  });
});

describe("observation staleness", () => {
  it("reports an observation from another assembly as stale, not as a failure", () => {
    const fixture = corpus.fixtures[0];
    const stale: ObservationRecord = {
      schemaVersion: 1,
      fixture: {
        name: fixture.name,
        tier: fixture.tier,
        coverage: fixture.coverage,
        path: fixture.path,
        contentSha256: "0".repeat(64),
      },
      game: {
        assemblySha256: "f".repeat(64),
        gameVersion: "0.0.0",
        steamBuildId: "0",
      },
      recordedAt: "2026-01-01T00:00:00Z",
      achieved: {},
      observation: {
        tier: fixture.tier,
        seed: 1,
        gameVersion: "0.0.0",
        fidelity: "state",
        measurements: [],
      },
    };
    const synthetic = {
      ...corpus,
      observations: new Map([[fixture.name, stale]]),
    };
    expect(classifyObservation(fixture, synthetic).kind).toBe("stale");
    expect(verifyFixture(fixture, synthetic, catalog).status).toBe("stale");
    expect(
      classifyObservation(fixture, { ...corpus, observations: new Map() }).kind,
    ).toBe("missing");
  });
});

describe("committed observations", () => {
  const verdicts = corpus.fixtures.map((fixture) =>
    verifyFixture(fixture, corpus, catalog),
  );
  console.log(`\n${formatVerdicts(verdicts)}\n`);

  it("agree with the engine on every current observation", () => {
    const failed = verdicts.filter((verdict) => verdict.status === "fail");
    expect(failed, formatVerdicts(failed)).toEqual([]);
  });

  it("credit coverage only from passing current observations", () => {
    const coverage = coverageFrom(verdicts, corpus);
    for (const [classId, names] of coverage.classes) {
      for (const name of names) {
        const verdict = verdicts.find((entry) => entry.name === name);
        expect(verdict?.status, `${classId} credited by ${name}`).toBe("pass");
      }
    }
  });
});

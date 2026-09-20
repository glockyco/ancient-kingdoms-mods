import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
  readPlannerAssemblySha256,
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

describe("planner assembly identity", () => {
  it("reads the tracked planner payload without a decompiled source tree", () => {
    const root = mkdtempSync(join(tmpdir(), "planner-identity-"));
    try {
      const dataDirectory = join(root, "website", "data");
      mkdirSync(dataDirectory, { recursive: true });
      writeFileSync(
        join(dataDirectory, "planner-data.json"),
        JSON.stringify({
          build: {
            gameData: {
              assemblySha256: "a".repeat(64),
            },
          },
        }),
      );

      expect(readPlannerAssemblySha256(root)).toBe("a".repeat(64));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("observation staleness", () => {
  it("reports an observation from another assembly as stale, not as a failure", () => {
    const fixture = corpus.fixtures[0];
    const stale: ObservationRecord = {
      schemaVersion: 2,
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
        consumablesUsed: [],
        activeEffects: [],
        target: null,
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
    const coverage = coverageFrom(verdicts, corpus, catalog);
    for (const map of [
      coverage.handlers,
      coverage.schools,
      coverage.classes,
      coverage.archetypes,
    ]) {
      for (const [key, names] of map) {
        for (const name of names) {
          const verdict = verdicts.find((entry) => entry.name === name);
          expect(verdict?.status, `${key} credited by ${name}`).toBe("pass");
        }
      }
    }
  });

  it.skipIf(process.env.AK_REQUIRE_CURRENT_COMBAT_FIXTURES !== "1")(
    "cover every supported combat dimension with current observations",
    () => {
      const coverage = coverageFrom(verdicts, corpus, catalog);
      expect(coverage.uncovered.handlers).toEqual([]);
      expect(coverage.uncovered.schools).toEqual([]);
      expect(coverage.uncovered.classes).toEqual([]);
      expect(coverage.uncovered.archetypes).toEqual([]);
    },
  );

  it("credit a handler only from the listed skill's own hits", () => {
    const fixture = corpus.fixtures.find((entry) => entry.tier === "B")!;
    const observation = corpus.observations.get(fixture.name)!;
    const listed = fixture.execution.actions![0].skill;
    const mislabelled = {
      ...observation,
      observation: {
        ...observation.observation,
        measurements: observation.observation.measurements.map((m) => ({
          ...m,
          samples: m.samples.map((sample) => {
            if (typeof sample !== "object" || sample === null) return sample;
            const record = sample as Record<string, unknown>;
            if (!Array.isArray(record.hits)) return sample;
            return {
              ...record,
              hits: record.hits.map((hit) => {
                if (typeof hit !== "object" || hit === null) return hit;
                const hitRecord = hit as Record<string, unknown>;
                return {
                  ...hitRecord,
                  skill:
                    hitRecord.skill === listed
                      ? "Staff Strike"
                      : hitRecord.skill,
                };
              }),
            };
          }),
        })),
      },
    };
    const corpusWithMislabel = {
      ...corpus,
      observations: new Map([[fixture.name, mislabelled]]),
    };
    const coverage = coverageFrom(
      [{ name: fixture.name, tier: "B", status: "pass", quantities: [] }],
      corpusWithMislabel,
      catalog,
    );
    expect([...coverage.handlers.keys()]).toEqual([]);
  });

  it("does not credit a class from the fixture label alone", () => {
    const fixture = corpus.fixtures.find(
      (entry) => entry.tier === "D" && entry.coverage.startsWith("D.class."),
    )!;
    const observation = corpus.observations.get(fixture.name)!;
    const withoutEffectEvidence = {
      ...observation,
      observation: {
        ...observation.observation,
        measurements: observation.observation.measurements.map(
          (measurement) => ({
            ...measurement,
            samples: measurement.samples.map((sample) =>
              typeof sample === "object" && sample !== null
                ? { ...sample, maintainedEffects: [] }
                : sample,
            ),
          }),
        ),
      },
    };
    const coverage = coverageFrom(
      [{ name: fixture.name, tier: "D", status: "pass", quantities: [] }],
      {
        ...corpus,
        observations: new Map([[fixture.name, withoutEffectEvidence]]),
      },
      catalog,
    );

    expect([...coverage.classes.keys()]).toEqual([]);
  });
});

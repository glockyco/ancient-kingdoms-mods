import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/** One committed fixture descriptor, read as the harness commits it. */
export interface FixtureRecord {
  path: string;
  name: string;
  tier: "A" | "B" | "C" | "D";
  coverage: string;
  build: unknown;
  buildData: unknown;
  execution: {
    durationSeconds: number | null;
    repetitions: number;
    seed: number;
    target: { spawn: string; level: number | null } | null;
    actions: { skill: string; facing: string }[] | null;
    measurement: { minimumSamples: number };
  };
}

export interface ObservationMeasurement {
  quantity: string;
  unit: string;
  samplingUnit: string;
  windowSeconds: number | null;
  samples: unknown[];
  counts: {
    attempted: number;
    accepted: number;
    completed: number;
    landed: number;
  } | null;
}

/** One committed observation, as `build-tool verify` writes it. */
export interface ObservationRecord {
  schemaVersion: 1;
  fixture: {
    name: string;
    tier: string;
    coverage: string;
    path: string;
    contentSha256: string;
  };
  game: { assemblySha256: string; gameVersion: string; steamBuildId: string };
  recordedAt: string;
  achieved: Record<string, unknown>;
  observation: {
    tier: string;
    seed: number;
    character?: { class: string; level: number };
    gameVersion: string;
    fidelity: string;
    consumablesUsed: string[];
    activeEffects: {
      skillId: string | null;
      name: string;
      level: number;
      remaining: number;
    }[];
    target: unknown;
    measurements: ObservationMeasurement[];
  };
}

export interface VerificationCorpus {
  snapshotAssemblySha256: string;
  fixtures: FixtureRecord[];
  observations: Map<string, ObservationRecord>;
}

const TIERS = new Set(["A", "B", "C", "D"]);

function listJson(directory: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(directory);
  } catch {
    return [];
  }
  const files: string[] = [];
  for (const entry of entries.sort()) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) files.push(...listJson(path));
    else if (entry.endsWith(".json")) files.push(path);
  }
  return files;
}

function requireString(
  record: Record<string, unknown>,
  key: string,
  path: string,
): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0)
    throw new TypeError(`${path}.${key} must be a non-empty string`);
  return value;
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new TypeError(`${path} must be an object`);
  return value as Record<string, unknown>;
}

export function parseFixtureRecord(
  value: unknown,
  path: string,
): FixtureRecord {
  const record = requireRecord(value, path);
  const tier = requireString(record, "tier", path);
  if (!TIERS.has(tier))
    throw new TypeError(`${path}.tier must be A, B, C, or D`);
  const execution = requireRecord(record.execution, `${path}.execution`);
  const measurement = requireRecord(
    execution.measurement,
    `${path}.execution.measurement`,
  );
  const minimumSamples = measurement.minimumSamples;
  if (!Number.isInteger(minimumSamples) || (minimumSamples as number) < 1)
    throw new TypeError(
      `${path}.execution.measurement.minimumSamples must be a positive integer`,
    );
  const seed = execution.seed;
  if (!Number.isInteger(seed))
    throw new TypeError(`${path}.execution.seed must be an integer`);
  return {
    path,
    name: requireString(record, "name", path),
    tier: tier as FixtureRecord["tier"],
    coverage: requireString(record, "coverage", path),
    build: record.build,
    buildData: record.buildData,
    execution: {
      durationSeconds: (execution.durationSeconds as number | null) ?? null,
      repetitions: (execution.repetitions as number | undefined) ?? 1,
      seed: seed as number,
      target:
        (execution.target as FixtureRecord["execution"]["target"]) ?? null,
      actions:
        (execution.actions as FixtureRecord["execution"]["actions"]) ?? null,
      measurement: { minimumSamples: minimumSamples as number },
    },
  };
}

export function parseObservationRecord(
  value: unknown,
  path: string,
): ObservationRecord {
  const record = requireRecord(value, path);
  if (record.schemaVersion !== 1)
    throw new TypeError(`${path}.schemaVersion must be 1`);
  const fixture = requireRecord(record.fixture, `${path}.fixture`);
  const game = requireRecord(record.game, `${path}.game`);
  const observation = requireRecord(record.observation, `${path}.observation`);
  if (!Array.isArray(observation.measurements))
    throw new TypeError(`${path}.observation.measurements must be an array`);
  return {
    schemaVersion: 1,
    fixture: {
      name: requireString(fixture, "name", `${path}.fixture`),
      tier: requireString(fixture, "tier", `${path}.fixture`),
      coverage: requireString(fixture, "coverage", `${path}.fixture`),
      path: requireString(fixture, "path", `${path}.fixture`),
      contentSha256: requireString(fixture, "contentSha256", `${path}.fixture`),
    },
    game: {
      assemblySha256: requireString(game, "assemblySha256", `${path}.game`),
      gameVersion: requireString(game, "gameVersion", `${path}.game`),
      steamBuildId: requireString(game, "steamBuildId", `${path}.game`),
    },
    recordedAt: requireString(record, "recordedAt", path),
    achieved: requireRecord(record.achieved, `${path}.achieved`),
    observation: observation as ObservationRecord["observation"],
  };
}

/** The tracked planner payload records the assembly identity used by this model. */
export function readPlannerAssemblySha256(repoRoot: string): string {
  const plannerData = requireRecord(
    JSON.parse(
      readFileSync(
        join(repoRoot, "website", "data", "planner-data.json"),
        "utf8",
      ),
    ),
    "planner-data.json",
  );
  const build = requireRecord(plannerData.build, "planner-data.json.build");
  const gameData = requireRecord(
    build.gameData,
    "planner-data.json.build.gameData",
  );
  return requireString(
    gameData,
    "assemblySha256",
    "planner-data.json.build.gameData",
  );
}

export function loadCorpus(repoRoot: string): VerificationCorpus {
  const fixtures = listJson(join(repoRoot, "verification", "fixtures")).map(
    (path) =>
      parseFixtureRecord(
        JSON.parse(readFileSync(path, "utf8")),
        relative(repoRoot, path),
      ),
  );
  const observations = new Map<string, ObservationRecord>();
  for (const path of listJson(join(repoRoot, "verification", "observations"))) {
    const record = parseObservationRecord(
      JSON.parse(readFileSync(path, "utf8")),
      relative(repoRoot, path),
    );
    if (observations.has(record.fixture.name))
      throw new Error(
        `observation for ${record.fixture.name} is committed twice`,
      );
    observations.set(record.fixture.name, record);
  }
  return {
    snapshotAssemblySha256: readPlannerAssemblySha256(repoRoot),
    fixtures,
    observations,
  };
}

export type ObservationStatus =
  | { kind: "missing" }
  | { kind: "stale"; observedAssembly: string; currentAssembly: string }
  | { kind: "current"; observation: ObservationRecord };

/** An observation from another assembly is neither evidence nor a failure. */
export function classifyObservation(
  fixture: FixtureRecord,
  corpus: VerificationCorpus,
): ObservationStatus {
  const observation = corpus.observations.get(fixture.name);
  if (!observation) return { kind: "missing" };
  if (observation.game.assemblySha256 !== corpus.snapshotAssemblySha256) {
    return {
      kind: "stale",
      observedAssembly: observation.game.assemblySha256,
      currentAssembly: corpus.snapshotAssemblySha256,
    };
  }
  return { kind: "current", observation };
}

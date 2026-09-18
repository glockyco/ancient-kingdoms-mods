import { compareTierA } from "./tier-a";
import { compareTierC } from "./tier-c";
import type { QuantityResult } from "./comparison";
import {
  classifyObservation,
  type FixtureRecord,
  type ObservationRecord,
  type VerificationCorpus,
} from "./corpus";

export type FixtureVerdict =
  | { name: string; tier: string; status: "missing" | "stale"; detail: string }
  | {
      name: string;
      tier: string;
      status: "pass" | "fail" | "inconclusive";
      quantities: QuantityResult[];
    };

/** Compares one fixture with its current observation, or reports why it cannot. */
export function verifyFixture(
  fixture: FixtureRecord,
  corpus: VerificationCorpus,
  catalog: unknown,
): FixtureVerdict {
  const status = classifyObservation(fixture, corpus);
  if (status.kind === "missing")
    return {
      name: fixture.name,
      tier: fixture.tier,
      status: "missing",
      detail: "no observation",
    };
  if (status.kind === "stale") {
    return {
      name: fixture.name,
      tier: fixture.tier,
      status: "stale",
      detail: `observed on ${status.observedAssembly.slice(0, 12)}, current ${status.currentAssembly.slice(0, 12)}`,
    };
  }
  const quantities = compareQuantities(fixture, catalog, status.observation);
  const outcome = quantities.some((entry) => entry.status === "fail")
    ? "fail"
    : quantities.some((entry) => entry.status === "inconclusive")
      ? "inconclusive"
      : "pass";
  return {
    name: fixture.name,
    tier: fixture.tier,
    status: outcome,
    quantities,
  };
}

function compareQuantities(
  fixture: FixtureRecord,
  catalog: unknown,
  observation: ObservationRecord,
): QuantityResult[] {
  switch (fixture.tier) {
    case "A":
      return compareTierA(fixture, catalog, observation);
    case "C":
      return compareTierC(fixture, catalog, observation);
    case "B":
    case "D":
      return [
        {
          quantity: fixture.tier,
          status: "inconclusive",
          detail: `tier ${fixture.tier} comparison is not implemented`,
        },
      ];
  }
}

/**
 * Credits coverage from executed evidence: a class, handler, school, or archetype counts only when
 * a current passing observation reached it. A fixture label alone credits nothing.
 */
export interface CoverageReport {
  classes: Map<string, string[]>;
}

export function coverageFrom(
  verdicts: readonly FixtureVerdict[],
  corpus: VerificationCorpus,
): CoverageReport {
  const classes = new Map<string, string[]>();
  for (const verdict of verdicts) {
    if (verdict.status !== "pass") continue;
    const observation = corpus.observations.get(verdict.name)!;
    const classId = achievedClass(observation);
    if (classId === null) continue;
    const names = classes.get(classId) ?? [];
    names.push(verdict.name);
    classes.set(classId, names);
  }
  return { classes };
}

function achievedClass(observation: ObservationRecord): string | null {
  const measurement = observation.observation.measurements.find(
    (entry) => entry.quantity === "statSheet",
  );
  const sample = measurement?.samples[0];
  if (typeof sample !== "object" || sample === null || !("character" in sample))
    return null;
  const character = sample.character;
  if (
    typeof character !== "object" ||
    character === null ||
    !("archetype" in character)
  )
    return null;
  return typeof character.archetype === "string"
    ? character.archetype.toLowerCase()
    : null;
}

export function formatVerdicts(verdicts: readonly FixtureVerdict[]): string {
  return verdicts
    .map((verdict) => {
      if ("detail" in verdict)
        return `${verdict.status.padEnd(12)} ${verdict.tier} ${verdict.name}: ${verdict.detail}`;
      const failed = verdict.quantities.filter(
        (entry) => entry.status !== "pass",
      );
      const detail =
        failed.length === 0
          ? `${verdict.quantities.length} quantities`
          : failed
              .map((entry) => `${entry.quantity}: ${entry.detail}`)
              .join("; ");
      return `${verdict.status.padEnd(12)} ${verdict.tier} ${verdict.name}: ${detail}`;
    })
    .join("\n");
}

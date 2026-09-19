import { compareTierA } from "./tier-a";
import { compareTierB } from "./tier-b";
import { compareTierC } from "./tier-c";
import { compareTierD } from "./tier-d";
import { catalogCoverageDomain } from "../catalog-resolver";
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
    case "B":
      return compareTierB(fixture, catalog, observation);
    case "C":
      return compareTierC(fixture, catalog, observation);
    case "D":
      return compareTierD(fixture, catalog, observation);
  }
}

/**
 * Credits coverage from executed evidence. A handler and a school are credited by the hits of the
 * listed skill in a passing tier B observation; a class by the character a passing tier D
 * observation measured; an archetype by a companion whose damage a passing tier D observation
 * read. A fixture label credits nothing, so a mislabelled fixture cannot cover what it never
 * reached. Every required handler, school, class, and archetype without a credit is named as
 * uncovered.
 */
export interface CoverageReport {
  handlers: Map<string, string[]>;
  schools: Map<string, string[]>;
  classes: Map<string, string[]>;
  archetypes: Map<string, string[]>;
  uncovered: {
    handlers: string[];
    schools: string[];
    classes: string[];
    archetypes: string[];
  };
}

export function coverageFrom(
  verdicts: readonly FixtureVerdict[],
  corpus: VerificationCorpus,
  catalog: unknown,
): CoverageReport {
  const domain = catalogCoverageDomain(catalog);
  const handlers = new Map<string, string[]>();
  const schools = new Map<string, string[]>();
  const classes = new Map<string, string[]>();
  const archetypes = new Map<string, string[]>();
  const credit = (map: Map<string, string[]>, key: string, name: string) => {
    const names = map.get(key) ?? [];
    if (!names.includes(name)) names.push(name);
    map.set(key, names);
  };
  for (const verdict of verdicts) {
    if (verdict.status !== "pass") continue;
    const fixture = corpus.fixtures.find(
      (entry) => entry.name === verdict.name,
    )!;
    const observation = corpus.observations.get(verdict.name)!;
    if (fixture.tier === "B") {
      const listed = new Set(
        (fixture.execution.actions ?? []).map((a) => a.skill),
      );
      for (const hit of observedHits(observation)) {
        if (hit.skill === null || !listed.has(hit.skill)) continue;
        const handler = domain.handlerBySkillName.get(hit.skill);
        if (handler !== undefined) credit(handlers, handler, verdict.name);
        if (hit.damageType !== null)
          credit(schools, hit.damageType.toLowerCase(), verdict.name);
      }
    }
    if (fixture.tier === "D") {
      const classId = measuredClass(observation);
      if (classId !== null && observedMaintainedEffect(observation))
        credit(classes, classId, verdict.name);
      for (const archetype of observedCompanionArchetypes(observation))
        credit(archetypes, archetype, verdict.name);
    }
  }
  return {
    handlers,
    schools,
    classes,
    archetypes,
    uncovered: {
      handlers: domain.handlers.filter((id) => !handlers.has(id)),
      schools: domain.schools.filter((id) => !schools.has(id)),
      classes: domain.classes.filter((id) => !classes.has(id)),
      archetypes: domain.archetypes.filter((id) => !archetypes.has(id)),
    },
  };
}

function observedHits(
  observation: ObservationRecord,
): { skill: string | null; damageType: string | null }[] {
  return observation.observation.measurements.flatMap((measurement) =>
    measurement.samples.flatMap((sample) => {
      if (typeof sample !== "object" || sample === null) return [];
      const sampleRecord = sample as Record<string, unknown>;
      if (!Array.isArray(sampleRecord.hits)) return [];
      return sampleRecord.hits.flatMap((hit) => {
        if (typeof hit !== "object" || hit === null) return [];
        const hitRecord = hit as Record<string, unknown>;
        return [
          {
            skill: typeof hitRecord.skill === "string" ? hitRecord.skill : null,
            damageType:
              typeof hitRecord.damageType === "string"
                ? hitRecord.damageType
                : null,
          },
        ];
      });
    }),
  );
}

function observedMaintainedEffect(observation: ObservationRecord): boolean {
  return observation.observation.measurements.some((measurement) =>
    measurement.samples.some((sample) => {
      if (typeof sample !== "object" || sample === null) return false;
      const effects = (sample as Record<string, unknown>).maintainedEffects;
      return Array.isArray(effects) && effects.length > 0;
    }),
  );
}

function observedCompanionArchetypes(observation: ObservationRecord): string[] {
  const found = new Set<string>();
  for (const measurement of observation.observation.measurements)
    for (const sample of measurement.samples) {
      if (typeof sample !== "object" || sample === null) continue;
      const sampleRecord = sample as Record<string, unknown>;
      if (!Array.isArray(sampleRecord.companionDamage)) continue;
      for (const entry of sampleRecord.companionDamage) {
        if (typeof entry !== "object" || entry === null) continue;
        const damageRecord = entry as Record<string, unknown>;
        if (typeof damageRecord.archetype === "string")
          found.add(damageRecord.archetype);
      }
    }
  return [...found];
}

function measuredClass(observation: ObservationRecord): string | null {
  const name = observation.observation.character?.class;
  return typeof name === "string" ? name.toLowerCase() : null;
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

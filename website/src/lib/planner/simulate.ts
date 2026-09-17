import type { BuildEnvelope } from "./build-envelope";
import {
  runReplicate,
  type ActionCounts,
  type EngineInput,
  type ReplicateResult,
  type TimelineEvent,
} from "./engine";
import { createRandomSource, replicateSeed } from "./random";
import type { DamageKind } from "./scenario";

export const MODEL_VERSION = "2" as const;

/** A sampled quantity summarised over replicates. */
export interface SampledValue {
  mean: number;
  standardError: number;
  replicates: number;
}

export interface AbilitySummary {
  actionId: string;
  damage: SampledValue;
  cast: SampledValue;
  refused: SampledValue;
  hits: SampledValue;
  avoided: SampledValue;
  critical: SampledValue;
  landed: SampledValue;
}

export interface EntitySummary {
  entityId: string;
  damage: SampledValue;
  damagePerSecond: SampledValue;
  abilities: readonly AbilitySummary[];
  schools: readonly { school: DamageKind; damage: SampledValue }[];
}

export interface EffectUptimeSummary {
  recipientId: string;
  skillId: string;
  uptimeFraction: SampledValue;
}

export interface SimulationResult {
  identities: {
    build: BuildEnvelope;
    modelVersion: typeof MODEL_VERSION;
    seed: number;
    replicates: number;
  };
  horizonSeconds: number;
  totalDamage: SampledValue;
  totalDamagePerSecond: SampledValue;
  entities: readonly EntitySummary[];
  effects: readonly EffectUptimeSummary[];
  targetDeathFraction: SampledValue;
  /** Event trace of the first replicate. */
  trace: readonly TimelineEvent[];
  /** Per-replicate totals, for comparison against observed samples. */
  samples: {
    totalDamage: readonly number[];
    perEntityDamage: ReadonlyMap<string, readonly number[]>;
  };
}

export interface SimulationInput {
  build: BuildEnvelope;
  seed: number;
  replicates: number;
  engine: EngineInput;
}

/** Runs every replicate on its own derived stream and summarises the results. */
export function simulate(input: SimulationInput): SimulationResult {
  if (!Number.isInteger(input.replicates) || input.replicates < 1)
    throw new RangeError("replicates must be a positive integer");
  const results: ReplicateResult[] = [];
  for (let index = 0; index < input.replicates; index += 1) {
    results.push(
      runReplicate(
        input.engine,
        createRandomSource(replicateSeed(input.seed, index)),
      ),
    );
  }
  const horizon = input.engine.horizon;
  const entityIds = input.engine.entities.map((entity) => entity.id);
  const perEntityDamage = new Map<string, number[]>();
  for (const id of entityIds)
    perEntityDamage.set(
      id,
      results.map((result) => result.damageByEntity.get(id) ?? 0),
    );
  const totalDamage = results.map((result) =>
    entityIds.reduce(
      (total, id) => total + (result.damageByEntity.get(id) ?? 0),
      0,
    ),
  );

  const entities = entityIds.map((id): EntitySummary => {
    const damage = perEntityDamage.get(id)!;
    const actionIds = uniqueKeys(
      results.map((result) => result.counts.get(id)!),
    );
    const schools = uniqueKeys(
      results.map((result) => result.damageBySchool.get(id)!),
    );
    return {
      entityId: id,
      damage: summarise(damage),
      damagePerSecond: summarise(damage.map((value) => value / horizon)),
      abilities: actionIds.map((actionId) => ({
        actionId,
        damage: summarise(
          results.map(
            (result) => result.damageByAbility.get(id)!.get(actionId) ?? 0,
          ),
        ),
        ...countSummaries(
          results.map((result) => result.counts.get(id)!.get(actionId)),
        ),
      })),
      schools: schools.map((school) => ({
        school: school as DamageKind,
        damage: summarise(
          results.map(
            (result) =>
              result.damageBySchool.get(id)!.get(school as DamageKind) ?? 0,
          ),
        ),
      })),
    };
  });

  const effectKeys = new Set<string>();
  for (const result of results) {
    for (const [recipientId, bySkill] of result.effectUptime) {
      for (const skillId of bySkill.keys())
        effectKeys.add(`${recipientId}\u0000${skillId}`);
    }
  }
  const effects = [...effectKeys].sort().map((key): EffectUptimeSummary => {
    const [recipientId, skillId] = key.split("\u0000");
    return {
      recipientId,
      skillId,
      uptimeFraction: summarise(
        results.map(
          (result) =>
            (result.effectUptime.get(recipientId)?.get(skillId) ?? 0) / horizon,
        ),
      ),
    };
  });

  return {
    identities: {
      build: input.build,
      modelVersion: MODEL_VERSION,
      seed: input.seed,
      replicates: input.replicates,
    },
    horizonSeconds: horizon,
    totalDamage: summarise(totalDamage),
    totalDamagePerSecond: summarise(
      totalDamage.map((value) => value / horizon),
    ),
    entities,
    effects,
    targetDeathFraction: summarise(
      results.map((result) => (result.targetDiedAt === null ? 0 : 1)),
    ),
    trace: results[0].trace,
    samples: { totalDamage, perEntityDamage },
  };
}

export function summarise(values: readonly number[]): SampledValue {
  const count = values.length;
  if (count === 0) throw new RangeError("cannot summarise zero samples");
  let sum = 0;
  for (const value of values) sum += value;
  const mean = sum / count;
  if (count === 1) return { mean, standardError: Number.NaN, replicates: 1 };
  let squares = 0;
  for (const value of values) squares += (value - mean) ** 2;
  return {
    mean,
    standardError: Math.sqrt(squares / (count - 1) / count),
    replicates: count,
  };
}

function countSummaries(
  counts: readonly (ActionCounts | undefined)[],
): Omit<AbilitySummary, "actionId" | "damage"> {
  const pick = (key: keyof ActionCounts): SampledValue =>
    summarise(counts.map((entry) => entry?.[key] ?? 0));
  return {
    cast: pick("cast"),
    refused: pick("refused"),
    hits: pick("hits"),
    avoided: pick("avoided"),
    critical: pick("critical"),
    landed: pick("landed"),
  };
}

function uniqueKeys(maps: readonly ReadonlyMap<string, unknown>[]): string[] {
  const keys = new Set<string>();
  for (const map of maps) for (const key of map.keys()) keys.add(key);
  return [...keys].sort();
}

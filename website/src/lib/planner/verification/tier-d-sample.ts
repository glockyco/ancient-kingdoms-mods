export interface TierDWindowSample {
  durationSeconds: number;
  playerDamage: number;
  companionDamage: {
    entityId: string;
    archetype: string;
    damage: number;
  }[];
  counts: {
    attempted: number;
    accepted: number;
    completed: number;
    landed: number;
  };
  fidelity: string;
  fidelityLimit: string | null;
  resourceTransitions: {
    atSeconds: number;
    mana: number;
    energy: number;
  }[];
  maintainedEffects: {
    skillId: string | null;
    name: string;
    firstObservedAtSeconds: number;
    lastObservedAtSeconds: number;
  }[];
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new TypeError(`${path} must be an object`);
  return value as Record<string, unknown>;
}

function finite(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new TypeError(`${path} must be a finite number`);
  return value;
}

function integer(value: unknown, path: string): number {
  const parsed = finite(value, path);
  if (!Number.isInteger(parsed) || parsed < 0)
    throw new TypeError(`${path} must be a non-negative integer`);
  return parsed;
}

function string(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0)
    throw new TypeError(`${path} must be a non-empty string`);
  return value;
}

export function parseTierDWindowSample(
  value: unknown,
  path: string,
  requiresEffect: boolean,
): TierDWindowSample {
  const sample = record(value, path);
  const companions = sample.companionDamage;
  if (!Array.isArray(companions))
    throw new TypeError(`${path}.companionDamage must be an array`);
  const counts = record(sample.counts, `${path}.counts`);
  const resources = sample.resourceTransitions;
  if (!Array.isArray(resources) || resources.length === 0)
    throw new TypeError(
      `${path}.resourceTransitions must be a non-empty array`,
    );
  const effects = sample.maintainedEffects;
  if (!Array.isArray(effects))
    throw new TypeError(`${path}.maintainedEffects must be an array`);
  if (requiresEffect && effects.length === 0)
    throw new TypeError(
      `${path}.maintainedEffects must identify a declared class effect`,
    );
  if (sample.fidelityLimit !== null && typeof sample.fidelityLimit !== "string")
    throw new TypeError(`${path}.fidelityLimit must be a string or null`);

  return {
    durationSeconds: finite(sample.durationSeconds, `${path}.durationSeconds`),
    playerDamage: finite(sample.playerDamage, `${path}.playerDamage`),
    companionDamage: companions.map((value, index) => {
      const entry = record(value, `${path}.companionDamage[${index}]`);
      return {
        entityId: string(
          entry.entityId,
          `${path}.companionDamage[${index}].entityId`,
        ),
        archetype: string(
          entry.archetype,
          `${path}.companionDamage[${index}].archetype`,
        ),
        damage: finite(
          entry.damage,
          `${path}.companionDamage[${index}].damage`,
        ),
      };
    }),
    counts: {
      attempted: integer(counts.attempted, `${path}.counts.attempted`),
      accepted: integer(counts.accepted, `${path}.counts.accepted`),
      completed: integer(counts.completed, `${path}.counts.completed`),
      landed: integer(counts.landed, `${path}.counts.landed`),
    },
    fidelity: string(sample.fidelity, `${path}.fidelity`),
    fidelityLimit: sample.fidelityLimit as string | null,
    resourceTransitions: resources.map((value, index) => {
      const entry = record(value, `${path}.resourceTransitions[${index}]`);
      return {
        atSeconds: finite(
          entry.atSeconds,
          `${path}.resourceTransitions[${index}].atSeconds`,
        ),
        mana: integer(entry.mana, `${path}.resourceTransitions[${index}].mana`),
        energy: integer(
          entry.energy,
          `${path}.resourceTransitions[${index}].energy`,
        ),
      };
    }),
    maintainedEffects: effects.map((value, index) => {
      const entry = record(value, `${path}.maintainedEffects[${index}]`);
      if (entry.skillId !== null && typeof entry.skillId !== "string")
        throw new TypeError(
          `${path}.maintainedEffects[${index}].skillId must be a string or null`,
        );
      const first = finite(
        entry.firstObservedAtSeconds,
        `${path}.maintainedEffects[${index}].firstObservedAtSeconds`,
      );
      const last = finite(
        entry.lastObservedAtSeconds,
        `${path}.maintainedEffects[${index}].lastObservedAtSeconds`,
      );
      if (last < first)
        throw new TypeError(
          `${path}.maintainedEffects[${index}].lastObservedAtSeconds must not precede firstObservedAtSeconds`,
        );
      return {
        skillId: entry.skillId as string | null,
        name: string(entry.name, `${path}.maintainedEffects[${index}].name`),
        firstObservedAtSeconds: first,
        lastObservedAtSeconds: last,
      };
    }),
  };
}

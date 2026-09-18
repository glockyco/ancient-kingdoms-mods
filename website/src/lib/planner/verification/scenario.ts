import { buildCasterStatSheet } from "../caster";
import {
  resolveLogicalBuild,
  simulateLogicalBuild,
  type ResolvedLogicalBuild,
} from "../catalog-resolver";
import { SCENARIO_SCHEMA_VERSION } from "../scenario";
import type { SimulationResult } from "../simulate";
import { effectiveCastTime, playerSkillRefractory } from "../timing";
import type { FixtureRecord, ObservationRecord } from "./corpus";

/** The replicate count every fixture comparison uses. See docs/combat-model/evidence.md. */
export const FIXTURE_REPLICATES = 128;

export interface TargetReadback {
  spawn: string;
  level: number;
  healthMax: number;
  stats: Record<string, number>;
}

export interface SettledTargetState {
  stats: Record<string, number>;
  effects: {
    skillId: string | null;
    name: string;
    category: string;
    level: number;
    remaining: number;
    expired: boolean;
  }[];
}

export interface WindowSample {
  openedAt: number;
  closedAt: number;
  hits: {
    amount: number;
    intent: number;
    skill: string | null;
    damageType: string | null;
    sameFacing: boolean;
    at: number;
  }[];
  completions: number[];
  intervals: number[];
  incoming: { at: number; amount: number }[];
  counts: {
    attempted: number;
    accepted: number;
    completed: number;
    landed: number;
  };
  fidelity: string;
  averageFrameSeconds: number;
  targetHealthRefills: number;
  settledTarget: SettledTargetState | null;
}

function requireNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new TypeError(`${path} must be a finite number`);
  return value;
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null)
    throw new TypeError(`${path} must be an object`);
  return value as Record<string, unknown>;
}

export function parseTargetReadback(value: unknown): TargetReadback {
  const record = requireRecord(value, "observation.target");
  const stats = requireRecord(record.stats, "observation.target.stats");
  const numbers: Record<string, number> = {};
  for (const [key, entry] of Object.entries(stats))
    numbers[key] = requireNumber(entry, `observation.target.stats.${key}`);
  if (typeof record.spawn !== "string")
    throw new TypeError("observation.target.spawn must be a string");
  return {
    spawn: record.spawn,
    level: requireNumber(record.level, "observation.target.level"),
    healthMax: requireNumber(record.healthMax, "observation.target.healthMax"),
    stats: numbers,
  };
}

function parseSettledTargetState(
  value: unknown,
  path: string,
): SettledTargetState | null {
  if (value === null || value === undefined) return null;
  const record = requireRecord(value, path);
  const rawStats = requireRecord(record.stats, `${path}.stats`);
  const stats: Record<string, number> = {};
  for (const [key, entry] of Object.entries(rawStats))
    stats[key] = requireNumber(entry, `${path}.stats.${key}`);
  if (!Array.isArray(record.effects))
    throw new TypeError(`${path}.effects must be an array`);
  const effects = record.effects.map((value, index) => {
    const effectPath = `${path}.effects[${index}]`;
    const effect = requireRecord(value, effectPath);
    if (effect.skillId !== null && typeof effect.skillId !== "string")
      throw new TypeError(`${effectPath}.skillId must be a string or null`);
    if (typeof effect.name !== "string" || typeof effect.category !== "string")
      throw new TypeError(`${effectPath} must name the effect and category`);
    return {
      skillId: effect.skillId as string | null,
      name: effect.name,
      category: effect.category,
      level: requireNumber(effect.level, `${effectPath}.level`),
      remaining: requireNumber(effect.remaining, `${effectPath}.remaining`),
      expired: effect.expired === true,
    };
  });
  return { stats, effects };
}

export function parseWindowSample(value: unknown, path: string): WindowSample {
  const record = requireRecord(value, path);
  const numbers = (key: string): number[] => {
    const list = record[key];
    if (!Array.isArray(list))
      throw new TypeError(`${path}.${key} must be an array`);
    return list.map((entry, index) =>
      requireNumber(entry, `${path}.${key}[${index}]`),
    );
  };
  const hits = record.hits;
  const incoming = record.incoming;
  if (!Array.isArray(hits) || !Array.isArray(incoming))
    throw new TypeError(`${path} must carry hits and incoming arrays`);
  const counts = requireRecord(record.counts, `${path}.counts`);
  return {
    openedAt: requireNumber(record.openedAt, `${path}.openedAt`),
    closedAt: requireNumber(record.closedAt, `${path}.closedAt`),
    hits: hits.map((hit, index) => {
      const entry = requireRecord(hit, `${path}.hits[${index}]`);
      return {
        amount: requireNumber(entry.amount, `${path}.hits[${index}].amount`),
        intent: requireNumber(entry.intent, `${path}.hits[${index}].intent`),
        skill: typeof entry.skill === "string" ? entry.skill : null,
        damageType:
          typeof entry.damageType === "string" ? entry.damageType : null,
        sameFacing: entry.sameFacing === true,
        at: requireNumber(entry.at, `${path}.hits[${index}].at`),
      };
    }),
    completions: numbers("completions"),
    intervals: numbers("intervals"),
    incoming: incoming.map((blow, index) => {
      const entry = requireRecord(blow, `${path}.incoming[${index}]`);
      return {
        at: requireNumber(entry.at, `${path}.incoming[${index}].at`),
        amount: requireNumber(
          entry.amount,
          `${path}.incoming[${index}].amount`,
        ),
      };
    }),
    counts: {
      attempted: requireNumber(counts.attempted, `${path}.counts.attempted`),
      accepted: requireNumber(counts.accepted, `${path}.counts.accepted`),
      completed: requireNumber(counts.completed, `${path}.counts.completed`),
      landed: requireNumber(counts.landed, `${path}.counts.landed`),
    },
    fidelity: typeof record.fidelity === "string" ? record.fidelity : "unknown",
    averageFrameSeconds: requireNumber(
      record.averageFrameSeconds,
      `${path}.averageFrameSeconds`,
    ),
    targetHealthRefills: requireNumber(
      record.targetHealthRefills,
      `${path}.targetHealthRefills`,
    ),
    settledTarget: parseSettledTargetState(
      record.settledTarget,
      `${path}.settledTarget`,
    ),
  };
}

/** Skill ids for the fixture's declared action names, in declared order. */
export function actionSkillIds(
  resolved: ResolvedLogicalBuild,
  actions: { skill: string }[],
): string[] {
  return actions.map((action) => {
    const match = resolved.player.actions.find(
      (candidate) => candidate.name === action.skill,
    );
    if (!match)
      throw new Error(
        `the build holds no castable skill named '${action.skill}'`,
      );
    return match.id;
  });
}

/**
 * Runs the engine under the state the observation reports: the target as read from the game, the
 * player and every declared companion at full resources with the effects the player carried, and
 * the declared actions as a priority list, which is how the game's follow-up loop fills every idle
 * gap.
 */
export function simulateFixtureWindow(
  fixture: FixtureRecord,
  observation: ObservationRecord,
  catalog: unknown,
  horizonSeconds: number,
  windowIndex: number,
): { result: SimulationResult; resolved: ResolvedLogicalBuild } {
  const resolved = resolveLogicalBuild(fixture.buildData, catalog);
  const target = parseTargetReadback(observation.observation.target);
  const sheet = buildCasterStatSheet(resolved.player.caster);
  const resourceKind = resolved.player.resourceKind;
  const maximum = resourceKind === "mana" ? sheet.mana : sheet.energy;
  const playerId = resolved.player.entityId;
  const activeEffects = observation.observation.activeEffects ?? [];
  // The harness opens the window when the warm-up attack enters its refractory period. The attack
  // still occupies the caster until its cast completes, so listed actions cannot start immediately.
  const defaultAttack = resolved.player.actions.find(
    (action) => action.defaultAttack,
  );
  const warmupCastSeconds = defaultAttack
    ? effectiveCastTime(
        defaultAttack.castTime,
        defaultAttack.isSpell,
        sheet.spellHaste,
      )
    : 0;
  const initialCooldowns = defaultAttack
    ? [
        {
          entityId: playerId,
          skillId: defaultAttack.id,
          remainingSeconds: playerSkillRefractory(
            defaultAttack,
            resolved.player.weaponDelay,
            sheet.haste,
          ),
        },
        ...resolved.player.actions
          .filter((action) => action.id !== defaultAttack.id)
          .map((action) => ({
            entityId: playerId,
            skillId: action.id,
            remainingSeconds: Math.max(
              warmupCastSeconds,
              action.followupDefaultAttack
                ? playerSkillRefractory(
                    defaultAttack,
                    resolved.player.weaponDelay,
                    sheet.haste,
                  )
                : 0,
            ),
          })),
      ]
    : [];
  const scenario = {
    schemaVersion: SCENARIO_SCHEMA_VERSION,
    build: resolved.build,
    name: `${fixture.name} window ${windowIndex + 1}`,
    target: {
      id: "target",
      level: target.level,
      stationary: true,
      defense: target.stats.defense,
      magicResist: target.stats.magicResist,
      poisonResist: target.stats.poisonResist,
      fireResist: target.stats.fireResist,
      coldResist: target.stats.coldResist,
      diseaseResist: target.stats.diseaseResist,
      blockChance: target.stats.blockChance,
      criticalResist: target.stats.criticalResist,
      bossOrElite: false,
      immuneDebuffs: false,
    },
    horizonSeconds,
    initialResources: [
      { entityId: playerId, resource: resourceKind, current: maximum, maximum },
      ...resolved.companions.map((companion) => {
        const companionMaximum =
          companion.resourceKind === "mana"
            ? companion.state.sheet.mana
            : companion.state.sheet.energy;
        return {
          entityId: companion.entityId,
          resource: companion.resourceKind,
          current: companionMaximum,
          maximum: companionMaximum,
        };
      }),
      {
        entityId: "target",
        resource: "health",
        current: target.healthMax,
        maximum: target.healthMax,
      },
    ],
    initialCooldowns,
    activeBuffs: activeEffects
      .filter((effect) => effect.skillId !== null)
      .map((effect) => ({
        sourceEntityId: playerId,
        targetEntityId: playerId,
        skillId: effect.skillId,
        skillLevel: effect.level,
        remainingSeconds: effect.remaining,
      })),
    consumables: [],
    ammunition: resolved.ammunition.map((item) => ({
      entityId: playerId,
      itemId: item.itemId,
      quantity: item.quantity,
    })),
    incomingEvents: [],
    roster: [
      playerId,
      ...resolved.companions.map((companion) => companion.entityId),
    ],
    targetCount: 1,
    durabilityLoss: false,
    includeHorizonEvents: true,
    seed: fixture.execution.seed + windowIndex,
    replicates: FIXTURE_REPLICATES,
  };
  const result = simulateLogicalBuild({
    buildData: fixture.buildData,
    catalog,
    scenario,
    policy: {
      kind: "priority",
      order: actionSkillIds(resolved, fixture.execution.actions ?? []),
    },
  });
  return { result, resolved };
}

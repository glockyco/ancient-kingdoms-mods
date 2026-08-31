import {
  buildCasterStatSheet,
  type CasterStatInput,
  type CasterStatSheet,
} from "./caster";
import {
  evaluateHit,
  type DamageSkillSpec,
  type EquippedWeapon,
  type HitEvaluation,
} from "./hit";
import {
  solvePlayerRotation,
  type PlayerRotationResult,
  type RotationAction,
} from "./rotation";
import {
  parseEvaluationScenario,
  type EvaluationScenario,
  type ResourceKind,
} from "./scenario";
import {
  effectiveCastTime,
  effectiveSkillCooldown,
  playerSkillRefractory,
  playerWeaponInterval,
} from "./timing";
import type { BuildEnvelope } from "./build-envelope";

export interface EvaluationFixtureAction {
  skill: DamageSkillSpec;
  defaultAttack?: boolean;
  castTime: number;
  cooldown: number;
  resourceCost: number;
  resourceGain?: number;
  initialCooldown?: number;
  ammunitionItemId?: string | null;
  hitOptions?: {
    sameFacing?: boolean;
    movingPlayerTarget?: boolean;
    normalizeKnownDefects?: boolean;
  };
}

export interface DeterministicEvaluationFixture {
  id: string;
  scenario: unknown;
  casterEntityId: string;
  casterClassId: "warrior" | "ranger" | "cleric" | "rogue" | "wizard" | "druid";
  caster: CasterStatInput;
  weapons: readonly EquippedWeapon[];
  resourceKind: Extract<ResourceKind, "mana" | "energy">;
  resourceRecoveryPerTick: number;
  weaponDelay: number;
  targetHealth: { current: number; maximum: number };
  actions: readonly EvaluationFixtureAction[];
  selection?: Readonly<Record<string, "include" | "exclude">>;
}

export interface EvaluatedAction {
  actionId: string;
  hit: HitEvaluation;
  uses: number;
  totalExpectedDamage: number;
}

export interface DeterministicEvaluationResult {
  fixtureId: string;
  build: BuildEnvelope;
  scenario: EvaluationScenario;
  caster: CasterStatSheet;
  actions: readonly EvaluatedAction[];
  rotation: PlayerRotationResult;
  totalExpectedDamage: number;
  expectedDamagePerSecond: number;
  normalizedDefects: readonly string[];
}

function resourceValue(
  scenario: EvaluationScenario,
  entityId: string,
  resource: Extract<ResourceKind, "mana" | "energy">,
): { current: number; maximum: number } {
  const value = scenario.initialResources.find(
    (candidate) =>
      candidate.entityId === entityId && candidate.resource === resource,
  );
  if (!value)
    throw new Error(`scenario has no ${resource} state for ${entityId}`);
  return value;
}

function initialCooldown(
  scenario: EvaluationScenario,
  entityId: string,
  skillId: string,
  fallback: number,
): number {
  return (
    scenario.initialCooldowns.find(
      (candidate) =>
        candidate.entityId === entityId && candidate.skillId === skillId,
    )?.remainingSeconds ?? fallback
  );
}

function ammunitionSupply(
  scenario: EvaluationScenario,
  entityId: string,
  itemId: string,
): number {
  return scenario.ammunition
    .filter(
      (supply) => supply.entityId === entityId && supply.itemId === itemId,
    )
    .reduce((total, supply) => total + supply.quantity, 0);
}

/**
 * Evaluates one source-defined fixture against the versioned build envelope and scenario. Every output
 * is an expectation; the event timeline contains no random draw.
 */
export function evaluateDeterministicFixture(
  fixture: DeterministicEvaluationFixture,
  expectedBuild: BuildEnvelope,
): DeterministicEvaluationResult {
  if (fixture.id.trim().length === 0)
    throw new TypeError("fixture.id must not be empty");
  if (fixture.caster.kind !== "player")
    throw new TypeError("deterministic player fixture needs a player caster");
  const scenario = parseEvaluationScenario(fixture.scenario, expectedBuild);
  if (!scenario.roster.includes(fixture.casterEntityId)) {
    throw new Error(
      `scenario roster does not contain ${fixture.casterEntityId}`,
    );
  }
  const resource = resourceValue(
    scenario,
    fixture.casterEntityId,
    fixture.resourceKind,
  );
  const caster = buildCasterStatSheet(fixture.caster);
  const ammunition: Record<string, number> = {};
  for (const supply of scenario.ammunition) {
    if (supply.entityId !== fixture.casterEntityId) continue;
    ammunition[supply.itemId] =
      (ammunition[supply.itemId] ?? 0) + supply.quantity;
  }
  const hitCaster = {
    kind: "player" as const,
    classId: fixture.casterClassId,
    level: fixture.caster.level,
    damage: caster.damage,
    magicDamage: caster.magicDamage,
    accuracy: caster.accuracy,
    criticalChance: caster.criticalChance,
    dexterity: caster.attributes.dexterity,
    energyCurrent: fixture.resourceKind === "energy" ? resource.current : 0,
    manaCurrent: fixture.resourceKind === "mana" ? resource.current : 0,
    weapons: fixture.weapons,
    ammunition,
  };
  const target = {
    ...scenario.target,
    currentHealth: fixture.targetHealth.current,
    maximumHealth: fixture.targetHealth.maximum,
  };
  const evaluated = fixture.actions.map((action) => ({
    action,
    hit: evaluateHit(hitCaster, target, action.skill, action.hitOptions),
  }));
  const defaults = evaluated.filter(
    ({ action }) => action.defaultAttack === true,
  );
  if (defaults.length > 1)
    throw new RangeError("fixture can contain at most one default attack");

  const rotationActions: RotationAction[] = evaluated
    .filter(({ action }) => action.defaultAttack !== true)
    .map(({ action, hit }) => ({
      id: action.skill.id,
      expectedDamage: hit.expectedDamage,
      castTime: effectiveCastTime(
        action.castTime,
        action.skill.isSpell,
        caster.spellHaste,
      ),
      cooldown: effectiveSkillCooldown(
        {
          cooldown: action.cooldown,
          isSpell: action.skill.isSpell,
          followupDefaultAttack: action.skill.followupDefaultAttack ?? false,
        },
        "player",
        caster.haste,
      ),
      refractory: playerSkillRefractory(
        {
          isSpell: action.skill.isSpell,
          requiredWeaponCategory: action.skill.requiredWeaponCategory,
        },
        fixture.weaponDelay,
        caster.haste,
      ),
      resourceCost: action.resourceCost,
      resourceGain: action.resourceGain,
      initialCooldown: initialCooldown(
        scenario,
        fixture.casterEntityId,
        action.skill.id,
        action.initialCooldown ?? 0,
      ),
      preconditionRefusal: hit.refused,
    }));
  const defaultEntry = defaults[0];
  const rotation = solvePlayerRotation({
    horizon: scenario.horizonSeconds,
    actions: rotationActions,
    selection: fixture.selection,
    autoAttack:
      defaultEntry && defaultEntry.hit.refused === null
        ? {
            id: defaultEntry.action.skill.id,
            expectedDamage: defaultEntry.hit.expectedDamage,
            interval: playerWeaponInterval(fixture.weaponDelay, caster.haste),
            resourceGain: defaultEntry.action.resourceGain,
            initialRemaining: initialCooldown(
              scenario,
              fixture.casterEntityId,
              defaultEntry.action.skill.id,
              defaultEntry.action.initialCooldown ?? 0,
            ),
          }
        : undefined,
    initialResource: resource.current,
    maximumResource: resource.maximum,
    resourceRecoveryPerTick: fixture.resourceRecoveryPerTick,
  });

  const actions = evaluated.map(({ action, hit }) => {
    const uses = rotation.abilityTotals[action.skill.id]?.uses ?? 0;
    return {
      actionId: action.skill.id,
      hit,
      uses,
      totalExpectedDamage: uses * hit.expectedDamage,
    };
  });
  for (const { action, hit } of evaluated) {
    if (hit.ammunitionPerCast <= 0) continue;
    if (!action.ammunitionItemId) {
      throw new Error(
        `${action.skill.id} consumes ammunition but names no ammunitionItemId`,
      );
    }
    const uses = rotation.abilityTotals[action.skill.id]?.uses ?? 0;
    const required = uses * hit.ammunitionPerCast;
    const supplied = ammunitionSupply(
      scenario,
      fixture.casterEntityId,
      action.ammunitionItemId,
    );
    if (required > supplied) {
      throw new Error(
        `${action.skill.id} requires ${required} ${action.ammunitionItemId}; scenario supplies ${supplied}`,
      );
    }
  }
  const normalizedDefects = [
    ...new Set(
      actions.flatMap((action) => action.hit.intent?.normalizedDefects ?? []),
    ),
  ].toSorted();
  return {
    fixtureId: fixture.id,
    build: scenario.build,
    scenario,
    caster,
    actions,
    rotation,
    totalExpectedDamage: rotation.totalExpectedDamage,
    expectedDamagePerSecond:
      scenario.horizonSeconds > 0
        ? rotation.totalExpectedDamage / scenario.horizonSeconds
        : 0,
    normalizedDefects,
  };
}

const EPSILON = 1e-9;

export interface RotationAction {
  id: string;
  expectedDamage: number;
  objectiveValue?: number;
  castTime: number;
  cooldown: number;
  refractory: number;
  resourceCost: number;
  resourceGain?: number;
  initialCooldown?: number;
  preconditionRefusal?: string | null;
}

export interface RotationAutoAttack {
  id: string;
  expectedDamage: number;
  interval: number;
  resourceGain?: number;
  initialRemaining?: number;
}

export interface PlayerRotationInput {
  horizon: number;
  actions: readonly RotationAction[];
  selection?: Readonly<Record<string, "include" | "exclude">>;
  autoAttack?: RotationAutoAttack;
  initialResource: number;
  maximumResource: number;
  resourceRecoveryPerTick: number;
}

export interface RotationEvent {
  kind: "skill" | "auto_attack";
  actionId: string;
  startsAt: number;
  completesAt: number;
  expectedDamage: number;
  resourceBefore: number;
  resourceAfter: number;
}

export interface RotationAbilityTotal {
  uses: number;
  expectedDamage: number;
}

export interface RotationExclusion {
  actionId: string;
  reason: "user" | "precondition" | "non_positive_value";
  detail?: string;
}

export interface PlayerRotationResult {
  events: readonly RotationEvent[];
  abilityTotals: Readonly<Record<string, RotationAbilityTotal>>;
  exclusions: readonly RotationExclusion[];
  totalExpectedDamage: number;
  endingResource: number;
}

interface ReadyAction extends RotationAction {
  readyAt: number;
}

function requireFiniteNonNegative(value: number, path: string): number {
  if (!Number.isFinite(value) || value < 0)
    throw new RangeError(`${path} must be finite and non-negative`);
  return value;
}

function validateInput(input: PlayerRotationInput): void {
  requireFiniteNonNegative(input.horizon, "horizon");
  requireFiniteNonNegative(input.initialResource, "initialResource");
  requireFiniteNonNegative(input.maximumResource, "maximumResource");
  requireFiniteNonNegative(
    input.resourceRecoveryPerTick,
    "resourceRecoveryPerTick",
  );
  if (input.initialResource > input.maximumResource) {
    throw new RangeError("initialResource must not exceed maximumResource");
  }
  const ids = new Set<string>();
  for (const action of input.actions) {
    if (ids.has(action.id))
      throw new RangeError(`duplicate action id ${action.id}`);
    ids.add(action.id);
    requireFiniteNonNegative(
      action.expectedDamage,
      `${action.id}.expectedDamage`,
    );
    requireFiniteNonNegative(
      action.objectiveValue ?? action.expectedDamage,
      `${action.id}.objectiveValue`,
    );
    requireFiniteNonNegative(action.castTime, `${action.id}.castTime`);
    if (!Number.isFinite(action.cooldown) || action.cooldown <= 0) {
      throw new RangeError(`${action.id}.cooldown must be finite and positive`);
    }
    requireFiniteNonNegative(action.refractory, `${action.id}.refractory`);
    requireFiniteNonNegative(action.resourceCost, `${action.id}.resourceCost`);
    requireFiniteNonNegative(
      action.resourceGain ?? 0,
      `${action.id}.resourceGain`,
    );
    requireFiniteNonNegative(
      action.initialCooldown ?? 0,
      `${action.id}.initialCooldown`,
    );
  }
  if (input.autoAttack) {
    if (ids.has(input.autoAttack.id))
      throw new RangeError(`duplicate action id ${input.autoAttack.id}`);
    requireFiniteNonNegative(
      input.autoAttack.expectedDamage,
      "autoAttack.expectedDamage",
    );
    if (
      !Number.isFinite(input.autoAttack.interval) ||
      input.autoAttack.interval <= 0
    ) {
      throw new RangeError("autoAttack.interval must be finite and positive");
    }
    requireFiniteNonNegative(
      input.autoAttack.resourceGain ?? 0,
      "autoAttack.resourceGain",
    );
    requireFiniteNonNegative(
      input.autoAttack.initialRemaining ?? 0,
      "autoAttack.initialRemaining",
    );
  }
  for (const id of Object.keys(input.selection ?? {})) {
    if (!ids.has(id))
      throw new RangeError(`selection names unknown action ${id}`);
  }
}

function addTotal(
  totals: Record<string, RotationAbilityTotal>,
  actionId: string,
  damage: number,
): void {
  const total = totals[actionId] ?? { uses: 0, expectedDamage: 0 };
  total.uses += 1;
  total.expectedDamage += damage;
  totals[actionId] = total;
}

function chooseAction(
  available: readonly ReadyAction[],
  resource: number,
): ReadyAction {
  const resourceIsBinding =
    available.reduce((sum, action) => sum + action.resourceCost, 0) > resource;
  return available.toSorted((left, right) => {
    const leftValue = left.objectiveValue ?? left.expectedDamage;
    const rightValue = right.objectiveValue ?? right.expectedDamage;
    const leftDenominator = resourceIsBinding
      ? Math.max(left.resourceCost, EPSILON)
      : Math.max(left.castTime, EPSILON);
    const rightDenominator = resourceIsBinding
      ? Math.max(right.resourceCost, EPSILON)
      : Math.max(right.castTime, EPSILON);
    const scoreDifference =
      rightValue / rightDenominator - leftValue / leftDenominator;
    if (Math.abs(scoreDifference) > EPSILON) return scoreDifference;
    if (rightValue !== leftValue) return rightValue - leftValue;
    return left.id.localeCompare(right.id);
  })[0];
}

/**
 * Builds an executable, deterministic player rotation from skill inclusion controls.
 * The caller supplies values, not an action-priority string. Cast completion starts cooldown and resets
 * the next default attack. Sources: server-scripts/Skills.cs:980-1013 and server-scripts/Player.cs:3219-3275.
 */
export function solvePlayerRotation(
  input: PlayerRotationInput,
): PlayerRotationResult {
  validateInput(input);
  const exclusions: RotationExclusion[] = [];
  const actions: ReadyAction[] = [];
  for (const action of input.actions) {
    if (input.selection?.[action.id] === "exclude") {
      exclusions.push({ actionId: action.id, reason: "user" });
      continue;
    }
    if (action.preconditionRefusal) {
      exclusions.push({
        actionId: action.id,
        reason: "precondition",
        detail: action.preconditionRefusal,
      });
      continue;
    }
    if ((action.objectiveValue ?? action.expectedDamage) <= 0) {
      exclusions.push({ actionId: action.id, reason: "non_positive_value" });
      continue;
    }
    actions.push({ ...action, readyAt: action.initialCooldown ?? 0 });
  }

  const events: RotationEvent[] = [];
  const abilityTotals: Record<string, RotationAbilityTotal> = {};
  let totalExpectedDamage = 0;
  let resource = input.initialResource;
  let now = 0;
  let nextRecoveryTick = 1;
  let nextAutoAttack = input.autoAttack?.initialRemaining ?? 0;

  const recoverThrough = (time: number): void => {
    if (input.resourceRecoveryPerTick <= 0) return;
    while (
      nextRecoveryTick <= time + EPSILON &&
      nextRecoveryTick <= input.horizon + EPSILON
    ) {
      resource = Math.min(
        input.maximumResource,
        resource + input.resourceRecoveryPerTick,
      );
      nextRecoveryTick += 1;
    }
  };

  while (now <= input.horizon + EPSILON) {
    recoverThrough(now);
    const available = actions.filter(
      (action) =>
        action.readyAt <= now + EPSILON &&
        action.resourceCost <= resource &&
        now + action.castTime <= input.horizon + EPSILON,
    );
    if (available.length > 0) {
      const action = chooseAction(available, resource);
      const startsAt = now;
      const completesAt = now + action.castTime;
      const resourceBefore = resource;
      recoverThrough(completesAt);
      resource = Math.min(
        input.maximumResource,
        resource - action.resourceCost + (action.resourceGain ?? 0),
      );
      events.push({
        kind: "skill",
        actionId: action.id,
        startsAt,
        completesAt,
        expectedDamage: action.expectedDamage,
        resourceBefore,
        resourceAfter: resource,
      });
      addTotal(abilityTotals, action.id, action.expectedDamage);
      totalExpectedDamage += action.expectedDamage;
      action.readyAt = completesAt + action.cooldown;
      nextAutoAttack = completesAt + action.refractory;
      now = completesAt;
      continue;
    }

    if (input.autoAttack && nextAutoAttack <= now + EPSILON) {
      const resourceBefore = resource;
      resource = Math.min(
        input.maximumResource,
        resource + (input.autoAttack.resourceGain ?? 0),
      );
      events.push({
        kind: "auto_attack",
        actionId: input.autoAttack.id,
        startsAt: now,
        completesAt: now,
        expectedDamage: input.autoAttack.expectedDamage,
        resourceBefore,
        resourceAfter: resource,
      });
      addTotal(
        abilityTotals,
        input.autoAttack.id,
        input.autoAttack.expectedDamage,
      );
      totalExpectedDamage += input.autoAttack.expectedDamage;
      nextAutoAttack = now + input.autoAttack.interval;
      continue;
    }

    const futureTimes = actions
      .map((action) => action.readyAt)
      .filter(
        (readyAt) =>
          readyAt > now + EPSILON && readyAt <= input.horizon + EPSILON,
      );
    if (
      input.autoAttack &&
      nextAutoAttack > now + EPSILON &&
      nextAutoAttack <= input.horizon + EPSILON
    ) {
      futureTimes.push(nextAutoAttack);
    }
    if (
      input.resourceRecoveryPerTick > 0 &&
      nextRecoveryTick > now + EPSILON &&
      nextRecoveryTick <= input.horizon + EPSILON
    ) {
      futureTimes.push(nextRecoveryTick);
    }
    if (futureTimes.length === 0) break;
    now = Math.min(...futureTimes);
  }

  return {
    events,
    abilityTotals,
    exclusions,
    totalExpectedDamage,
    endingResource: resource,
  };
}

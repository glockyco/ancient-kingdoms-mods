import { setResourceCurrent, type CombatResourceState } from "./resource";
import { reduceActiveCooldown } from "./timing";

export interface TimedEffect {
  id: string;
  ownerId: string;
  category: string;
  appliedAt: number;
  expiresAt: number;
  contribution: number;
}

export interface ConsumableSpec {
  id: string;
  effect?: Omit<TimedEffect, "ownerId" | "appliedAt" | "expiresAt"> & {
    duration: number;
  };
  resourceRestore?: { kind: "mana" | "energy"; amount: number };
}

export interface InventoryStack {
  id: string;
  quantity: number;
  infinite: boolean;
}

/** Source: server-scripts/Skills.cs:1077-1120. */
export function applyTimedEffect(
  effects: readonly TimedEffect[],
  incoming: TimedEffect,
): TimedEffect[] {
  const survivors = effects.filter((effect) => {
    if (effect.ownerId !== incoming.ownerId) return true;
    if (effect.id === incoming.id) return false;
    return !(
      incoming.category.length > 0 && effect.category === incoming.category
    );
  });
  return [...survivors, incoming];
}

export function activeEffectsAt(
  effects: readonly TimedEffect[],
  now: number,
): TimedEffect[] {
  return effects.filter(
    (effect) => effect.appliedAt <= now && effect.expiresAt > now,
  );
}

export function shouldOmitWeakerEffect(
  active: readonly TimedEffect[],
  incoming: Pick<TimedEffect, "ownerId" | "category" | "contribution">,
): boolean {
  if (incoming.category.length === 0) return false;
  return active.some(
    (effect) =>
      effect.ownerId === incoming.ownerId &&
      effect.category === incoming.category &&
      effect.contribution > incoming.contribution,
  );
}

/** Source: server-scripts/TargetBuffSkill.cs:277-297. */
export function applyCooldownReduction(
  remainingBySkill: Readonly<Record<string, number>>,
  reductionPercent: number,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(remainingBySkill).map(([skillId, remaining]) => [
      skillId,
      reduceActiveCooldown(remaining, reductionPercent),
    ]),
  );
}

/** Exact steady-state uptime for Bernoulli refresh attempts at a fixed cadence. */
export function steadyRefreshUptime(
  probability: number,
  duration: number,
  cadence: number,
): number {
  assertRefreshInputs(probability, duration, cadence);
  if (duration === 0 || probability === 0) return 0;
  const fullIntervals = Math.floor(duration / cadence);
  const remainder = duration - fullIntervals * cadence;
  const shortCoverage = 1 - (1 - probability) ** fullIntervals;
  const longCoverage = 1 - (1 - probability) ** (fullIntervals + 1);
  return (
    shortCoverage * (1 - remainder / cadence) +
    longCoverage * (remainder / cadence)
  );
}

/** Exact finite-horizon expectation for refresh attempts starting at time zero. */
export function finiteRefreshUptime(args: {
  probability: number;
  duration: number;
  cadence: number;
  horizon: number;
}): number {
  const { probability, duration, cadence, horizon } = args;
  assertRefreshInputs(probability, duration, cadence);
  if (horizon < 0) throw new RangeError("horizon must not be negative");
  if (horizon === 0 || duration === 0 || probability === 0) return 0;

  const deltas = new Map<number, number>();
  for (let attempt = 0; attempt < horizon; attempt += cadence) {
    deltas.set(attempt, (deltas.get(attempt) ?? 0) + 1);
    const expiry = Math.min(horizon, attempt + duration);
    deltas.set(expiry, (deltas.get(expiry) ?? 0) - 1);
  }
  deltas.set(horizon, deltas.get(horizon) ?? 0);

  let activeAttempts = 0;
  let previous = 0;
  let covered = 0;
  for (const time of [...deltas.keys()].sort((left, right) => left - right)) {
    covered += (time - previous) * (1 - (1 - probability) ** activeAttempts);
    activeAttempts += deltas.get(time) ?? 0;
    previous = time;
  }
  return covered / horizon;
}

/** Source: server-scripts/PotionItem.cs:121-154 and FoodItem.cs:26-45. */
export function useDeclaredConsumable(args: {
  declaredIds: ReadonlySet<string>;
  stack: InventoryStack;
  spec: ConsumableSpec;
  ownerId: string;
  now: number;
  effects: readonly TimedEffect[];
  resource?: CombatResourceState;
}): {
  stack: InventoryStack;
  effects: TimedEffect[];
  resource?: CombatResourceState;
} {
  if (!args.declaredIds.has(args.spec.id)) {
    throw new Error(`consumable ${args.spec.id} is not declared`);
  }
  if (args.stack.id !== args.spec.id) {
    throw new Error(`inventory stack ${args.stack.id} is not ${args.spec.id}`);
  }
  if (!args.stack.infinite && args.stack.quantity <= 0) {
    throw new Error(`consumable ${args.spec.id} is exhausted`);
  }

  let effects = [...args.effects];
  if (args.spec.effect) {
    const { duration, ...effect } = args.spec.effect;
    effects = applyTimedEffect(effects, {
      ...effect,
      ownerId: args.ownerId,
      appliedAt: args.now,
      expiresAt: args.now + duration,
    });
  }

  let resource = args.resource;
  if (args.spec.resourceRestore) {
    if (!resource || resource.kind !== args.spec.resourceRestore.kind) {
      throw new Error(
        `consumable ${args.spec.id} requires ${args.spec.resourceRestore.kind}`,
      );
    }
    resource = setResourceCurrent(
      resource,
      resource.current + args.spec.resourceRestore.amount,
    );
  }

  return {
    stack: args.stack.infinite
      ? args.stack
      : { ...args.stack, quantity: args.stack.quantity - 1 },
    effects,
    resource,
  };
}

/**
 * Source: server-scripts/TargetProjectileSkill.cs:30-101,141-146.
 * The model uses intended consumption and does not preserve inventory-index bugs.
 */
export function consumeExpectedAmmunition(args: {
  available: number;
  casts: number;
  expectedPerCast: number;
  infinite?: boolean;
}): { remaining: number; consumed: number } {
  if (args.available < 0 || args.casts < 0 || args.expectedPerCast < 0) {
    throw new RangeError("ammunition inputs must not be negative");
  }
  const consumed = args.infinite ? 0 : args.casts * args.expectedPerCast;
  if (consumed > args.available) {
    throw new Error(
      `insufficient ammunition: requires ${consumed}, has ${args.available}`,
    );
  }
  return { remaining: args.available - consumed, consumed };
}

export function assertNoDurabilityLoss(durabilityLoss: boolean): void {
  if (durabilityLoss) {
    throw new Error("durability loss is unsupported by this scenario");
  }
}

function assertRefreshInputs(
  probability: number,
  duration: number,
  cadence: number,
): void {
  if (probability < 0 || probability > 1 || !Number.isFinite(probability)) {
    throw new RangeError("probability must be between zero and one");
  }
  if (duration < 0) throw new RangeError("duration must not be negative");
  if (cadence <= 0) throw new RangeError("cadence must be positive");
}

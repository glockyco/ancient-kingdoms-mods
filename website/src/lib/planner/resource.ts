import { clamp, f32, floorToInt, iround, multiplyF32 } from "./engine-math";

export type ResourceKind = "mana" | "energy";
export type ResourceClass =
  "warrior" | "rogue" | "ranger" | "cleric" | "wizard" | "druid";

export interface CombatResourceState {
  kind: ResourceKind;
  current: number;
  maximum: number;
  recoveryPerTick: number;
  enabled: boolean;
  alive: boolean;
}

export interface ResourceTransition {
  state: CombatResourceState;
  amount: number;
}

/** Source: server-scripts/EnergyResource.cs:21-34,74-95. */
export function setResourceCurrent(
  state: CombatResourceState,
  current: number,
): CombatResourceState {
  return { ...state, current: clamp(current, 0, state.maximum) };
}

/** Source: server-scripts/EnergyResource.cs:74-95. */
export function recoverResourceTick(
  state: CombatResourceState,
): CombatResourceState {
  if (!state.enabled || !state.alive) return state;
  return setResourceCurrent(state, state.current + state.recoveryPerTick);
}

export function recoverResourceTicks(
  state: CombatResourceState,
  count: number,
): CombatResourceState {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError("resource tick count must be a non-negative integer");
  }
  let current = state;
  for (let index = 0; index < count; index += 1) {
    current = recoverResourceTick(current);
  }
  return current;
}

/** Source: server-scripts/Skills.cs:410-435. */
export function resourceRecoveryPerTick(args: {
  base: number;
  passivePercent: number;
  buffPercent: number;
  flatBonus: number;
  maximum: number;
}): number {
  return (
    args.base +
    iround(multiplyF32(args.passivePercent, args.maximum)) +
    iround(multiplyF32(args.buffPercent, args.maximum)) +
    args.flatBonus
  );
}

/** Source: server-scripts/Skills.cs:979-1003. */
export function spendResource(
  state: CombatResourceState,
  amount: number,
): CombatResourceState {
  if (amount < 0) throw new RangeError("resource cost must not be negative");
  if (amount > state.current) {
    throw new RangeError(
      `insufficient ${state.kind}: requires ${amount}, has ${state.current}`,
    );
  }
  return setResourceCurrent(state, state.current - amount);
}

/** Source: server-scripts/Combat.cs:1561-1568. */
export function incomingPhysicalEnergyReturn(damage: number): number {
  if (damage <= 0) return 0;
  return floorToInt(
    clamp(multiplyF32(f32(Math.sqrt(f32(damage))), 0.35), 1, 25),
  );
}

/** Source: server-scripts/Combat.cs:1252-1262. */
export function followupEnergyReturn(
  landedDamage: number,
  targetCurrentHealth: number,
): number {
  return floorToInt(
    multiplyF32(
      Math.min(Math.max(0, landedDamage), Math.max(0, targetCurrentHealth)),
      0.25,
    ),
  );
}

/** Source: server-scripts/Combat.cs:1005-1012. */
export function mysticSparkManaReturn(
  landedDamage: number,
  targetCurrentHealth: number,
): number {
  return followupEnergyReturn(landedDamage, targetCurrentHealth);
}

export function applyIncomingDamageReturn(args: {
  state: CombatResourceState;
  classId: ResourceClass;
  damage: number;
  damageType: string;
}): ResourceTransition {
  const eligible =
    args.state.kind === "energy" &&
    (args.classId === "warrior" || args.classId === "rogue") &&
    args.damageType === "normal";
  const amount = eligible ? incomingPhysicalEnergyReturn(args.damage) : 0;
  return {
    state: setResourceCurrent(args.state, args.state.current + amount),
    amount,
  };
}

export function applyOutgoingDamageReturn(args: {
  state: CombatResourceState;
  classId: ResourceClass;
  skillId: string;
  followupDefaultAttack: boolean;
  landedDamage: number;
  targetCurrentHealth: number;
}): ResourceTransition {
  const meleeReturn =
    args.state.kind === "energy" &&
    (args.classId === "warrior" || args.classId === "rogue") &&
    args.followupDefaultAttack;
  const wizardReturn =
    args.state.kind === "mana" &&
    args.classId === "wizard" &&
    args.skillId === "mystic_spark";
  const amount = meleeReturn
    ? followupEnergyReturn(args.landedDamage, args.targetCurrentHealth)
    : wizardReturn
      ? mysticSparkManaReturn(args.landedDamage, args.targetCurrentHealth)
      : 0;
  return {
    state: setResourceCurrent(args.state, args.state.current + amount),
    amount,
  };
}

/**
 * Resource burn happens inside Apply before the ordinary skill cost is charged.
 * Source: server-scripts/TargetDamageSkill.cs:128-169 and
 * server-scripts/TargetProjectileSkill.cs:216-220.
 */
export function burnCurrentResource(
  state: CombatResourceState,
): ResourceTransition {
  return {
    state: setResourceCurrent(state, 0),
    amount: state.current * 2,
  };
}

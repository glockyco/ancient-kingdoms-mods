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

/** Source: server-scripts/Skills.cs:414-439. */
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

/** Source: server-scripts/Combat.cs:1583-1590. */
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

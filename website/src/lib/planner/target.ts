import { addF32, ceilToInt, clamp, multiplyF32 } from "./engine-math";
import type { DamageKind } from "./scenario";

export interface TargetCombatStats {
  level: number;
  defense: number;
  magicResist: number;
  poisonResist: number;
  fireResist: number;
  coldResist: number;
  diseaseResist: number;
  blockChance: number;
  bossOrElite?: boolean;
  immuneDebuffs?: boolean;
  invincible?: boolean;
}

export type DebuffSchool = DamageKind | "melee";

const SCHOOL_STAT: Record<DamageKind, keyof TargetCombatStats> = {
  normal: "defense",
  magic: "magicResist",
  poison: "poisonResist",
  fire: "fireResist",
  cold: "coldResist",
  disease: "diseaseResist",
};

/** Source: server-scripts/Combat.cs:635-643. */
export function isInvulnerable(target: TargetCombatStats): boolean {
  return (
    target.invincible === true ||
    (target.magicResist >= 10_000 && target.defense >= 10_000)
  );
}

/** Source: server-scripts/Combat.cs:1506-1545. */
export function hitAvoidanceProbability(args: {
  target: TargetCombatStats;
  casterLevel: number;
  casterAccuracy: number;
  damageType: DamageKind;
  sameFacing?: boolean;
  movingPlayerTarget?: boolean;
  manaburn?: boolean;
}): number {
  if (args.manaburn) return 0;
  const levelTerm = targetLevelResistanceTerm(
    args.target.level,
    args.casterLevel,
  );
  const base =
    args.damageType === "normal"
      ? args.target.blockChance
      : multiplyF32(schoolStat(args.target, args.damageType), 0.0005);
  let probability = clamp(
    addF32(addF32(base, levelTerm), -args.casterAccuracy),
    0,
    0.9,
  );
  if (args.sameFacing) probability = multiplyF32(probability, 0.8);
  if (args.movingPlayerTarget) {
    probability = Math.max(0, addF32(probability, -0.25));
  }
  return probability;
}

/** Source: server-scripts/TargetDebuffSkill.cs:101-171. */
export function debuffLandingProbability(args: {
  target: TargetCombatStats;
  casterLevel: number;
  casterAccuracy: number;
  school: DebuffSchool;
  decreasesResists?: boolean;
  ignoresImmunity?: boolean;
  speedBonus?: number;
}): number {
  if (args.target.immuneDebuffs && !args.ignoresImmunity) return 0;
  if (args.target.bossOrElite && (args.speedBonus ?? 0) < -10) return 0;
  const resistanceStat =
    args.school === "melee"
      ? args.target.defense
      : schoolStat(args.target, args.school);
  let resistance = clamp(
    addF32(
      addF32(
        multiplyF32(resistanceStat, 0.0005),
        targetLevelResistanceTerm(args.target.level, args.casterLevel),
      ),
      -args.casterAccuracy,
    ),
    0,
    0.9,
  );
  if (args.decreasesResists) {
    resistance = clamp(addF32(resistance, -0.3), 0, 1);
  }
  return 1 - resistance;
}

/** Source: server-scripts/Combat.cs:812-838. */
export function mitigationFraction(
  target: TargetCombatStats,
  damageType: DamageKind,
): number {
  return clamp(multiplyF32(schoolStat(target, damageType), 0.0005), 0, 0.9);
}

/** Applies the engine's separate ceiling operation for one landed hit. */
export function mitigateLandedDamage(
  amount: number,
  target: TargetCombatStats,
  damageType: DamageKind,
): number {
  return (
    amount -
    ceilToInt(multiplyF32(amount, mitigationFraction(target, damageType)))
  );
}

function targetLevelResistanceTerm(
  targetLevel: number,
  casterLevel: number,
): number {
  return clamp(multiplyF32(targetLevel - casterLevel, 0.005), -0.1, 0.1);
}

function schoolStat(target: TargetCombatStats, damageType: DamageKind): number {
  return target[SCHOOL_STAT[damageType]] as number;
}

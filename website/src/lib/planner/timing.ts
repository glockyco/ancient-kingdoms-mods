import { addF32, clamp, divideF32, multiplyF32 } from "./engine-math";

export interface SkillTiming {
  castTime: number;
  cooldown: number;
  isSpell: boolean;
  requiredWeaponCategory: string;
  followupDefaultAttack: boolean;
}

/** Source: server-scripts/Player.cs:3236-3275. */
export function playerWeaponInterval(
  weaponDelay: number,
  haste: number,
): number {
  const reducedDelay = addF32(weaponDelay, -multiplyF32(weaponDelay, haste));
  return clamp(divideF32(reducedDelay, 25), 0.25, 2);
}

/** Source: server-scripts/Skills.cs:862-887. */
export function effectiveCastTime(
  castTime: number,
  isSpell: boolean,
  spellHaste: number,
): number {
  return isSpell
    ? addF32(castTime, -multiplyF32(spellHaste, castTime))
    : castTime;
}

/** Source: server-scripts/Player.cs:3236-3275. */
export function playerSkillRefractory(
  skill: Pick<SkillTiming, "isSpell" | "requiredWeaponCategory">,
  weaponDelay: number,
  haste: number,
): number {
  return !skill.isSpell && skill.requiredWeaponCategory.trim().length > 0
    ? playerWeaponInterval(weaponDelay, haste)
    : 0.75;
}

/** Source: server-scripts/Skills.cs:990-1014. */
export function effectiveSkillCooldown(
  skill: Pick<SkillTiming, "cooldown" | "isSpell" | "followupDefaultAttack">,
  casterKind: "player" | "companion",
  haste: number,
): number {
  if (
    casterKind === "companion" &&
    skill.followupDefaultAttack &&
    !skill.isSpell
  ) {
    return addF32(skill.cooldown, -multiplyF32(haste, skill.cooldown));
  }
  return skill.cooldown;
}

/** Source: server-scripts/TargetBuffSkill.cs:277-297. */
export function reduceActiveCooldown(
  remaining: number,
  reductionPercent: number,
): number {
  if (remaining <= 0 || reductionPercent <= 0) return Math.max(0, remaining);
  return Math.max(
    0,
    addF32(remaining, -Math.min(multiplyF32(remaining, reductionPercent), 30)),
  );
}

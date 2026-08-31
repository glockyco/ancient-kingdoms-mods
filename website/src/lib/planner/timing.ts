import { addF32, clamp, divideF32, multiplyF32 } from "./engine-math";

export interface SkillTiming {
  castTime: number;
  cooldown: number;
  isSpell: boolean;
  requiredWeaponCategory: string;
  followupDefaultAttack: boolean;
}

export interface ScheduledCast {
  readyAt: number;
  completesAt: number;
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

/**
 * Executes a ready-at-zero skill on cooldown. The long-cooldown policy was
 * measured by harness task 7.12 and includes a cast at the horizon endpoint.
 */
export function scheduledCooldownUses(
  horizon: number,
  cooldown: number,
  initialRemaining = 0,
): number[] {
  if (horizon < 0) throw new RangeError("horizon must not be negative");
  if (cooldown <= 0) throw new RangeError("cooldown must be positive");
  if (initialRemaining < 0) {
    throw new RangeError("initialRemaining must not be negative");
  }
  if (initialRemaining > horizon) return [];

  const finalIndex = Math.floor((horizon - initialRemaining) / cooldown);
  return Array.from(
    { length: finalIndex + 1 },
    (_, index) => initialRemaining + index * cooldown,
  );
}

/** Fractional search capacity; displayed output uses scheduledCooldownUses. */
export function fractionalCooldownCapacity(
  horizon: number,
  cooldown: number,
  initialRemaining = 0,
): number {
  if (horizon < 0) throw new RangeError("horizon must not be negative");
  if (cooldown <= 0) throw new RangeError("cooldown must be positive");
  if (initialRemaining < 0) {
    throw new RangeError("initialRemaining must not be negative");
  }
  if (initialRemaining > horizon) return 0;
  return 1 + (horizon - initialRemaining) / cooldown;
}

/**
 * Schedules cast completions when a cooldown begins at completion. This is the
 * event-timeline primitive; cooldown-only capacity remains a search bound.
 */
export function scheduledCastCompletions(args: {
  horizon: number;
  castTime: number;
  cooldown: number;
  initialRemaining?: number;
}): ScheduledCast[] {
  const { horizon, castTime, cooldown, initialRemaining = 0 } = args;
  if (castTime < 0) throw new RangeError("castTime must not be negative");
  const readyTimes = scheduledCooldownUses(
    Math.max(0, horizon - castTime),
    cooldown + castTime,
    initialRemaining,
  );
  return readyTimes.map((readyAt) => ({
    readyAt,
    completesAt: readyAt + castTime,
  }));
}

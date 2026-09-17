import type { CasterBonuses } from "./caster";
import { reduceActiveCooldown } from "./timing";
import type { DebuffSchool, TargetCombatStats } from "./target";

/** The catalog-resolved contribution of one buff or debuff skill at one level. */
export interface EffectSpec {
  skillId: string;
  name: string;
  category: string;
  duration: number;
  recipient: "self" | "target";
  /** Resist school that gates landing on a target; `null` for a self effect. */
  school: DebuffSchool | null;
  decreasesResists: boolean;
  bonuses: Partial<CasterBonuses>;
  damagePercent: number;
  magicDamagePercent: number;
  manaRecoveryPercent: number;
  energyRecoveryPercent: number;
  manaRecoveryFlat: number;
  energyRecoveryFlat: number;
  cooldownReductionPercent: number;
}

/** One applied effect in a recipient's list. */
export interface TimedEffect {
  spec: EffectSpec;
  sourceId: string;
  recipientId: string;
  appliedAt: number;
  expiresAt: number;
}

export interface EffectApplication {
  effects: TimedEffect[];
  replaced: TimedEffect[];
}

/**
 * Adds an effect to one recipient's list. An effect with the same skill refreshes in place. Otherwise
 * every effect in the incoming effect's non-empty category expires, whatever its source or magnitude.
 * Source: server-scripts/Skills.cs:1159-1197 and server-scripts/TargetDebuffSkill.cs:288-331.
 */
export function applyEffect(
  effects: readonly TimedEffect[],
  incoming: TimedEffect,
): EffectApplication {
  const replaced: TimedEffect[] = [];
  const survivors = effects.filter((effect) => {
    const sameSkill = effect.spec.skillId === incoming.spec.skillId;
    const sameCategory =
      incoming.spec.category.length > 0 &&
      effect.spec.category === incoming.spec.category;
    if (sameSkill || sameCategory) {
      replaced.push(effect);
      return false;
    }
    return true;
  });
  return { effects: [...survivors, incoming], replaced };
}

/**
 * Removes effects whose duration has elapsed. The game runs this pass on every entity update, so an
 * expired effect leaves within one frame. Source: server-scripts/Skills.cs:712-717,1248-1307.
 */
export function cleanupExpiredEffects(
  effects: readonly TimedEffect[],
  now: number,
): { effects: TimedEffect[]; expired: TimedEffect[] } {
  const expired = effects.filter((effect) => effect.expiresAt <= now);
  return {
    effects: effects.filter((effect) => effect.expiresAt > now),
    expired,
  };
}

/** Applies the defensive bonuses of a target's effects to its base stats. */
export function targetStatsWithEffects<T extends TargetCombatStats>(
  base: T,
  effects: readonly TimedEffect[],
): T {
  const stats = { ...base };
  for (const { spec } of effects) {
    stats.defense += spec.bonuses.defense ?? 0;
    stats.magicResist += spec.bonuses.magicResist ?? 0;
    stats.poisonResist += spec.bonuses.poisonResist ?? 0;
    stats.fireResist += spec.bonuses.fireResist ?? 0;
    stats.coldResist += spec.bonuses.coldResist ?? 0;
    stats.diseaseResist += spec.bonuses.diseaseResist ?? 0;
    stats.blockChance += spec.bonuses.blockChance ?? 0;
  }
  return stats;
}

/** Source: server-scripts/TargetBuffSkill.cs:277-297. */
export function applyCooldownReduction(
  readyAt: ReadonlyMap<string, number>,
  now: number,
  reductionPercent: number,
): Map<string, number> {
  const reduced = new Map<string, number>();
  for (const [skillId, at] of readyAt) {
    reduced.set(
      skillId,
      now + reduceActiveCooldown(Math.max(0, at - now), reductionPercent),
    );
  }
  return reduced;
}

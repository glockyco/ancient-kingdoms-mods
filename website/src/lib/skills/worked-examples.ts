import { atRank } from "$lib/calculation/format";
import { MAX_HEALTH } from "$lib/calculation/inputs";
import { lifetapHeal, wildStrikeDamage } from "$lib/calculation/combat";
import { damageOverTimeBonuses } from "$lib/calculation/combat-rules";
import { addF32, clamp, iround, multiplyF32 } from "$lib/planner/engine-math";
import type { LinearValue } from "$lib/types/skills";

/*
 * Worked numbers for the skill rules that take one operation. The skill page
 * states each as a sentence with one of these numbers, computed with the
 * game's arithmetic at the rank the sentence names, normally the highest.
 * Multi-step rules use calculation blocks instead.
 */

/** The hit the sentences use, before or after the defenses the rule names. */
export const EXAMPLE_HIT = 200;
/** The song length the song-duration passive's sentence uses. */
export const EXAMPLE_SONG_SECONDS = 20;
/** The learned song-duration bonus a song page's sentence uses. */
export const EXAMPLE_SONG_BONUS = 0.2;
/** The Scroll Mastery the scroll rank sentence uses. */
export const EXAMPLE_SCROLL_MASTERY = 0.37;
/** The shared Health percentage the Balance Health sentence uses. */
export const EXAMPLE_SHARED_HEALTH = 0.625;

/** The positive size of a rank-scaled drain the game stores as a negative rate. */
export function drainMagnitude(value: LinearValue): LinearValue {
  return {
    base_value: -value.base_value,
    bonus_per_level: -value.bonus_per_level,
  };
}

// Source: server-scripts/Skills.cs:1617-1623 — Reaper Form drains RoundToInt(max(0, −rate) × maximum Health) each recovery tick.
export function reaperDrain(rate: LinearValue, rank: number): number {
  const share = Math.max(0, -atRank(rate, rank));
  return iround(multiplyF32(MAX_HEALTH.value, share));
}

// Source: server-scripts/Skills.cs:1903-1938 — a positive execute bonus multiplies the tick, which then rounds.
export function executeTick(bonus: LinearValue, rank: number): number {
  return damageOverTimeBonuses(EXAMPLE_HIT, 3, 0, atRank(bonus, rank)).total;
}

// Source: server-scripts/Combat.cs:1329-1344 — lifetap healing is FloorToInt(share × damage × (1 + summed bonuses)).
export function lifetapFromHit(share: LinearValue, rank: number): number {
  return lifetapHeal(EXAMPLE_HIT, atRank(share, rank), 0);
}

/** Lifetap healing a full-damage lifetap of EXAMPLE_HIT restores with this bonus. */
export function lifetapWithBonus(bonus: LinearValue, rank: number): number {
  return lifetapHeal(EXAMPLE_HIT, 1, atRank(bonus, rank));
}

// Source: server-scripts/Combat.cs:894-908 — each victim effect heals the attacker RoundToInt(share × damage after mitigation and critical hits).
export function healOnHit(share: LinearValue, rank: number): number {
  return iround(multiplyF32(atRank(share, rank), EXAMPLE_HIT));
}

/** Wild Strike's empowered hit for an EXAMPLE_HIT auto attack. */
export function wildStrikeHit(rank: number): number {
  return wildStrikeDamage(EXAMPLE_HIT, rank);
}

// Source: server-scripts/PlayerSkills.cs:1334,1675-1685 — learned song-duration bonuses add, then multiply the base duration.
export function songDuration(baseSeconds: number, bonus: number): number {
  return multiplyF32(baseSeconds, addF32(1, bonus));
}

/** An EXAMPLE_SONG_SECONDS song lengthened by a passive's per-rank bonus at this rank. */
export function passiveSongDuration(perRank: number, rank: number): number {
  return songDuration(EXAMPLE_SONG_SECONDS, multiplyF32(perRank, rank));
}

// Source: server-scripts/ScrollItem.cs:125 — a scroll casts at RoundToInt(mastery × 20), between rank 1 and the skill's maximum.
export function scrollRank(maxRank: number): number {
  return clamp(iround(multiplyF32(EXAMPLE_SCROLL_MASTERY, 20)), 1, maxRank);
}

// Source: server-scripts/AreaHealSkill.cs:78-96 — each character's Health becomes RoundToInt(maximum Health × the averaged Health fraction).
export function balancedHealth(): number {
  return iround(multiplyF32(MAX_HEALTH.value, EXAMPLE_SHARED_HEALTH));
}

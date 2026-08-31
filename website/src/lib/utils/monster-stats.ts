import { clamp } from "$lib/planner/engine-math";

// monster-stats.ts — Pure stat math for a monster or NPC spawn.
// Source citations refer to Ancient Kingdoms server-scripts/*.cs.

// Source: server-scripts/Combat.cs:blockChance — block chance adds a hundredth of a
// percent per point of defense on top of the base curve, then clamps to 0.8.
const BLOCK_PER_DEFENSE = 0.0001;
const BLOCK_MAX = 0.8;

/**
 * A linear curve read at a level, which is how the engine stores a per-level stat.
 *
 * Source: server-scripts/LinearInt.cs:Get — baseValue + bonusPerLevel * (level - 1).
 * Source: server-scripts/LinearFloat.cs:Get — the same shape for a float curve.
 */
export function statAtLevel(
  base: number,
  perLevel: number,
  level: number,
): number {
  return base + perLevel * (level - 1);
}

/**
 * The block chance the engine actually rolls against.
 *
 * The base curve is only part of it. Defense contributes as well, so a spawn variant with
 * the same curve and more defense blocks more often, and the result is capped. Reporting
 * the base curve alone understates a high-defense spawn badly: the level 55 training dummy
 * carries 1000 defense, which is 10 points of block chance against a base of 6.4.
 *
 * Source: server-scripts/Combat.cs:blockChance.
 */
export function effectiveBlockChance(args: {
  base: number;
  perLevel: number;
  level: number;
  defense: number;
}): number {
  const fromCurve = statAtLevel(args.base, args.perLevel, args.level);
  return clamp(fromCurve + args.defense * BLOCK_PER_DEFENSE, 0, BLOCK_MAX);
}

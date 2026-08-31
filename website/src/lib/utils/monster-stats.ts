import { addF32, clamp, multiplyF32 } from "$lib/planner/engine-math";

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
  const fromCurve = addF32(
    args.base,
    multiplyF32(args.perLevel, args.level - 1),
  );
  return clamp(
    addF32(fromCurve, multiplyF32(args.defense, BLOCK_PER_DEFENSE)),
    0,
    BLOCK_MAX,
  );
}

export interface MonsterCombatCurves {
  defense_base: number;
  defense_per_level: number;
  magic_resist_base: number;
  magic_resist_per_level: number;
  poison_resist_base: number;
  poison_resist_per_level: number;
  fire_resist_base: number;
  fire_resist_per_level: number;
  cold_resist_base: number;
  cold_resist_per_level: number;
  disease_resist_base: number;
  disease_resist_per_level: number;
  block_chance_base: number;
  block_chance_per_level: number;
}

export interface MonsterSpawnCombatOverride {
  level?: number | null;
  defense?: number | null;
  magic_resist?: number | null;
  poison_resist?: number | null;
  fire_resist?: number | null;
  cold_resist?: number | null;
  disease_resist?: number | null;
}

export interface MonsterTargetCombatStats {
  level: number;
  defense: number;
  magicResist: number;
  poisonResist: number;
  fireResist: number;
  coldResist: number;
  diseaseResist: number;
  blockChance: number;
}

/** Resolves one spawn from explicit values first and level curves second. */
export function monsterTargetCombatStats(
  monster: MonsterCombatCurves,
  level: number,
  spawn?: MonsterSpawnCombatOverride,
): MonsterTargetCombatStats {
  const resolvedLevel = spawn?.level ?? level;
  const defense = resolveSpawnStat(
    spawn?.defense,
    monster.defense_base,
    monster.defense_per_level,
    resolvedLevel,
  );
  const magicResist = resolveSpawnStat(
    spawn?.magic_resist,
    monster.magic_resist_base,
    monster.magic_resist_per_level,
    resolvedLevel,
  );
  const poisonResist = resolveSpawnStat(
    spawn?.poison_resist,
    monster.poison_resist_base,
    monster.poison_resist_per_level,
    resolvedLevel,
  );
  const fireResist = resolveSpawnStat(
    spawn?.fire_resist,
    monster.fire_resist_base,
    monster.fire_resist_per_level,
    resolvedLevel,
  );
  const coldResist = resolveSpawnStat(
    spawn?.cold_resist,
    monster.cold_resist_base,
    monster.cold_resist_per_level,
    resolvedLevel,
  );
  const diseaseResist = resolveSpawnStat(
    spawn?.disease_resist,
    monster.disease_resist_base,
    monster.disease_resist_per_level,
    resolvedLevel,
  );

  return {
    level: resolvedLevel,
    defense,
    magicResist,
    poisonResist,
    fireResist,
    coldResist,
    diseaseResist,
    blockChance: effectiveBlockChance({
      base: monster.block_chance_base,
      perLevel: monster.block_chance_per_level,
      level: resolvedLevel,
      defense,
    }),
  };
}

function resolveSpawnStat(
  spawnValue: number | null | undefined,
  base: number,
  perLevel: number,
  level: number,
): number {
  return Math.max(0, spawnValue ?? statAtLevel(base, perLevel, level));
}

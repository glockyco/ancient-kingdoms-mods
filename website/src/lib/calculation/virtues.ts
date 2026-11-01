// The virtue rules the export cannot read: literals inside the game's methods.
// Thresholds, titles, effect texts, Humility multipliers and the escort and
// return points come from the export instead.

import { f32, iround, multiplyF32 } from "$lib/calculation/unity-math";

export const VIRTUE_IDS = [
  "compassion",
  "honor",
  "sacrifice",
  "humility",
  "honesty",
  "valor",
] as const;
export type VirtueId = (typeof VIRTUE_IDS)[number];

export const MAX_VIRTUE_POINTS = 15000;

/** Most blessings count rank 0 as half a rank: `Mathf.Max(0.5f, rank)`. */
const rankWeight = (rank: number): number => Math.max(0.5, rank);

// Source: server-scripts/Player.cs:VirtueHealingMultiplier — healing received rises 2% per rank, 1% at rank 0.
export function compassionHealingBonus(rank: number): number {
  return 0.02 * rankWeight(rank);
}

// Source: server-scripts/Player.cs:VirtueAccuracy — Accuracy rises 1 percentage point per rank, 0.5 at rank 0.
export function honorAccuracyBonus(rank: number): number {
  return 0.01 * rankWeight(rank);
}

// Source: server-scripts/Player.cs:VirtueCriticalResist — Critical Resist rises 2% per rank, 1% at rank 0.
export function honorCriticalResistBonus(rank: number): number {
  return 0.02 * rankWeight(rank);
}

// Source: server-scripts/Player.cs:VirtueHealthMultiplier — maximum Health rises 1% plus 1% per rank.
export function sacrificeHealthBonus(rank: number): number {
  return 0.01 * (1 + rank);
}

// Source: server-scripts/Player.cs:ApplyVirtueFactionGain — positive gains rise 5% per rank, 2.5% at rank 0.
export function honestyGainBonus(rank: number): number {
  return 0.05 * rankWeight(rank);
}

// Source: server-scripts/VirtueCombat.cs:ApplyValor — final damage to elites and bosses rises 1% per rank, 0.5% at rank 0.
export function valorDamageBonus(rank: number): number {
  return 0.01 * rankWeight(rank);
}

/** The bonus a blessing's rank gives, as a fraction, for its first stated effect. */
export function blessingBonus(virtue: VirtueId, rank: number): number | null {
  switch (virtue) {
    case "compassion":
      return compassionHealingBonus(rank);
    case "honor":
      return honorAccuracyBonus(rank);
    case "sacrifice":
      return sacrificeHealthBonus(rank);
    case "honesty":
      return honestyGainBonus(rank);
    case "valor":
      return valorDamageBonus(rank);
    case "humility":
      // The export holds Humility's multipliers.
      return null;
  }
}

// Source: server-scripts/Player.cs:ApplyVirtueFactionGain — only a positive gain rises, rounded half to even.
export function applyHonestyGain(gain: number, rank: number | null): number {
  if (rank === null || !(gain > 0)) return gain;
  return iround(gain * (1 + honestyGainBonus(rank)));
}

// Source: server-scripts/VirtueRules.cs:CombatPoints — 1 more point per 2 levels the monster is above you, up to 5.
export function combatPoints(
  basePoints: number,
  playerLevel: number,
  monsterLevel: number,
): number {
  const above = Math.max(0, Math.min(10, monsterLevel - playerLevel));
  return basePoints + Math.floor(above / 2);
}

// Source: server-scripts/VirtueRules.cs:IsEligibleMonster — a monster counts when it is at most 2 levels below you.
export function isEligibleLevel(
  playerLevel: number,
  monsterLevel: number,
): boolean {
  return monsterLevel >= playerLevel - 2;
}

// Source: server-scripts/VirtueCombat.cs:OnDeath — a kill gives Compassion 5 and Humility 2 base points.
export const COMPASSION_SPARE_BASE_POINTS = 5;
export const HUMILITY_KILL_BASE_POINTS = 2;

export interface HonorFoe {
  level: number;
  health: number;
  isBoss: boolean;
  isElite: boolean;
}

// Source: server-scripts/VirtueRules.cs:HonorPoints — 5 base points scaled by Health against a level curve, ×2 for an elite and ×3 for a boss.
export function honorPoints(foe: HonorFoe, playerLevel: number): number {
  const level = f32(Math.max(1, foe.level));
  const curve = f32(
    multiplyF32(20, level) +
      multiplyF32(multiplyF32(multiplyF32(0.12, level), level), level),
  );
  const ratio = f32(f32(Math.max(1, foe.health)) / curve);
  const scale =
    ratio <= 1 ? ratio : f32(1 + multiplyF32(0.5, f32(Math.log2(ratio))));
  const kind = foe.isBoss ? 3 : foe.isElite ? 2 : 1;
  const points = multiplyF32(
    multiplyF32(combatPoints(5, playerLevel, foe.level), scale),
    kind,
  );
  return Math.max(1, Math.min(MAX_VIRTUE_POINTS, iround(points)));
}

/** The Honor points a foe gives with no level bonus, at or above its level. */
export function honorPointsAtLevel(foe: HonorFoe): number {
  return honorPoints(foe, foe.level);
}

export interface HonorKill {
  points: number;
  /** The first foe, an elite or a boss counts fully. Another normal foe counts a tenth. */
  full: boolean;
}

// Source: server-scripts/VirtueCombat.cs:OnDeath,SettleHonorIfFinished — kills add tenths of points, capped at 150,000 tenths, and the fight pays the whole points it holds.
export function honorFightPoints(kills: readonly HonorKill[]): number {
  let tenths = 0;
  for (const kill of kills) {
    tenths = Math.min(150000, tenths + kill.points * (kill.full ? 10 : 1));
  }
  return Math.floor(tenths / 10);
}

// Source: server-scripts/Player.cs:AssignValorTarget — a shrine names a living dungeon elite or boss from 2 levels below you to 5 above.
export function valorQuarryLevels(playerLevel: number): [number, number] {
  return [playerLevel - 2, playerLevel + 5];
}

// Source: server-scripts/VirtueCombat.cs:OnDeath — a named boss gives 150 Valor points and a named elite 75.
export function valorPoints(isBoss: boolean): number {
  return isBoss ? 150 : 75;
}

export interface OfferedItem {
  item_level: number;
  quality: number;
  sellable: boolean | number;
  destroyable: boolean | number;
  is_quest_item: boolean | number;
}

// Source: server-scripts/VirtueRules.cs:SacrificeItemLevel — equipment that is not Common, can be sold and destroyed and is no quest item counts with its item level.
export function sacrificeItemLevel(item: OfferedItem): number {
  if (
    item.item_level <= 0 ||
    item.quality < 1 ||
    !item.sellable ||
    !item.destroyable ||
    item.is_quest_item
  ) {
    return 0;
  }
  return item.item_level;
}

// Source: server-scripts/VirtueRules.cs:SacrificeItemLevelPerPoint,GoldPerPoint — 50 item levels or 1,000 gold make a point.
export function sacrificeItemPoints(itemLevel: number): number {
  return itemLevel / 50;
}

// Source: server-scripts/VirtueRules.cs:SacrificeOfferingPoints — item levels and gold add up in thousandths of a point, rounded down.
export function sacrificeOfferingPoints(
  itemLevels: readonly number[],
  gold: number,
): number {
  const itemLevel = itemLevels.reduce((sum, value) => sum + value, 0);
  if (itemLevel < 0 || gold < 0) return 0;
  const whole = Math.floor(itemLevel / 50) + Math.floor(gold / 1000);
  const thousandths = (itemLevel % 50) * 20 + (gold % 1000);
  return Math.min(MAX_VIRTUE_POINTS, whole + Math.floor(thousandths / 1000));
}

export interface EscortSource {
  level: number;
  health_base: number;
  health_per_level: number;
  health_multiplier: number;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? multiplyF32(f32(sorted[middle - 1]) + f32(sorted[middle]), 0.5)
    : sorted[middle];
}

// Source: server-scripts/VirtueEscortStats.cs:TryForDungeon — the median level and the median base Health ×1.5 of the dungeon's ordinary monsters.
export function escortStats(
  monsters: readonly EscortSource[],
): { level: number; health: number } | null {
  if (monsters.length === 0) return null;
  const health = monsters.map((monster) =>
    iround(
      multiplyF32(
        monster.health_per_level * (monster.level - 1) + monster.health_base,
        monster.health_multiplier,
      ),
    ),
  );
  return {
    level: Math.max(
      1,
      iround(median(monsters.map((monster) => monster.level))),
    ),
    health: Math.max(1, iround(multiplyF32(median(health), 1.5))),
  };
}

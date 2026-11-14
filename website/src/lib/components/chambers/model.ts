// The numbers the Chambers of Chaos page shows for one entry. Everything comes from the
// rule reader: this module only arranges the game's own results for display, so the
// prerendered defaults and the browser recalculation share it.

import { TOTAL_VETERAN_POINTS } from "$lib/calculation/inputs";
import {
  completionExperience,
  enemyLevelDistribution,
  enemyScaling,
  rewardBands,
  type ChambersRewardBand,
  type ChambersRules,
  type EnemyLevelChance,
} from "$lib/calculation/chambers";

export const DEFAULT_ENTRY_LEVEL = 50;
/** The default every calculation on the site shares for total veteran points. */
export const DEFAULT_VETERAN_POINTS = TOTAL_VETERAN_POINTS.value;

export interface LevelStats {
  readonly level: number;
  readonly probability: number;
  readonly health: number;
  readonly power: number;
}

export interface ChamberScaling {
  /** "Chamber 1" to "Chamber 3", then "Guardian". */
  readonly label: string;
  /** One-based chamber number the enemy spawns in. */
  readonly chamber: number;
  readonly guardian: boolean;
  /** Possible enemy levels, lowest first. */
  readonly levels: readonly LevelStats[];
  readonly healthMin: number;
  readonly healthMax: number;
  readonly powerMin: number;
  readonly powerMax: number;
  /** Health and Power of the most likely level. */
  readonly likely: LevelStats;
}

export interface ScalingView {
  readonly entryLevel: number;
  readonly veteranPoints: number;
  /** The highest enemy level above the entry level. */
  readonly maximumLevelBonus: number;
  readonly ordinary: readonly EnemyLevelChance[];
  readonly guardian: readonly EnemyLevelChance[];
  readonly chambers: readonly ChamberScaling[];
  readonly rewardBand: ChambersRewardBand;
  readonly completionExperience: number;
}

function stats(
  rules: ChambersRules,
  chances: readonly EnemyLevelChance[],
  veteranPoints: number,
  roomIndex: number,
  guardian: boolean,
): LevelStats[] {
  return chances.map((chance) => {
    const value = enemyScaling(
      rules,
      chance.level,
      veteranPoints,
      roomIndex,
      guardian,
    );
    return {
      level: chance.level,
      probability: chance.probability,
      health: value.health,
      power: value.power,
    };
  });
}

function chamber(
  label: string,
  roomIndex: number,
  guardian: boolean,
  levels: LevelStats[],
  entryLevel: number,
): ChamberScaling {
  // The heaviest offset is 0, so the most likely enemy level is the entry level.
  const likely =
    levels.find((row) => row.level === entryLevel) ??
    levels.reduce((best, row) =>
      row.probability > best.probability ? row : best,
    );
  return {
    label,
    chamber: roomIndex + 1,
    guardian,
    levels,
    healthMin: Math.min(...levels.map((row) => row.health)),
    healthMax: Math.max(...levels.map((row) => row.health)),
    powerMin: Math.min(...levels.map((row) => row.power)),
    powerMax: Math.max(...levels.map((row) => row.power)),
    likely,
  };
}

/**
 * Enemy levels, Health targets, Power, reward band and completion experience for an
 * entry. An input the rules do not cover throws, like the calculation it wraps.
 */
export function scalingView(
  rules: ChambersRules,
  entryLevel: number,
  veteranPoints: number,
): ScalingView {
  const ordinary = enemyLevelDistribution(
    rules,
    entryLevel,
    veteranPoints,
    false,
  );
  const guardian = enemyLevelDistribution(
    rules,
    entryLevel,
    veteranPoints,
    true,
  );
  const rooms = Array.from({ length: rules.roomCount }, (_, index) => index);
  const chambers = rooms.map((room) =>
    chamber(
      `Chamber ${room + 1}`,
      room,
      false,
      stats(rules, ordinary, veteranPoints, room, false),
      entryLevel,
    ),
  );
  const last = rules.roomCount - 1;
  chambers.push(
    chamber(
      "Guardian",
      last,
      true,
      stats(rules, guardian, veteranPoints, last, true),
      entryLevel,
    ),
  );
  const [band] = rewardBands(rules, entryLevel, veteranPoints);
  return {
    entryLevel,
    veteranPoints,
    maximumLevelBonus: rules.maximumLevelBonus.get(veteranPoints) ?? 0,
    ordinary,
    guardian,
    chambers,
    rewardBand: band,
    completionExperience: completionExperience(rules, entryLevel),
  };
}

/** "1 - 3": the quantity a reward band gives. */
export function quantityLabel(band: ChambersRewardBand): string {
  return band.minimumQuantity === band.maximumQuantity
    ? String(band.minimumQuantity)
    : `${band.minimumQuantity} - ${band.maximumQuantity}`;
}

/** The band whose level and veteran range holds this entry. */
export function bandCovers(
  band: ChambersRewardBand,
  level: number,
  veteranPoints: number,
): boolean {
  return (
    band.minimumLevel <= level &&
    (band.maximumLevel === null || level <= band.maximumLevel) &&
    band.minimumVeteranPoints <= veteranPoints &&
    (band.maximumVeteranPoints === null ||
      veteranPoints <= band.maximumVeteranPoints)
  );
}

export interface TrialDraw {
  readonly kind: string;
  /** How many of the bag's entries are this kind. */
  readonly count: number;
}

/** The bag the first two chambers draw from, as kinds with their entry counts. */
export function trialDraws(bag: readonly string[]): TrialDraw[] {
  const counts = new Map<string, number>();
  for (const kind of bag) counts.set(kind, (counts.get(kind) ?? 0) + 1);
  return [...counts].map(([kind, count]) => ({ kind, count }));
}

export interface ChainItem {
  readonly id: string;
  readonly name: string;
  readonly quality: number;
  /** Public path of the item's icon, or null when it has none. */
  readonly icon: string | null;
  /** The item's game tooltip, shown on hover. */
  readonly tooltipHtml: string | null;
  readonly iconWidth: number | null;
  readonly iconHeight: number | null;
}

export interface ChainFamily {
  readonly name: string;
  /** Lowest quality first, ending at Legendary. */
  readonly tiers: readonly ChainItem[];
}

export interface Vendor {
  readonly id: string;
  readonly name: string;
}

export interface ChambersOverview {
  readonly definition: {
    readonly id: string;
    readonly zoneId: string;
    readonly roomCount: number;
    readonly runDurationSeconds: number;
    readonly minimumLevel: number;
    readonly waveCount: number;
    readonly maximumHuntTargets: number;
    readonly maximumClearTargets: number;
    readonly puzzlePenaltyGuards: number;
    readonly combatExperienceMultiplier: number;
    readonly finalTrial: string;
  };
  readonly keeper: {
    readonly id: string;
    readonly name: string;
    readonly visual_public_path: string | null;
    readonly zone_id: string | null;
    readonly zone_name: string | null;
    readonly sub_zone_name: string | null;
  };
  readonly monsters: readonly {
    readonly id: string;
    readonly name: string;
    readonly visual_public_path: string | null;
  }[];
  readonly groups: readonly {
    readonly name: string;
    readonly guards: ChambersOverview["monsters"][number];
    readonly support: ChambersOverview["monsters"][number] | null;
  }[];
  /** The smallest and largest reward amount over every level and veteran band. */
  readonly rewardRange: { readonly minimum: number; readonly maximum: number };
  readonly captures: readonly {
    readonly kind: string;
    readonly src: string;
    readonly width: number;
    readonly height: number;
  }[];
}

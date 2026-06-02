export interface FishingSuccessParams {
  rodQuality: number;
  fishingPercent: number;
  spotTier: number;
}

export interface FishDropParams extends FishingSuccessParams {
  configuredDropRate: number;
  fishCountAtSpot: number;
  fishermanCostumePieces: number;
}

export interface FishPoolItem {
  itemId: string;
  itemName: string;
  quality: number;
  tooltipHtml: string | null;
}

export interface FishOutcomeSpotDrop extends FishPoolItem {
  probability: number;
}

export type FishingOutcomeRow =
  | (FishPoolItem & {
      kind: "primary_fish" | "fallback_fish";
      chancePerBite: number;
    })
  | {
      kind: "trash" | "escape";
      label: string;
      chancePerBite: number;
    };

export interface FishingOutcomeRowsParams {
  spotDrops: FishOutcomeSpotDrop[];
  fishPoolsByQuality: Record<number, FishPoolItem[] | undefined>;
  fishingPercent: number;
  fishermanCostumePieces: number;
  spotTier: number;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function normalizeChance(value: number): number {
  return Math.round(value * 1_000_000_000_000) / 1_000_000_000_000;
}

function fishingLevelFraction(fishingPercent: number): number {
  return clamp01(fishingPercent / 100);
}

const FISHING_SUCCESS_FLOOR = 0.2;
const CEILING_FISHERMAN_PIECES = 3;

interface FishingSuccessCoefficients {
  constant: number;
  rodFactor: number;
  skillFactor: number;
}

// Source: server-scripts/Utils.cs:511-520 — GetSuccessProbFishing, per spot level
// (levelItem). chance = constant + rodFactor * rodQuality + skillFactor * skill.
function fishingSuccessCoefficients(
  spotTier: number,
): FishingSuccessCoefficients {
  switch (spotTier) {
    case 0:
      return { constant: 0.8, rodFactor: 1, skillFactor: 1 };
    case 1:
      return { constant: 0.3, rodFactor: 0.2, skillFactor: 1 };
    case 2:
      return { constant: 0, rodFactor: 0.15, skillFactor: 0.6 };
    case 3:
      return { constant: 0, rodFactor: 0.1, skillFactor: 0.5 };
    default:
      return { constant: 0, rodFactor: 0.05, skillFactor: 0.4 };
  }
}

// Source: server-scripts/Utils.cs:511-520 — GetSuccessProbFishing.
// Source: server-scripts/GatherItem.cs:652-655 — values below 0.2 show "skill too low" and do not fish.
export function fishingSpotSuccessChance({
  rodQuality,
  fishingPercent,
  spotTier,
}: FishingSuccessParams): number {
  const skill = fishingLevelFraction(fishingPercent);
  const { constant, rodFactor, skillFactor } =
    fishingSuccessCoefficients(spotTier);
  const chance = constant + rodFactor * rodQuality + skillFactor * skill;

  const clamped = clamp01(chance);
  return clamped < FISHING_SUCCESS_FLOOR ? 0 : normalizeChance(clamped);
}

// Source: server-scripts/GatherItem.cs:661-679 — one random fish drop is selected, then probability is drop probability + Fishing/2 + 2 pp per Fisherman costume piece.
export function fishDropChancePerSuccessfulHook({
  configuredDropRate,
  fishCountAtSpot,
  fishingPercent,
  fishermanCostumePieces,
}: Omit<FishDropParams, "rodQuality" | "spotTier">): number {
  if (fishCountAtSpot <= 0) return 0;

  const skill = fishingLevelFraction(fishingPercent);
  const costumeBonus = Math.max(0, fishermanCostumePieces) * 0.02;
  const selectedFishChance = clamp01(
    configuredDropRate + skill / 2 + costumeBonus,
  );
  return selectedFishChance / fishCountAtSpot;
}

export function fishDropChancePerCast(params: FishDropParams): number {
  return (
    fishingSpotSuccessChance(params) * fishDropChancePerSuccessfulHook(params)
  );
}

// Source: server-scripts/GatherItem.cs:750-756 — mastery gain chance is Random.value > 0.4 + Fishing/2, with low-tier caps.
export function fishingMasteryGainChance({
  fishingPercent,
  spotTier,
}: Pick<FishingSuccessParams, "fishingPercent" | "spotTier">): number {
  const skill = fishingLevelFraction(fishingPercent);

  if (skill >= 1) return 0;
  if (skill > 0.25 && spotTier === 0) return 0;
  if (skill > 0.5 && spotTier <= 1) return 0;
  if (skill > 0.75 && spotTier <= 2) return 0;

  return clamp01(0.6 - skill / 2);
}

// Source: server-scripts/GatherItem.cs:758 — Random.Range(1, 4) / (successChance * 5000f). Unity int upper bound is exclusive, so 1-3.
export function fishingMasteryGainRange(successChance: number): {
  min: number;
  max: number;
} {
  if (successChance <= 0) return { min: 0, max: 0 };

  return {
    min: (1 / (successChance * 5000)) * 100,
    max: (3 / (successChance * 5000)) * 100,
  };
}

// Source: server-scripts/GatherItem.cs:771-778 — fishing XP by levelItem.
export function fishingExperienceForTier(spotTier: number): number {
  switch (spotTier) {
    case 1:
      return 150;
    case 2:
      return 750;
    case 3:
      return 4000;
    case 4:
      return 10000;
    default:
      return 15;
  }
}

// Source: server-scripts/GatherItem.cs:931-937 — click window length per tier (seconds).
export function fishingClickWindowSeconds(spotTier: number): number {
  switch (spotTier) {
    case 0:
      return 2.0;
    case 1:
      return 1.5;
    case 2:
      return 1.0;
    default:
      return 0.75;
  }
}

// Source: server-scripts/Player.cs:7559 — TargetRpcSetFishWindow(Random.Range(3, 8)) (int upper bound exclusive).
export function fishingCastDelaySecondsRange(): { min: number; max: number } {
  return { min: 3, max: 7 };
}

export interface FishOutcomeParams {
  spotDrops: Array<{ probability: number }>;
  fishingPercent: number;
  fishermanCostumePieces: number;
  spotTier: number;
}

function averageSelectedFishChance({
  spotDrops,
  fishingPercent,
  fishermanCostumePieces,
}: FishOutcomeParams): number {
  if (spotDrops.length === 0) return 0;
  const skill = fishingLevelFraction(fishingPercent);
  const costumeBonus = Math.max(0, fishermanCostumePieces) * 0.02;
  const totalCappedP = spotDrops.reduce(
    (acc, drop) => acc + clamp01(drop.probability + skill / 2 + costumeBonus),
    0,
  );
  return totalCappedP / spotDrops.length;
}

// Source: server-scripts/GatherItem.cs:681-748 — fallback split after a failed primary
// configured-fish roll, by spot level (levelItem). Of the (1 − A) failed mass, each tier
// awards trash / a random lower-quality fish / nothing (escape). Rates per tier sum to 1;
// tiers beyond 3 have no in-game fallback.
function failedPrimaryFallbackRates(spotTier: number): {
  trash: number;
  lowerTierFish: number;
  escape: number;
} {
  switch (spotTier) {
    case 0:
      return { trash: 0.3, lowerTierFish: 0, escape: 0.7 };
    case 1:
      return { trash: 0.1, lowerTierFish: 0.45, escape: 0.45 };
    case 2:
      return { trash: 0, lowerTierFish: 0.75, escape: 0.25 };
    case 3:
      return { trash: 0, lowerTierFish: 0.9, escape: 0.1 };
    default:
      return { trash: 0, lowerTierFish: 0, escape: 0 };
  }
}

export function fishTrashChancePerHook(params: FishOutcomeParams): number {
  if (params.spotDrops.length === 0) return 0;
  const failedMass = 1 - averageSelectedFishChance(params);
  return failedPrimaryFallbackRates(params.spotTier).trash * failedMass;
}

// Source: server-scripts/GatherItem.cs:701-741 — higher-tier spots also award a random
// lower-quality fish (uniform from the tier's quality pool) when the primary roll fails.
export function fishLowerTierFishChancePerHook(
  params: FishOutcomeParams,
): number {
  if (params.spotDrops.length === 0) return 0;
  const failedMass = 1 - averageSelectedFishChance(params);
  return failedPrimaryFallbackRates(params.spotTier).lowerTierFish * failedMass;
}

export function fishEscapeChancePerHook(params: FishOutcomeParams): number {
  if (params.spotDrops.length === 0) return 0;
  const failedMass = 1 - averageSelectedFishChance(params);
  return failedPrimaryFallbackRates(params.spotTier).escape * failedMass;
}

export function fishFallbackPoolForSpotTier(
  spotTier: number,
  fishPoolsByQuality: Record<number, FishPoolItem[] | undefined>,
): FishPoolItem[] {
  const result: FishPoolItem[] = [];
  for (let quality = 0; quality < spotTier; quality += 1) {
    result.push(...(fishPoolsByQuality[quality] ?? []));
  }
  return result;
}

export function fishOutcomeRowsForSpot({
  spotDrops,
  fishPoolsByQuality,
  fishingPercent,
  fishermanCostumePieces,
  spotTier,
}: FishingOutcomeRowsParams): FishingOutcomeRow[] {
  const shared = {
    spotDrops,
    fishingPercent,
    fishermanCostumePieces,
    spotTier,
  };
  const primaryRows: FishingOutcomeRow[] = spotDrops.map((drop) => ({
    kind: "primary_fish",
    itemId: drop.itemId,
    itemName: drop.itemName,
    quality: drop.quality,
    tooltipHtml: drop.tooltipHtml,
    chancePerBite: fishDropChancePerSuccessfulHook({
      configuredDropRate: drop.probability,
      fishCountAtSpot: spotDrops.length,
      fishingPercent,
      fishermanCostumePieces,
    }),
  }));

  const lowerTierPool = fishFallbackPoolForSpotTier(
    spotTier,
    fishPoolsByQuality,
  );
  const lowerTierTotal = fishLowerTierFishChancePerHook(shared);
  const fallbackRows: FishingOutcomeRow[] = lowerTierPool.map((fish) => ({
    kind: "fallback_fish",
    ...fish,
    chancePerBite:
      lowerTierPool.length > 0 ? lowerTierTotal / lowerTierPool.length : 0,
  }));

  return [
    ...primaryRows,
    ...fallbackRows,
    {
      kind: "trash",
      label: "Trash catch",
      chancePerBite: fishTrashChancePerHook(shared),
    },
    {
      kind: "escape",
      label: "Fish escapes",
      chancePerBite: fishEscapeChancePerHook(shared),
    },
  ];
}

export interface FishChanceRangeBounds {
  min: number;
  max: number;
}

interface FishingLoadout {
  rodQuality: number;
  fishingPercent: number;
}

function chanceBounds(a: number, b: number): FishChanceRangeBounds {
  return {
    min: normalizeChance(Math.min(a, b)),
    max: normalizeChance(Math.max(a, b)),
  };
}

// Source: server-scripts/GatherItem.cs:652-655 — fishing needs success >= 0.2.
// Smallest Fishing skill (percent) at which the given rod clears that floor.
export function lowestCatchableSkillPercent(
  rodQuality: number,
  spotTier: number,
): number {
  const { constant, rodFactor, skillFactor } =
    fishingSuccessCoefficients(spotTier);
  const base = constant + rodFactor * rodQuality;
  if (base >= FISHING_SUCCESS_FLOOR) return 0;
  if (skillFactor <= 0) return 100;
  return clamp01((FISHING_SUCCESS_FLOOR - base) / skillFactor) * 100;
}

// Worst realistic loadout that can still hook a fish: the spot's required rod at
// the lowest skill clearing the success floor, no costume bonus. Falls back to
// the best rod only if the required rod can never hook (not possible with the
// shipped tiers, but kept correct under data changes).
function fishingFloorLoadout(
  spotTier: number,
  requiredRodQuality: number,
  bestRodQuality: number,
): FishingLoadout {
  const requiredFloor = lowestCatchableSkillPercent(
    requiredRodQuality,
    spotTier,
  );
  const catchable =
    fishingSpotSuccessChance({
      rodQuality: requiredRodQuality,
      fishingPercent: requiredFloor,
      spotTier,
    }) > 0;
  if (catchable) {
    return { rodQuality: requiredRodQuality, fishingPercent: requiredFloor };
  }
  return {
    rodQuality: bestRodQuality,
    fishingPercent: lowestCatchableSkillPercent(bestRodQuality, spotTier),
  };
}

const fishingCeilingLoadout = (bestRodQuality: number): FishingLoadout => ({
  rodQuality: bestRodQuality,
  fishingPercent: 100,
});

export interface FishDropChanceRangeParams {
  configuredDropRate: number;
  fishCountAtSpot: number;
  spotTier: number;
  requiredRodQuality: number;
  bestRodQuality: number;
}

// Per-cast chance for one configured fish, spanning the worst-to-best loadout.
export function fishDropChanceRange({
  configuredDropRate,
  fishCountAtSpot,
  spotTier,
  requiredRodQuality,
  bestRodQuality,
}: FishDropChanceRangeParams): FishChanceRangeBounds {
  if (fishCountAtSpot <= 0) return { min: 0, max: 0 };
  const floor = fishingFloorLoadout(
    spotTier,
    requiredRodQuality,
    bestRodQuality,
  );
  const ceiling = fishingCeilingLoadout(bestRodQuality);
  return chanceBounds(
    fishDropChancePerCast({
      configuredDropRate,
      fishCountAtSpot,
      spotTier,
      rodQuality: floor.rodQuality,
      fishingPercent: floor.fishingPercent,
      fishermanCostumePieces: 0,
    }),
    fishDropChancePerCast({
      configuredDropRate,
      fishCountAtSpot,
      spotTier,
      rodQuality: ceiling.rodQuality,
      fishingPercent: ceiling.fishingPercent,
      fishermanCostumePieces: CEILING_FISHERMAN_PIECES,
    }),
  );
}

export interface FishTrashChanceRangeParams {
  spotDrops: Array<{ probability: number }>;
  spotTier: number;
  trashCount: number;
  requiredRodQuality: number;
  bestRodQuality: number;
}

// Per-cast chance of one specific trash item: total trash mass split across the
// global trash pool, spanning the worst-to-best loadout.
export function fishTrashChanceRange({
  spotDrops,
  spotTier,
  trashCount,
  requiredRodQuality,
  bestRodQuality,
}: FishTrashChanceRangeParams): FishChanceRangeBounds {
  if (trashCount <= 0 || spotDrops.length === 0) return { min: 0, max: 0 };
  const perCast = (loadout: FishingLoadout, pieces: number): number =>
    (fishingSpotSuccessChance({
      rodQuality: loadout.rodQuality,
      fishingPercent: loadout.fishingPercent,
      spotTier,
    }) *
      fishTrashChancePerHook({
        spotDrops,
        fishingPercent: loadout.fishingPercent,
        fishermanCostumePieces: pieces,
        spotTier,
      })) /
    trashCount;
  return chanceBounds(
    perCast(
      fishingFloorLoadout(spotTier, requiredRodQuality, bestRodQuality),
      0,
    ),
    perCast(fishingCeilingLoadout(bestRodQuality), CEILING_FISHERMAN_PIECES),
  );
}

export interface FishFallbackChanceRangeParams {
  spotDrops: Array<{ probability: number }>;
  spotTier: number;
  fallbackPoolSize: number;
  requiredRodQuality: number;
  bestRodQuality: number;
}

// Per-cast chance of one specific lower-tier fallback fish: lower-tier mass split
// across the fallback pool, spanning the worst-to-best loadout.
export function fishFallbackChanceRange({
  spotDrops,
  spotTier,
  fallbackPoolSize,
  requiredRodQuality,
  bestRodQuality,
}: FishFallbackChanceRangeParams): FishChanceRangeBounds {
  if (fallbackPoolSize <= 0 || spotDrops.length === 0)
    return { min: 0, max: 0 };
  const perCast = (loadout: FishingLoadout, pieces: number): number =>
    (fishingSpotSuccessChance({
      rodQuality: loadout.rodQuality,
      fishingPercent: loadout.fishingPercent,
      spotTier,
    }) *
      fishLowerTierFishChancePerHook({
        spotDrops,
        fishingPercent: loadout.fishingPercent,
        fishermanCostumePieces: pieces,
        spotTier,
      })) /
    fallbackPoolSize;
  return chanceBounds(
    perCast(
      fishingFloorLoadout(spotTier, requiredRodQuality, bestRodQuality),
      0,
    ),
    perCast(fishingCeilingLoadout(bestRodQuality), CEILING_FISHERMAN_PIECES),
  );
}

// Number of lower-tier fish a spot can award as fallback: non-trash fish whose
// quality is strictly below the spot tier.
export function fishingFallbackPoolSize(
  fishQualities: number[],
  spotTier: number,
): number {
  let count = 0;
  for (const quality of fishQualities) {
    if (quality < spotTier) count += 1;
  }
  return count;
}

export interface FishingRoleRangeParams {
  role: "primary" | "fallback" | "trash" | null;
  configuredDropRate: number;
  spotDrops: Array<{ probability: number }>;
  spotTier: number;
  requiredRodQuality: number;
  bestRodQuality: number;
  trashCount: number;
  fallbackPoolSize: number;
}

// Single entry point that picks the right per-cast range helper for a fishing
// source role, so consumers never re-decide the formula.
export function fishingRangeForRole({
  role,
  configuredDropRate,
  spotDrops,
  spotTier,
  requiredRodQuality,
  bestRodQuality,
  trashCount,
  fallbackPoolSize,
}: FishingRoleRangeParams): FishChanceRangeBounds {
  const shared = { spotTier, requiredRodQuality, bestRodQuality };
  if (role === "trash") {
    return fishTrashChanceRange({ spotDrops, trashCount, ...shared });
  }
  if (role === "fallback") {
    return fishFallbackChanceRange({ spotDrops, fallbackPoolSize, ...shared });
  }
  return fishDropChanceRange({
    configuredDropRate,
    fishCountAtSpot: spotDrops.length,
    ...shared,
  });
}

export type FishingOutcomeRangeRow =
  | (FishPoolItem & {
      kind: "primary_fish" | "fallback_fish";
      chancePerCastMin: number;
      chancePerCastMax: number;
    })
  | {
      kind: "trash" | "escape" | "no_catch";
      label: string;
      chancePerCastMin: number;
      chancePerCastMax: number;
    };

export interface FishingOutcomeRangesParams {
  spotDrops: FishOutcomeSpotDrop[];
  fishPoolsByQuality: Record<number, FishPoolItem[] | undefined>;
  spotTier: number;
  requiredRodQuality: number;
  bestRodQuality: number;
}

// Per-cast outcome distribution for a fishing spot across the worst-to-best
// loadout, including a "No catch" remainder (1 − success) so the rows sum to
// 100% per cast.
export function fishOutcomeRangesForSpot({
  spotDrops,
  fishPoolsByQuality,
  spotTier,
  requiredRodQuality,
  bestRodQuality,
}: FishingOutcomeRangesParams): FishingOutcomeRangeRow[] {
  const floor = fishingFloorLoadout(
    spotTier,
    requiredRodQuality,
    bestRodQuality,
  );
  const ceiling = fishingCeilingLoadout(bestRodQuality);
  const lowRows = fishOutcomeRowsForSpot({
    spotDrops,
    fishPoolsByQuality,
    fishingPercent: floor.fishingPercent,
    fishermanCostumePieces: 0,
    spotTier,
  });
  const highRows = fishOutcomeRowsForSpot({
    spotDrops,
    fishPoolsByQuality,
    fishingPercent: ceiling.fishingPercent,
    fishermanCostumePieces: CEILING_FISHERMAN_PIECES,
    spotTier,
  });
  const successLow = fishingSpotSuccessChance({
    rodQuality: floor.rodQuality,
    fishingPercent: floor.fishingPercent,
    spotTier,
  });
  const successHigh = fishingSpotSuccessChance({
    rodQuality: ceiling.rodQuality,
    fishingPercent: ceiling.fishingPercent,
    spotTier,
  });

  const rows: FishingOutcomeRangeRow[] = lowRows.map((low, index) => {
    const high = highRows[index] ?? low;
    const bounds = chanceBounds(
      low.chancePerBite * successLow,
      high.chancePerBite * successHigh,
    );
    if ("itemId" in low) {
      return {
        kind: low.kind,
        itemId: low.itemId,
        itemName: low.itemName,
        quality: low.quality,
        tooltipHtml: low.tooltipHtml,
        chancePerCastMin: bounds.min,
        chancePerCastMax: bounds.max,
      };
    }
    return {
      kind: low.kind,
      label: low.label,
      chancePerCastMin: bounds.min,
      chancePerCastMax: bounds.max,
    };
  });

  const noCatch = chanceBounds(1 - successLow, 1 - successHigh);
  rows.push({
    kind: "no_catch",
    label: "No catch",
    chancePerCastMin: noCatch.min,
    chancePerCastMax: noCatch.max,
  });

  return rows;
}

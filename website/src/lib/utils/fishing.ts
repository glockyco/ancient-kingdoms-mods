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

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function normalizeChance(value: number): number {
  return Math.round(value * 1_000_000_000_000) / 1_000_000_000_000;
}

function fishingLevelFraction(fishingPercent: number): number {
  return clamp01(fishingPercent / 100);
}

// Source: server-scripts/Utils.cs:511-520 — GetSuccessProbFishing.
// Source: server-scripts/GatherItem.cs:652-655 — values below 0.2 show "skill too low" and do not fish.
export function fishingSpotSuccessChance({
  rodQuality,
  fishingPercent,
  spotTier,
}: FishingSuccessParams): number {
  const skill = fishingLevelFraction(fishingPercent);
  let chance: number;

  switch (spotTier) {
    case 0:
      chance = 0.8 + rodQuality + skill;
      break;
    case 1:
      chance = 0.3 + rodQuality * 0.2 + skill;
      break;
    case 2:
      chance = rodQuality * 0.15 + skill * 0.6;
      break;
    case 3:
      chance = rodQuality * 0.1 + skill * 0.5;
      break;
    default:
      chance = rodQuality * 0.05 + skill * 0.4;
      break;
  }

  const clamped = clamp01(chance);
  return clamped < 0.2 ? 0 : normalizeChance(clamped);
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

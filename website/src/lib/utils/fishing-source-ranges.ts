/**
 * Per-cast fishing range resolution for an item's gathering sources.
 *
 * The item detail page (server, better-sqlite3) and the item map popup (browser,
 * sql.js) run in different environments and cannot share a database connection,
 * so each owns a thin loader. Everything else — the SQL text, the input shape,
 * and the per-source computation — lives here and delegates the math to
 * `fishing.ts`, keeping a single definition of how fishing chances are derived.
 */

import {
  fishingFallbackPoolSize,
  fishingRangeForRole,
  type FishChanceRangeBounds,
} from "./fishing";

/** A fishing spot row (column aliases match {@link FISHING_RANGE_QUERIES.spots}). */
export interface FishingSpotRow {
  id: string;
  spotTier: number;
  requiredRodQuality: number;
}

/** A configured drop rate row (aliases match {@link FISHING_RANGE_QUERIES.dropRates}). */
export interface FishingDropRateRow {
  resourceId: string;
  dropRate: number;
}

export interface FishingSpotRangeInputs {
  spotTier: number;
  requiredRodQuality: number;
  /** Configured drop rates of every fish at the spot (for fish count and averages). */
  dropRates: number[];
}

/** All inputs the range helpers need, loaded once per request. */
export interface FishingRangeData {
  spotById: Map<string, FishingSpotRangeInputs>;
  bestRodQuality: number;
  /** Size of the global trash pool (one trash outcome is split across it). */
  trashCount: number;
  /** Quality of every non-trash fish, used to size the fallback pool per tier. */
  fishQualities: number[];
}

export interface FishingSourceRef {
  resourceId: string;
  role: "primary" | "fallback" | "trash" | null;
  /** This fish's configured drop rate at the spot (primary sources only). */
  configuredDropRate: number;
}

/**
 * Shared SQL so the server and browser loaders cannot drift. Column aliases line
 * up with the `*Row` interfaces above; scalar queries expose a `value` column.
 */
export const FISHING_RANGE_QUERIES = {
  spots: `
    SELECT gr.id AS id, gr.level AS spotTier,
           COALESCE(rod.quality, 0) AS requiredRodQuality
    FROM gathering_resources gr
    LEFT JOIN items rod ON rod.id = gr.tool_required_id
    WHERE gr.is_fishing_spot = 1`,
  dropRates: `
    SELECT isg.resource_id AS resourceId, isg.drop_rate AS dropRate
    FROM item_sources_gather isg
    JOIN gathering_resources gr ON gr.id = isg.resource_id
    WHERE gr.is_fishing_spot = 1`,
  bestRodQuality: `
    SELECT COALESCE(MAX(quality), 0) AS value
    FROM items WHERE weapon_category = 'Fishing Rod'`,
  trashCount: `SELECT COUNT(*) AS value FROM fish WHERE is_trash = 1`,
  fishQualities: `
    SELECT i.quality AS quality
    FROM fish f JOIN items i ON i.id = f.item_id
    WHERE f.is_trash = 0`,
} as const;

/** Builds the lookup structure from the raw rows returned by the loaders. */
export function assembleFishingRangeData(parts: {
  spots: FishingSpotRow[];
  dropRates: FishingDropRateRow[];
  bestRodQuality: number;
  trashCount: number;
  fishQualities: number[];
}): FishingRangeData {
  const dropRatesById = new Map<string, number[]>();
  for (const { resourceId, dropRate } of parts.dropRates) {
    const rates = dropRatesById.get(resourceId);
    if (rates) rates.push(dropRate);
    else dropRatesById.set(resourceId, [dropRate]);
  }

  const spotById = new Map<string, FishingSpotRangeInputs>();
  for (const spot of parts.spots) {
    spotById.set(spot.id, {
      spotTier: spot.spotTier,
      requiredRodQuality: spot.requiredRodQuality,
      dropRates: dropRatesById.get(spot.id) ?? [],
    });
  }

  return {
    spotById,
    bestRodQuality: parts.bestRodQuality,
    trashCount: parts.trashCount,
    fishQualities: parts.fishQualities,
  };
}

/**
 * Per-cast min/max chance for one gathering source, or `null` when the resource
 * is not a known fishing spot.
 */
export function resolveFishingSourceRange(
  data: FishingRangeData,
  source: FishingSourceRef,
): FishChanceRangeBounds | null {
  const spot = data.spotById.get(source.resourceId);
  if (!spot) return null;
  return fishingRangeForRole({
    role: source.role,
    configuredDropRate: source.configuredDropRate,
    spotDrops: spot.dropRates.map((probability) => ({ probability })),
    spotTier: spot.spotTier,
    requiredRodQuality: spot.requiredRodQuality,
    bestRodQuality: data.bestRodQuality,
    trashCount: data.trashCount,
    fallbackPoolSize: fishingFallbackPoolSize(
      data.fishQualities,
      spot.spotTier,
    ),
  });
}

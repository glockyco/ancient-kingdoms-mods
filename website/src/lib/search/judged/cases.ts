import development from "./development.json";
import heldOut from "./held-out.json";
import tuning from "./tuning.json";

/**
 * A judged search query: one accepted destination must appear within `k`
 * results. Destinations are exact hrefs, including any section anchor.
 */
export interface JudgedCase {
  readonly q: string;
  readonly intent: string;
  readonly expect: readonly string[];
  readonly k: number;
}

/** Hand-written queries that ranking settings may be tuned against. */
export const TUNING_CASES: readonly JudgedCase[] = tuning;

/**
 * Sampled entity queries and hand-written concept queries. Typo policies were
 * compared on this set, so it is development evidence, not a validation set.
 */
export const DEVELOPMENT_CASES: readonly JudgedCase[] = development;

/**
 * Frozen after the ranking settings were chosen. Tune nothing against it; a
 * drop in its pass count is the regression signal.
 */
export const HELD_OUT_CASES: readonly JudgedCase[] = heldOut;

import { remember, rememberedValue } from "$lib/calculation/remembered.svelte";
import { MAX_VETERAN, MERC_MIN_LEVEL } from "$lib/utils/merc-stats";

/**
 * The player values that change mercenary numbers: level, total veteran
 * points, and Charisma. They are the same remembered character values every
 * calculation uses, read here within the mercenary controls' bounds.
 */
export interface MercenaryOwner {
  level: number;
  veteran: number;
  charisma: number;
}

/** Source: server-scripts/NetworkManagerMMO.cs:805-808 — the player level cap is 50. */
export const MAX_LEVEL = 50;
/** Charisma above 125 gives no more discount. The limit matches the Mercenary Stat Ranges calculator. */
export const MAX_CHARISMA = 200;

export const OWNER_LIMITS = {
  level: [MERC_MIN_LEVEL, MAX_LEVEL],
  veteran: [0, MAX_VETERAN],
  charisma: [0, MAX_CHARISMA],
} as const satisfies Record<keyof MercenaryOwner, readonly [number, number]>;

const DEFAULTS: MercenaryOwner = {
  level: MAX_LEVEL,
  veteran: MAX_VETERAN,
  charisma: 0,
};

function bounded(key: keyof MercenaryOwner, value: number): number {
  const [lo, hi] = OWNER_LIMITS[key];
  return Math.min(hi, Math.max(lo, Math.round(value)));
}

function read(key: keyof MercenaryOwner): number {
  const value = rememberedValue(key);
  return value === undefined ? DEFAULTS[key] : bounded(key, value);
}

/** The values within the controls' bounds. Read them in markup or `$derived` to stay reactive. */
export const mercenaryOwner: Readonly<MercenaryOwner> = {
  get level() {
    return read("level");
  },
  get veteran() {
    return read("veteran");
  },
  get charisma() {
    return read("charisma");
  },
};

/** Set one value within its bounds for every calculation that uses it. */
export function setMercenaryOwner(
  key: keyof MercenaryOwner,
  value: number,
): void {
  if (Number.isFinite(value)) remember(key, bounded(key, value));
}

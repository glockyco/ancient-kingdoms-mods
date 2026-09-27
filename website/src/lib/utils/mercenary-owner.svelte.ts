import { MAX_VETERAN, MERC_MIN_LEVEL } from "$lib/utils/merc-stats";

/**
 * The player values that change mercenary numbers: level, total veteran
 * points, and Charisma. Mercenary pages share one instance and keep it in
 * localStorage, so a value set on one page applies on every other page.
 *
 * Prerendered HTML uses the defaults. The browser loads the saved values
 * after hydration.
 */
export interface MercenaryOwner {
  level: number;
  veteran: number;
  charisma: number;
}

const STORAGE_KEY = "ak.mercenaryOwner";

/** Source: server-scripts/NetworkManagerMMO.cs:764-767 — the player level cap is 50. */
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

const owner = $state<MercenaryOwner>({ ...DEFAULTS });
let restored = false;

function bounded(key: keyof MercenaryOwner, value: number): number {
  const [lo, hi] = OWNER_LIMITS[key];
  return Math.min(hi, Math.max(lo, Math.round(value)));
}

function save(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(owner));
  } catch {
    // Storage is unavailable, for example in a private window. The values
    // stay in memory for this page.
  }
}

/**
 * Load the saved values. Call from `onMount` so that it runs only in the
 * browser. A saved value that is not a finite number keeps its default.
 */
export function restoreMercenaryOwner(): void {
  if (restored) return;
  restored = true;
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return;
  }
  if (raw === null) return;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }
  if (typeof parsed !== "object" || parsed === null) return;
  for (const key of Object.keys(OWNER_LIMITS) as (keyof MercenaryOwner)[]) {
    const value = (parsed as Record<string, unknown>)[key];
    if (typeof value === "number" && Number.isFinite(value))
      owner[key] = bounded(key, value);
  }
}

/** Set one value, keep it inside its limits, and save all values. */
export function setMercenaryOwner(
  key: keyof MercenaryOwner,
  value: number,
): void {
  if (!Number.isFinite(value)) return;
  owner[key] = bounded(key, value);
  save();
}

/** The shared values. Read them in markup or `$derived` to stay reactive. */
export const mercenaryOwner: Readonly<MercenaryOwner> = owner;

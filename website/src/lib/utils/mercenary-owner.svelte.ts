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

const STORAGE_PREFIX = "calculation:";
const LEGACY_STORAGE_KEY = "ak.mercenaryOwner";

/** Source: server-scripts/NetworkManagerMMO.cs:768-771 — the player level cap is 50. */
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

function bounded(key: keyof MercenaryOwner, value: number): number {
  const [lo, hi] = OWNER_LIMITS[key];
  return Math.min(hi, Math.max(lo, Math.round(value)));
}

function save(key: keyof MercenaryOwner): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, String(owner[key]));
  } catch {
    // Storage unavailable: controls keep their values in memory.
  }
}

/**
 * Read the shared calculation values whenever a mercenary page mounts.
 * A legacy record fills only missing shared keys, then is removed.
 */
export function restoreMercenaryOwner(): void {
  try {
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy !== null) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(legacy);
      } catch {
        parsed = null;
      }
      if (typeof parsed === "object" && parsed !== null) {
        for (const key of Object.keys(
          OWNER_LIMITS,
        ) as (keyof MercenaryOwner)[]) {
          const value = (parsed as Record<string, unknown>)[key];
          if (
            localStorage.getItem(STORAGE_PREFIX + key) === null &&
            typeof value === "number" &&
            Number.isFinite(value)
          ) {
            localStorage.setItem(
              STORAGE_PREFIX + key,
              String(bounded(key, value)),
            );
          }
        }
      }
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
    for (const key of Object.keys(OWNER_LIMITS) as (keyof MercenaryOwner)[]) {
      const raw = localStorage.getItem(STORAGE_PREFIX + key);
      const value = raw === null ? Number.NaN : Number(raw);
      owner[key] = Number.isFinite(value) ? bounded(key, value) : DEFAULTS[key];
    }
  } catch {
    // Storage unavailable: controls keep their values in memory.
  }
}

/** Set one value, keep it inside its limits, and save all values. */
export function setMercenaryOwner(
  key: keyof MercenaryOwner,
  value: number,
): void {
  if (!Number.isFinite(value)) return;
  owner[key] = bounded(key, value);
  save(key);
}

/** The shared values. Read them in markup or `$derived` to stay reactive. */
export const mercenaryOwner: Readonly<MercenaryOwner> = owner;

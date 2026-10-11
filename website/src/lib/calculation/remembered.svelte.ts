/*
 * Values that describe the reader's character, entered once and reused by
 * every calculation and calculator control on the site. They live in one
 * reactive record, so a change in one block updates every other block on the
 * page, and each value is saved under "calculation:<key>" in localStorage.
 *
 * Prerendered HTML shows each input's default. The browser loads the saved
 * values when a page mounts and follows changes made in other tabs. Each
 * reader of a value applies its own bounds, so a stored number is never
 * rewritten on read.
 */

const PREFIX = "calculation:";

const values = $state<Record<string, number>>({});
let following = false;

function parse(raw: string | null): number | undefined {
  const value = raw === null ? Number.NaN : Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

/** The saved value for a key, or undefined when the reader has not set one. */
export function rememberedValue(key: string): number | undefined {
  return values[key];
}

/** Save a value for every calculation that uses this key. */
export function remember(key: string, value: number): void {
  values[key] = value;
  try {
    localStorage.setItem(PREFIX + key, String(value));
  } catch {
    // Storage unavailable: the value still applies until the page closes.
  }
}

/** Remove a saved value, so calculations fall back to their defaults. */
export function forget(key: string): void {
  delete values[key];
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // Storage unavailable: nothing was saved.
  }
}

/** Load every saved value and follow changes other tabs make. */
export function loadRemembered(): void {
  try {
    const loaded: Record<string, number> = {};
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key?.startsWith(PREFIX)) continue;
      const value = parse(localStorage.getItem(key));
      if (value !== undefined) loaded[key.slice(PREFIX.length)] = value;
    }
    for (const key of Object.keys(values)) {
      if (!(key in loaded)) delete values[key];
    }
    Object.assign(values, loaded);
  } catch {
    // Storage unavailable: calculations keep their defaults.
  }
  if (following || typeof window === "undefined") return;
  following = true;
  window.addEventListener("storage", (event) => {
    if (!event.key?.startsWith(PREFIX)) return;
    const key = event.key.slice(PREFIX.length);
    const value = parse(event.newValue);
    if (value === undefined) delete values[key];
    else values[key] = value;
  });
}

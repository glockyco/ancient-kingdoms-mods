import type { LinearValue } from "$lib/types/skills";

/** Parse a JSON TEXT column into a LinearValue. Returns null for absent, invalid, or all-zero values. */
export function parseLinear(value: unknown): LinearValue | null {
  if (!value || typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value) as LinearValue;
    if (parsed.base_value === 0 && parsed.bonus_per_level === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

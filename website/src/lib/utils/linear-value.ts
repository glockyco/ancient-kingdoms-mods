import type { LinearValue } from "$lib/types/skills";

/**
 * Parse a LinearInt or LinearFloat column from the database. The column holds
 * JSON text such as `{"base_value": 120, "bonus_per_level": 20}`.
 * Throws when the value is absent or does not have that shape.
 */
export function requireLinearValue(raw: unknown, what: string): LinearValue {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      throw new Error(`${what} is not valid JSON`);
    }
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "base_value" in value &&
    "bonus_per_level" in value &&
    typeof value.base_value === "number" &&
    typeof value.bonus_per_level === "number"
  ) {
    return {
      base_value: value.base_value,
      bonus_per_level: value.bonus_per_level,
    };
  }
  throw new Error(`${what} is not a linear value`);
}

/** Source: server-scripts/LinearInt.cs:Get — value = base + bonus × (level − 1). */
export function linearAt(value: LinearValue, level: number): number {
  return value.base_value + value.bonus_per_level * (level - 1);
}

import { addF32, multiplyF32 } from "$lib/planner/engine-math";
import type { CalculationInput } from "$lib/types/calculation";
import type { LinearValue } from "$lib/types/skills";

/** "1,234" */
export const formatNumber = (value: number): string =>
  value.toLocaleString("en-US").replace(/^-/, "−");

/**
 * 0.125 → "12.5%". Two decimals, trailing zeros dropped. A nonzero value too
 * small for two decimals keeps two significant digits (0.0000123 → "0.0012%")
 * so a real chance never reads as 0%.
 */
export function formatPercent(value: number): string {
  const percent = value * 100;
  if (percent !== 0 && Math.abs(percent) < 0.005) {
    const digits = percent.toLocaleString("en-US", {
      maximumSignificantDigits: 2,
    });
    return `${digits.replace(/^-/, "−")}%`;
  }
  return `${String(Number(percent.toFixed(2))).replace(/^-/, "−")}%`;
}

/**
 * 2.4 → "2.4s", 90 → "1m 30s", 12000 → "3h 20m". Under a minute keeps two
 * decimals; from a minute up, the value rounds to whole seconds.
 */
export function formatSeconds(value: number): string {
  const sign = value < 0 ? "−" : "";
  const magnitude = Math.abs(value);
  const short = Number(magnitude.toFixed(2));
  if (short < 60) return `${sign}${short}s`;
  const total = Math.round(magnitude);
  const parts = [
    [Math.floor(total / 3600), "h"],
    [Math.floor((total % 3600) / 60), "m"],
    [total % 60, "s"],
  ] as const;
  return (
    sign +
    parts
      .filter(([amount]) => amount > 0)
      .map(([amount, unit]) => `${amount}${unit}`)
      .join(" ")
  );
}

// Source: server-scripts/LinearFloat.cs:10-13 — Get returns bonusPerLevel * (level - 1) + baseValue in float.
/** A skill value at a rank, with the game's single-precision arithmetic. */
export function atRank(value: LinearValue, rank: number): number {
  return addF32(multiplyF32(value.bonus_per_level, rank - 1), value.base_value);
}

/** "150% at rank 1, +12.5% per rank (200% at rank 5)", or the plain value when it does not scale. */
export function describeRankScaling(
  value: LinearValue,
  maxRank: number,
  format: (value: number) => string,
): string {
  if (value.bonus_per_level === 0 || maxRank <= 1) {
    return format(value.base_value);
  }
  const sign = value.bonus_per_level > 0 ? "+" : "−";
  return `${format(value.base_value)} at rank 1, ${sign}${format(Math.abs(value.bonus_per_level))} per rank (${format(atRank(value, maxRank))} at rank ${maxRank})`;
}

/** Whether a rank-scaled value changes between rank 1 and the maximum rank. */
export function scalesWithRank(value: LinearValue, maxRank: number): boolean {
  return value.bonus_per_level !== 0 && maxRank > 1;
}

/**
 * "Rank 1 gives 5%, and each rank adds 5%." for a sentence that already states
 * the highest rank's value, or "" when the value does not scale.
 */
export function describeRankGrowth(
  value: LinearValue,
  maxRank: number,
  format: (value: number) => string,
): string {
  if (!scalesWithRank(value, maxRank)) return "";
  const verb = value.bonus_per_level > 0 ? "adds" : "removes";
  return `Rank 1 gives ${format(value.base_value)}, and each rank ${verb} ${format(Math.abs(value.bonus_per_level))}.`;
}

/** "Damage: 20 + 20 × (3 − 1) = 60" for a value that changes with rank, or nothing when it does not. */
export function rankWorkingLines(
  name: string,
  value: LinearValue,
  rank: number,
  format: (value: number) => string,
): string[] {
  if (value.bonus_per_level === 0) return [];
  return [
    `${name}: ${format(value.base_value)} ${value.bonus_per_level > 0 ? "+" : "−"} ${format(Math.abs(value.bonus_per_level))} × (${rank} − 1) = ${format(atRank(value, rank))}`,
  ];
}

/**
 * How an example names an input value: "rank 3" for a value chosen from a
 * list, "200 Damage" for a quantity, and "the mercenary's 200 Damage" when the
 * value belongs to someone other than the reader.
 */
export function describeInput(input: CalculationInput, value: number): string {
  const noun = input.phrase ?? input.label;
  if (input.options) return `${noun} ${formatNumber(value)}`;
  const amount =
    input.unit === "%"
      ? formatPercent(value)
      : input.unit === "s"
        ? formatSeconds(value)
        : formatNumber(value);
  return `${input.owner ? `${input.owner}'s ` : ""}${amount} ${noun}`;
}

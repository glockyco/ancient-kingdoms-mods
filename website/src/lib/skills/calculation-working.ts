import {
  atRank,
  formatNumber,
  formatPercent,
  formatSeconds,
} from "$lib/calculation/format";
import type { LinearValue } from "$lib/types/skills";
import type { CalculationInput } from "$lib/types/calculation";

/** Only changing rank values need a substituted working line. */
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

const SITUATIONAL_LABELS: Record<string, string> = {
  bowDamage: "bow weapon damage",
  offhandDamage: "off-hand weapon damage",
  meleeDamage: "equipped melee weapon damage",
};

export function givenInput(input: CalculationInput, value: number): string {
  if (input.key === "rank") return `rank ${value}`;
  const mercenary = input.label.startsWith("Mercenary's ");
  const label =
    SITUATIONAL_LABELS[input.key] ??
    (mercenary ? input.label.slice("Mercenary's ".length) : input.label);
  const formatted =
    input.unit === "%"
      ? formatPercent(value)
      : input.unit === "s"
        ? formatSeconds(value)
        : formatNumber(value);
  return `${mercenary ? "the mercenary's " : ""}${formatted} ${label}`;
}

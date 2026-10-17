import { formatPercent } from "$lib/utils/format";
import type { LinearValue } from "$lib/types/skills";
import {
  formatLinearDuration as formatSkillLinearDuration,
  formatLinearPercent as formatSkillLinearPercent,
  formatLinearValueWithUnit,
} from "$lib/utils/formatSkillEffect";

// Source: server-scripts/ScrollItem.cs:UseAfterCast — exact half-ranks round to even, so odd ranks require mastery above the half-rank threshold.
export function formatMasteryNeeded(rank: number): string {
  const percentage = rank <= 1 ? 0 : rank * 5 - 2.5;
  return `${rank > 1 && rank % 2 !== 0 ? "above " : "at least "}${formatPercent(percentage / 100, { decimals: 1, trailingZeros: true })}`;
}

export function formatLinear(
  value: LinearValue | null,
  suffix: string = "",
): string {
  if (!value) return "-";
  return formatLinearValueWithUnit(value, suffix);
}

export function formatLinearAbs(
  value: LinearValue | null,
  suffix: string = "",
): string {
  if (!value) return "-";
  return formatLinear(
    {
      base_value: Math.abs(value.base_value),
      bonus_per_level: Math.abs(value.bonus_per_level),
    },
    suffix,
  );
}

export function formatLinearPercent(value: LinearValue | null): string {
  if (!value) return "-";
  return formatSkillLinearPercent(value, undefined);
}

export function formatLinearPercentAbs(value: LinearValue | null): string {
  if (!value) return "-";
  return formatLinearPercent({
    base_value: Math.abs(value.base_value),
    bonus_per_level: Math.abs(value.bonus_per_level),
  });
}

export function formatDuration(base: number, perLevel: number): string {
  if (base === 0 && perLevel === 0) return "-";
  return formatSkillLinearDuration(base, perLevel);
}

export function hasLinearValue(value: LinearValue | null): boolean {
  if (!value) return false;
  return value.base_value !== 0 || value.bonus_per_level !== 0;
}

export function isNegativeLinear(value: LinearValue | null): boolean {
  return !!value && value.base_value < 0;
}

export function convertTooltip(text: string | null): string {
  if (!text) return "";
  return text
    .replace(/<color=(#[0-9A-Fa-f]{6})>/g, '<span style="color:$1">')
    .replace(/<\/color>/g, "</span>")
    .replace(/<pos=[^>]*>/g, "    ")
    .replace(
      /<\/?(?:size|align|line-height|pos|voffset|space|indent)[^>]*>/g,
      "",
    )
    .replace(/\n/g, "<br>");
}

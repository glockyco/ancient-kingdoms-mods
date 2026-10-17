import {
  STATS,
  STAT_FIELDS,
  type StatField,
  type StatId,
  type StatSource,
} from "$lib/generated/stat-vocabulary";
import { formatNumber, formatPercent } from "$lib/utils/format";

/**
 * Where a stat is named. A character context uses the character window's name, and an item stat
 * list uses the item tooltip's name, as the formula-presentation spec requires.
 */
export type StatContext = "character" | "item";

const FIELDS = new Map(
  STAT_FIELDS.map((field) => [`${field.source}:${field.field}`, field]),
);

/** The catalogue mapping of an export field. Throws for a field the catalogue does not map. */
export function statField(source: StatSource, field: string): StatField {
  const mapped = FIELDS.get(`${source}:${field}`);
  if (!mapped) {
    throw new Error(
      `The stat catalogue does not map ${source} field "${field}"`,
    );
  }
  return mapped;
}

/** A stat's name in a context. A stat without an item label keeps its window name in item lists. */
export function statName(
  id: StatId,
  context: StatContext = "character",
): string {
  const stat = STATS[id];
  return context === "item" ? (stat.itemName ?? stat.name) : stat.name;
}

function poolName(field: StatField, context: StatContext): string {
  const pool = STATS[field.stat].pool;
  if (!pool) {
    throw new Error(
      `Stat "${field.stat}" has a percent of maximum field but no pool`,
    );
  }
  return statName(pool, context);
}

/**
 * The name of an export field, as a label beside its value. A modifier that is not a flat amount
 * names its kind after the stat, such as "Attack Power %" or "Health Regeneration, % of Hit
 * Points". A weapon's item damage takes the game's weapon name.
 */
export function statFieldName(
  field: StatField,
  context: StatContext = "character",
  { weapon = false }: { weapon?: boolean } = {},
): string {
  const stat = STATS[field.stat];
  const name =
    context === "item" && weapon && stat.weaponItemName
      ? stat.weaponItemName
      : statName(field.stat, context);
  switch (field.modifier) {
    case "percent":
      return `${name} %`;
    case "percent_of_max_per_second":
      return `${name}, % of ${poolName(field, context)}`;
    default:
      return name;
  }
}

/**
 * The name that follows a value in a value-first phrase, such as "+2% Attack Power" or "+2% of
 * maximum Hit Points per second". The value already shows its percent sign, so the name does not
 * repeat it.
 */
export function statFieldPhraseName(
  field: StatField,
  context: StatContext = "character",
): string {
  return field.modifier === "percent_of_max_per_second"
    ? `of maximum ${poolName(field, context)} per second`
    : statName(field.stat, context);
}

function signedText(value: number, text: string, signed: boolean): string {
  return signed && value > 0 ? `+${text}` : text;
}

/**
 * Format a stat value as the game displays it: a fraction as a percentage with at most two
 * decimals, a whole-number stat with thousands separators, and a rate with at most two decimals.
 * A bonus carries its sign and a total does not.
 */
export function formatStat(
  id: StatId,
  value: number,
  { signed = false }: { signed?: boolean } = {},
): string {
  // Source: server-scripts/UICharacterInfo.cs:Update — the window shows fractions times 100 with at most two decimals, and pools with thousands separators.
  const format = STATS[id].format;
  const text =
    format === "percent"
      ? formatPercent(value, { decimals: 2 })
      : formatNumber(value, { decimals: format === "decimal" ? 2 : 0 });
  return signedText(value, text, signed);
}

/** Format an export field's value. A percent modifier is a fraction, whatever its stat's format. */
export function formatStatField(
  field: StatField,
  value: number,
  { signed = false }: { signed?: boolean } = {},
): string {
  if (
    field.modifier === "percent" ||
    field.modifier === "percent_of_max_per_second"
  ) {
    return signedText(value, formatPercent(value, { decimals: 2 }), signed);
  }
  return formatStat(field.stat, value, { signed });
}

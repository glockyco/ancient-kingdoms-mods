import type { StatId } from "$lib/generated/stat-vocabulary";
import { ITEM_STAT_FIELDS } from "$lib/constants/items";

const ITEM_FIELDS_BY_STAT = Object.fromEntries(
  ITEM_STAT_FIELDS.map((field) => [field.stat, field.field]),
);

function itemFields(stats: readonly StatId[]): string[] {
  return stats.flatMap((stat) => {
    const field = ITEM_FIELDS_BY_STAT[stat];
    return field ? [field] : [];
  });
}

/**
 * Stat categories for filtering items by stats.
 * Groups stats into logical categories for the filter UI.
 */
export const STAT_CATEGORIES = {
  attributes: {
    label: "Attributes",
    stats: itemFields([
      "strength",
      "dexterity",
      "constitution",
      "intelligence",
      "wisdom",
      "charisma",
    ]),
  },
  combat: {
    label: "Combat & Movement",
    stats: itemFields([
      "attack_power",
      "spell_power",
      "critical_chance",
      "accuracy",
      "haste",
      "spell_haste",
      "movement_speed",
      "armor_class",
      "block_chance",
    ]),
  },
  resources: {
    label: "Resources",
    stats: itemFields(["health", "rage", "mana", "health_regen", "mana_regen"]),
  },
  resistances: {
    label: "Resistances",
    stats: itemFields([
      "fire_resist",
      "cold_resist",
      "poison_resist",
      "disease_resist",
      "magic_resist",
      "fear_resist",
      "critical_resist",
    ]),
  },
} as const;

export type StatCategory = keyof typeof STAT_CATEGORIES;
export type StatKey = (typeof STAT_CATEGORIES)[StatCategory]["stats"][number];

/** Flattened list of all filterable stats */
export const ALL_STAT_KEYS: readonly StatKey[] = Object.values(
  STAT_CATEGORIES,
).flatMap((cat) => cat.stats);

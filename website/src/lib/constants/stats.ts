/**
 * Stat categories for filtering items by stats.
 * Groups stats into logical categories for the filter UI.
 */
export const STAT_CATEGORIES = {
  attributes: {
    label: "Attributes",
    stats: [
      "strength",
      "dexterity",
      "constitution",
      "intelligence",
      "wisdom",
      "charisma",
    ],
  },
  combat: {
    label: "Combat & Movement",
    stats: [
      "damage",
      "magic_damage",
      "critical_chance",
      "accuracy",
      "haste",
      "spell_haste",
      "speed_bonus",
      "defense",
      "block_chance",
    ],
  },
  resources: {
    label: "Resources",
    stats: [
      "health_bonus",
      "energy_bonus",
      "mana_bonus",
      "hp_regen_bonus",
      "mana_regen_bonus",
    ],
  },
  resistances: {
    label: "Resistances",
    stats: [
      "fire_resist",
      "cold_resist",
      "poison_resist",
      "disease_resist",
      "magic_resist",
      "resist_fear_chance",
    ],
  },
} as const;

export type StatCategory = keyof typeof STAT_CATEGORIES;
export type StatKey = (typeof STAT_CATEGORIES)[StatCategory]["stats"][number];

/** Flattened list of all filterable stats */
export const ALL_STAT_KEYS: readonly StatKey[] = Object.values(
  STAT_CATEGORIES,
).flatMap((cat) => cat.stats);

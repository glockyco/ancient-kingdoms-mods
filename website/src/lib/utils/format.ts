/**
 * Format a decimal value as a percentage string (e.g., 0.5 -> "50.0%")
 */
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Format a duration in seconds to a human-readable string (e.g., "5m", "1h 30m")
 */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "-";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  }
  return `${minutes}m`;
}

/**
 * Maps internal item type identifiers to display names.
 */
const itemTypeDisplayNames: Record<string, string> = {
  ammo: "Ammo",
  augment: "Augment",
  backpack: "Backpack",
  book: "Book",
  chest: "Chest",
  equipment: "Equipment",
  food: "Food",
  fragment: "Fragment",
  general: "General",
  merge: "Merge",
  mount: "Mount",
  pack: "Pack",
  potion: "Potion",
  random: "Random",
  recipe: "Recipe",
  relic: "Relic",
  scroll: "Scroll",
  structure: "Structure",
  travel: "Travel",
  treasure_map: "Treasure Map",
  weapon: "Weapon",
};

/**
 * Converts an internal item type to a display-friendly name.
 * Throws an error for unknown types to ensure all types are mapped.
 */
export function formatItemType(type: string | null | undefined): string {
  if (!type) {
    throw new Error("Item type is null or undefined");
  }

  if (type in itemTypeDisplayNames) {
    return itemTypeDisplayNames[type];
  }

  throw new Error(
    `Unknown item type: "${type}". Add it to itemTypeDisplayNames.`,
  );
}

/**
 * Roman numerals for gathering resource tiers (0-4 maps to I-V)
 */
const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V"] as const;

/**
 * Converts a gathering resource tier (0-4) to a roman numeral (I-V).
 * Falls back to numeric string for values outside the expected range.
 */
export function toRomanNumeral(tier: number): string {
  if (tier >= 0 && tier < ROMAN_NUMERALS.length) {
    return ROMAN_NUMERALS[tier];
  }
  return String(tier);
}

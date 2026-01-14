import { QUALITY_IDS, type AltarRewardTier } from "$lib/constants/quality";
export type { AltarRewardTier };

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
 * Format spawn time window (e.g., "18:00-06:00")
 * Returns null if spawn time is not limited (0-0 or both same)
 */
export function formatSpawnTimeWindow(
  start: number,
  end: number,
): string | null {
  // 0-0 or both same means no restriction (24h spawn)
  if ((start === 0 && end === 0) || start === end) return null;
  const formatHour = (h: number) => `${h.toString().padStart(2, "0")}:00`;
  return `${formatHour(start)}-${formatHour(end)}`;
}

/**
 * Get CSS class for item quality color (uses custom CSS variables)
 * Use for backgrounds/badges
 */
export function getQualityColorClass(quality: number): string {
  const id = QUALITY_IDS[quality];
  if (id) {
    return `text-quality-${id}`;
  }
  return "text-quality-common";
}

/**
 * Get CSS class for item quality text color (brighter, for readability)
 * Use for text/links
 */
export function getQualityTextColorClass(quality: number): string {
  const id = QUALITY_IDS[quality];
  if (id) {
    return `text-quality-text-${id}`;
  }
  return "text-quality-text-common";
}

/**
 * Format gathering resource respawn time with type-specific logic:
 * - Radiant Sparks: Fixed "1m40s – 1h" range
 * - Minerals: Range from half respawn to full respawn
 * - Plants/Other: Single value
 *
 * @param type - Entity type (gathering_spark, gathering_mineral) or display name (Radiant Spark, Mineral)
 * @param respawnTime - Respawn time in seconds
 */
export function formatGatheringRespawn(
  type: string,
  respawnTime: number,
): string {
  if (type === "gathering_spark" || type === "Radiant Spark") {
    return "1m40s – 1h";
  }
  if ((type === "gathering_mineral" || type === "Mineral") && respawnTime > 0) {
    const min = formatDuration(Math.floor(respawnTime / 2));
    const max = formatDuration(respawnTime);
    return `${min} – ${max}`;
  }
  return formatDuration(respawnTime);
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

/**
 * Format altar reward tier as level + veteran requirement string.
 * Effective level = player level + (veteran points / 20)
 * Thresholds: <35 common, 35-44 magic, 45-54 epic, 55+ legendary
 */
export function formatAltarRewardTier(tier: AltarRewardTier): string {
  switch (tier) {
    case "common":
      return "Lv 30-34";
    case "magic":
      return "Lv 35-44";
    case "epic":
      return "Lv 45-50, Vet 0-99";
    case "legendary":
      return "Lv 50, Vet 100+";
  }
}

/**
 * Canonical item quality names.
 * Index corresponds to the numeric quality value (0-4).
 *
 * These names are derived from:
 * - Internal game code variable names (colorUncommonItem, colorMagicItem, etc.)
 * - Repair kit messages that reference "Magic quality", "Epic quality", etc.
 * - Altar reward item name prefixes (e.g., "Magic Gnome's Arcane Sphere")
 */
export const QUALITY_NAMES = [
  "Common",
  "Uncommon",
  "Magic",
  "Epic",
  "Legendary",
] as const;

export type QualityName = (typeof QUALITY_NAMES)[number];
export type QualityIndex = 0 | 1 | 2 | 3 | 4;

/**
 * Lowercase quality identifiers for CSS classes.
 */
export const QUALITY_IDS = [
  "common",
  "uncommon",
  "magic",
  "epic",
  "legendary",
] as const;

export type QualityId = (typeof QUALITY_IDS)[number];

/**
 * Get quality name by index, with fallback to "Common".
 */
export function getQualityName(quality: number): QualityName {
  return QUALITY_NAMES[quality] ?? "Common";
}

/**
 * Get quality CSS identifier by index, with fallback to "common".
 */
export function getQualityId(quality: number): QualityId {
  return QUALITY_IDS[quality] ?? "common";
}

/**
 * Altar reward tier identifiers (lowercase).
 * These correspond to quality names and are used in data/database.
 * Note: Altars only reward Common, Magic, Epic, Legendary (no Uncommon tier).
 */
export const ALTAR_REWARD_TIERS = [
  "common",
  "magic",
  "epic",
  "legendary",
] as const;

export type AltarRewardTier = (typeof ALTAR_REWARD_TIERS)[number];

/**
 * Get display name for altar reward tier.
 */
export function getAltarTierDisplayName(tier: AltarRewardTier): string {
  switch (tier) {
    case "common":
      return "Common";
    case "magic":
      return "Magic";
    case "epic":
      return "Epic";
    case "legendary":
      return "Legendary";
  }
}

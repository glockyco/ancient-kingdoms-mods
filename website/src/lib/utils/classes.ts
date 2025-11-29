/**
 * Player class configuration for display throughout the site.
 */

export interface ClassConfig {
  /** Short abbreviation (3 chars) */
  abbrev: string;
  /** Background color for pills */
  color: string;
  /** Full display name */
  name: string;
}

/**
 * Configuration for each player class.
 * Keys are lowercase class IDs as stored in the database.
 */
export const CLASS_CONFIG: Record<string, ClassConfig> = {
  warrior: { abbrev: "WAR", color: "#702a21", name: "Warrior" },
  ranger: { abbrev: "RNG", color: "#7a3a16", name: "Ranger" },
  cleric: { abbrev: "CLR", color: "#b8993a", name: "Cleric" },
  rogue: { abbrev: "ROG", color: "#74498c", name: "Rogue" },
  wizard: { abbrev: "WIZ", color: "#2a5073", name: "Wizard" },
  druid: { abbrev: "DRU", color: "#4a8f58", name: "Druid" },
};

/** Default config for unknown classes */
export const DEFAULT_CLASS_CONFIG: ClassConfig = {
  abbrev: "???",
  color: "#6b6b6b",
  name: "Unknown",
};

/**
 * Get class configuration by ID.
 */
export function getClassConfig(classId: string): ClassConfig {
  return CLASS_CONFIG[classId.toLowerCase()] ?? DEFAULT_CLASS_CONFIG;
}

/**
 * All class IDs in display order.
 */
export const ALL_CLASS_IDS = [
  "warrior",
  "ranger",
  "cleric",
  "rogue",
  "wizard",
  "druid",
] as const;

/**
 * Format class name for display (capitalizes first letter).
 */
export function formatClassName(classId: string): string {
  const config = CLASS_CONFIG[classId.toLowerCase()];
  return config?.name ?? classId.charAt(0).toUpperCase() + classId.slice(1);
}

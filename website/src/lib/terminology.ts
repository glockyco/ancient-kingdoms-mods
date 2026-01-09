/**
 * Maps internal stat/field names to user-facing game terminology.
 *
 * These mappings come from the game's tooltip generation code in EquipmentItem.cs
 * where stats are displayed with <color=#A8B3B7> tags.
 */

/**
 * Maps internal stat field names (from items.stats JSON) to their display names
 * as they appear in the game's item tooltips.
 */
export const STAT_DISPLAY_NAMES: Record<string, string> = {
  // Core resources
  health_bonus: "Hit Points",
  energy_bonus: "Rage Points",
  mana_bonus: "Mana",

  // Regeneration
  hp_regen_bonus: "Health Regen",
  mana_regen_bonus: "Mana Regen",

  // Combat stats
  defense: "AC",
  damage: "Damage",
  magic_damage: "Spell Power",
  accuracy: "Accuracy",
  haste: "Haste",
  spell_haste: "Spell Haste",
  speed_bonus: "Movement Speed",
  critical_chance: "Critical Chance",
  block_chance: "Block Chance",

  // Resistances
  fire_resist: "Fire Resist",
  cold_resist: "Cold Resist",
  poison_resist: "Poison Resist",
  disease_resist: "Disease Resist",
  magic_resist: "Magic Resist",
  resist_fear_chance: "Fear Resist",

  // Attributes
  strength: "Strength",
  dexterity: "Dexterity",
  constitution: "Constitution",
  intelligence: "Intelligence",
  wisdom: "Wisdom",
  charisma: "Charisma",
};

/**
 * Maps internal resource names to their game terminology.
 * Used for consumable items and other contexts.
 */
export const RESOURCE_DISPLAY_NAMES: Record<string, string> = {
  health: "Hit Points",
  energy: "Rage",
  mana: "Mana",
};

/**
 * Formats an internal stat name to its game display name.
 * Falls back to title-casing if no mapping exists.
 */
export function formatStatName(stat: string): string {
  return (
    STAT_DISPLAY_NAMES[stat] ||
    stat
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}

/**
 * Formats an internal resource name to its game display name.
 * Falls back to title-casing if no mapping exists.
 */
export function formatResourceName(resource: string): string {
  return (
    RESOURCE_DISPLAY_NAMES[resource] ||
    resource.charAt(0).toUpperCase() + resource.slice(1)
  );
}

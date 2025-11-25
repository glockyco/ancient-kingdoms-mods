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

  throw new Error(`Unknown item type: "${type}". Add it to itemTypeDisplayNames.`);
}

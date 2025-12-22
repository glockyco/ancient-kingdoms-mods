import type { MapEntityData, AnyMapEntity } from "$lib/types/map";

/**
 * Stable empty array - use this instead of [] to avoid creating new references
 */
export const EMPTY_SELECTION: AnyMapEntity[] = [];

/**
 * Compute the entities to highlight for a given selection.
 * This should be called via $derived so it's cached and only recomputed when selection changes.
 *
 * @param data - All map entity data
 * @param entityType - The type/category of selected entity (e.g., "monster", "npc", "boss")
 * @param entityId - The ID of the selected entity
 * @returns Array of entities to highlight (all spawns with matching ID)
 */
export function computeSelectionData(
  data: MapEntityData | null,
  entityType: string | null,
  entityId: string | null,
): AnyMapEntity[] {
  if (!data || !entityType || !entityId) {
    return EMPTY_SELECTION;
  }

  const entities = getEntitiesForType(data, entityType);
  if (entities === EMPTY_SELECTION) {
    return EMPTY_SELECTION;
  }

  const matches = entities.filter((e) => e.id === entityId);
  return matches.length > 0 ? matches : EMPTY_SELECTION;
}

/**
 * Get the entity array for a given type/category.
 */
function getEntitiesForType(
  data: MapEntityData,
  entityType: string,
): AnyMapEntity[] {
  switch (entityType) {
    // Search categories
    case "monster":
      return data.monsters;
    case "npc":
      return data.npcs;
    case "resource":
      return data.gathering;
    case "chest":
      return data.chests;
    case "altar":
      return data.altars;
    case "portal":
      return data.portals;
    // Entity types (when clicking directly on map)
    case "boss":
    case "elite":
      return data.monsters;
    case "gathering_plant":
    case "gathering_mineral":
    case "gathering_spark":
      return data.gathering;
    case "alchemy_table":
    case "crafting_station":
      return data.crafting;
    default:
      return EMPTY_SELECTION;
  }
}

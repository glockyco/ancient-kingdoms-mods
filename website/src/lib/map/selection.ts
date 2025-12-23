import type {
  MapEntityData,
  AnyMapEntity,
  MonsterMapEntity,
} from "$lib/types/map";

/**
 * Stable empty array - use this instead of [] to avoid creating new references
 */
export const EMPTY_SELECTION: AnyMapEntity[] = [];

/**
 * Pre-computed patrol path data for rendering
 */
export interface PatrolPathData {
  /** Segments connecting patrol waypoints (closed loop) */
  segments: Array<{ source: [number, number]; target: [number, number] }>;
  /** All patrol waypoints */
  waypoints: [number, number][];
  /** Segments from spawn position to first waypoint */
  spawnConnections: Array<{
    source: [number, number];
    target: [number, number];
  }>;
}

/**
 * Stable empty patrol path data
 */
export const EMPTY_PATROL_DATA: PatrolPathData = {
  segments: [],
  waypoints: [],
  spawnConnections: [],
};

/**
 * Pre-indexed entity data for O(1) selection lookup.
 * Maps entity ID to array of entities with that ID (for multi-spawn highlighting).
 */
export interface EntityIndex {
  monsters: Map<string, AnyMapEntity[]>;
  npcs: Map<string, AnyMapEntity[]>;
  portals: Map<string, AnyMapEntity[]>;
  chests: Map<string, AnyMapEntity[]>;
  altars: Map<string, AnyMapEntity[]>;
  gathering: Map<string, AnyMapEntity[]>;
  crafting: Map<string, AnyMapEntity[]>;
}

/**
 * Build entity index for O(1) selection lookup.
 * Call once when data is loaded.
 */
export function createEntityIndex(data: MapEntityData): EntityIndex {
  function indexEntities(
    entities: AnyMapEntity[],
  ): Map<string, AnyMapEntity[]> {
    const index = new Map<string, AnyMapEntity[]>();
    for (const entity of entities) {
      const existing = index.get(entity.id);
      if (existing) {
        existing.push(entity);
      } else {
        index.set(entity.id, [entity]);
      }
    }
    return index;
  }

  return {
    monsters: indexEntities(data.monsters),
    npcs: indexEntities(data.npcs),
    portals: indexEntities(data.portals),
    chests: indexEntities(data.chests),
    altars: indexEntities(data.altars),
    gathering: indexEntities(data.gathering),
    crafting: indexEntities(data.crafting),
  };
}

/**
 * Compute the entities to highlight for a given selection.
 * Uses pre-built index for O(1) lookup instead of filtering.
 *
 * @param index - Pre-built entity index (use createEntityIndex)
 * @param entityType - The type/category of selected entity (e.g., "monster", "npc", "boss")
 * @param entityId - The ID of the selected entity
 * @returns Array of entities to highlight (all spawns with matching ID)
 */
export function computeSelectionData(
  index: EntityIndex | null,
  entityType: string | null,
  entityId: string | null,
): AnyMapEntity[] {
  if (!index || !entityType || !entityId) {
    return EMPTY_SELECTION;
  }

  const entityIndex = getIndexForType(index, entityType);
  if (!entityIndex) {
    return EMPTY_SELECTION;
  }

  return entityIndex.get(entityId) ?? EMPTY_SELECTION;
}

/**
 * Compute patrol path data from selection.
 * Call via $derived so it's cached and only recomputed when selection changes.
 */
export function computePatrolPathData(
  selectionData: AnyMapEntity[],
): PatrolPathData {
  if (selectionData === EMPTY_SELECTION || selectionData.length === 0) {
    return EMPTY_PATROL_DATA;
  }

  // Filter to monsters with patrol waypoints
  const patrollingMonsters = selectionData.filter(
    (e): e is MonsterMapEntity =>
      (e.type === "monster" || e.type === "boss" || e.type === "elite") &&
      (e as MonsterMapEntity).isPatrolling &&
      (e as MonsterMapEntity).patrolWaypoints !== null &&
      (e as MonsterMapEntity).patrolWaypoints!.length > 1,
  );

  if (patrollingMonsters.length === 0) {
    return EMPTY_PATROL_DATA;
  }

  // Build line segments for all patrol paths (closed loops)
  const segments: PatrolPathData["segments"] = [];
  const waypoints: [number, number][] = [];
  const spawnConnections: PatrolPathData["spawnConnections"] = [];

  for (const monster of patrollingMonsters) {
    const wp = monster.patrolWaypoints!;

    // Add spawn-to-first-waypoint connection
    spawnConnections.push({
      source: monster.position,
      target: wp[0],
    });

    // Add segments connecting waypoints in order
    for (let i = 0; i < wp.length; i++) {
      const next = (i + 1) % wp.length; // Loop back to first
      segments.push({
        source: wp[i],
        target: wp[next],
      });
      waypoints.push(wp[i]);
    }
  }

  return { segments, waypoints, spawnConnections };
}

/**
 * Get the entity index for a given type/category.
 */
function getIndexForType(
  index: EntityIndex,
  entityType: string,
): Map<string, AnyMapEntity[]> | null {
  switch (entityType) {
    // Search categories
    case "monster":
      return index.monsters;
    case "npc":
      return index.npcs;
    case "resource":
      return index.gathering;
    case "chest":
      return index.chests;
    case "altar":
      return index.altars;
    case "portal":
      return index.portals;
    // Entity types (when clicking directly on map)
    case "boss":
    case "elite":
      return index.monsters;
    case "gathering_plant":
    case "gathering_mineral":
    case "gathering_spark":
      return index.gathering;
    case "alchemy_table":
    case "crafting_station":
      return index.crafting;
    default:
      return null;
  }
}

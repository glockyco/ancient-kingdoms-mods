import type {
  MapEntityData,
  AnyMapEntity,
  MonsterMapEntity,
  NpcMapEntity,
  PortalMapEntity,
} from "$lib/types/map";
import type { OverrideGroup, HighlightCategory } from "./resolve-selection";

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
 * Pre-computed relation arc data for rendering (summon spawn → blockers)
 */
export interface RelationArcData {
  /** Arcs from selected summon spawn(s) to blocker spawn(s) */
  arcs: Array<{ source: [number, number]; target: [number, number] }>;
  /** Unique endpoint positions (for rendering small dots) */
  endpoints: Array<[number, number]>;
}

/**
 * Stable empty relation arc data
 */
export const EMPTY_RELATION_ARCS: RelationArcData = {
  arcs: [],
  endpoints: [],
};

/**
 * Pre-indexed entity data for O(1) selection lookup.
 * For monsters: indexed by monsterId (groups all spawns of same monster)
 * For others: indexed by entity id
 */
export interface EntityIndex {
  /** Monsters indexed by monsterId (for selection highlighting) */
  monsters: Map<string, MonsterMapEntity[]>;
  /** Monsters indexed by spawn ID (for blocker lookup) */
  monstersBySpawnId: Map<string, MonsterMapEntity>;
  npcs: Map<string, AnyMapEntity[]>;
  portals: Map<string, AnyMapEntity[]>;
  /** Portals indexed by "sourceZoneId:destZoneId" for Renewal Sage linking */
  portalsByZoneAndDest: Map<string, PortalMapEntity[]>;
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

  // Index monsters by monsterId (groups all spawns of same monster)
  function indexMonstersByMonsterId(
    monsters: MonsterMapEntity[],
  ): Map<string, MonsterMapEntity[]> {
    const index = new Map<string, MonsterMapEntity[]>();
    for (const monster of monsters) {
      const key = monster.monsterId;
      const existing = index.get(key);
      if (existing) {
        existing.push(monster);
      } else {
        index.set(key, [monster]);
      }
    }
    return index;
  }

  // Index monsters by spawn ID (for blocker lookup)
  function indexMonstersBySpawnId(
    monsters: MonsterMapEntity[],
  ): Map<string, MonsterMapEntity> {
    const index = new Map<string, MonsterMapEntity>();
    for (const monster of monsters) {
      index.set(monster.id, monster);
    }
    return index;
  }

  // Index portals by "sourceZoneId:destZoneId" for Renewal Sage linking
  function indexPortalsByZoneAndDest(
    portals: PortalMapEntity[],
  ): Map<string, PortalMapEntity[]> {
    const index = new Map<string, PortalMapEntity[]>();
    for (const portal of portals) {
      if (!portal.zoneId || !portal.destinationZoneId || !portal.position) {
        continue;
      }
      const key = `${portal.zoneId}:${portal.destinationZoneId}`;
      const existing = index.get(key);
      if (existing) {
        existing.push(portal);
      } else {
        index.set(key, [portal]);
      }
    }
    return index;
  }

  return {
    monsters: indexMonstersByMonsterId(data.monsters),
    monstersBySpawnId: indexMonstersBySpawnId(data.monsters),
    npcs: indexEntities(data.npcs),
    portals: indexEntities(data.portals),
    portalsByZoneAndDest: indexPortalsByZoneAndDest(
      data.portals as PortalMapEntity[],
    ),
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

  const entities = entityIndex.get(entityId);
  if (!entities) {
    return EMPTY_SELECTION;
  }

  // Filter out entities without positions (can't highlight on map)
  const renderable = entities.filter((e) => e.position !== null);
  return renderable.length > 0 ? renderable : EMPTY_SELECTION;
}

/**
 * Compute the entities to highlight for multiple override groups.
 * Used for virtual entities (items, quests) that may map to multiple
 * categories of physical entities (monsters, NPCs, resources, chests).
 *
 * @param index - Pre-built entity index (use createEntityIndex)
 * @param overrideGroups - Array of { ids, category } groups to highlight
 * @returns Array of entities to highlight (all matching entities from all groups)
 */
export function computeSelectionFromGroups(
  index: EntityIndex | null,
  overrideGroups: OverrideGroup[] | null,
): AnyMapEntity[] {
  if (!index || !overrideGroups || overrideGroups.length === 0) {
    return EMPTY_SELECTION;
  }

  const results: AnyMapEntity[] = [];

  for (const group of overrideGroups) {
    const entityIndex = getIndexForCategory(index, group.category);
    if (!entityIndex) continue;

    for (const id of group.ids) {
      const entities = entityIndex.get(id);
      if (entities) {
        // Filter out entities without positions
        for (const entity of entities) {
          if (entity.position !== null) {
            results.push(entity);
          }
        }
      }
    }
  }

  return results.length > 0 ? results : EMPTY_SELECTION;
}

/**
 * Get the entity index map for a specific highlight category.
 */
function getIndexForCategory(
  index: EntityIndex,
  category: HighlightCategory,
): Map<string, AnyMapEntity[]> | null {
  switch (category) {
    case "monster":
      return index.monsters;
    case "npc":
      return index.npcs;
    case "portal":
      return index.portals;
    case "chest":
      return index.chests;
    case "altar":
      return index.altars;
    case "resource":
      return index.gathering;
    case "crafting":
      return index.crafting;
    default:
      return null;
  }
}

/**
 * Entity types that can have patrol paths
 */
type PatrollingEntity = MonsterMapEntity | NpcMapEntity;

/**
 * Type guard for entities with patrol capability
 */
function isPatrollingEntity(e: AnyMapEntity): e is PatrollingEntity {
  return (
    e.type === "monster" ||
    e.type === "boss" ||
    e.type === "elite" ||
    e.type === "hunt" ||
    e.type === "npc"
  );
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

  // Filter to entities with patrol waypoints (monsters and NPCs)
  const patrollingEntities = selectionData.filter(
    (e): e is PatrollingEntity =>
      isPatrollingEntity(e) &&
      (e as PatrollingEntity).isPatrolling &&
      (e as PatrollingEntity).patrolWaypoints !== null &&
      (e as PatrollingEntity).patrolWaypoints!.length > 1,
  );

  if (patrollingEntities.length === 0) {
    return EMPTY_PATROL_DATA;
  }

  // Build line segments for all patrol paths (closed loops)
  const segments: PatrolPathData["segments"] = [];
  const waypoints: [number, number][] = [];
  const spawnConnections: PatrolPathData["spawnConnections"] = [];

  for (const entity of patrollingEntities) {
    if (!entity.position) continue;
    const wp = entity.patrolWaypoints!;

    // Add spawn-to-first-waypoint connection
    spawnConnections.push({
      source: entity.position,
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
 * Compute related entities for arc rendering.
 * - For summon spawns: returns the blocker spawns that prevent respawning
 * - For placeholder spawns: returns the source monster spawns
 * - For portals with kill requirements: returns the spawns of the monster that must be killed
 * - For Renewal Sage NPCs: returns portals in the same zone leading to their dungeon
 * Uses pre-built index for O(1) lookup.
 * Call via $derived so it's cached and only recomputed when selection changes.
 */
export function computeRelatedEntities(
  selectionData: AnyMapEntity[],
  index: EntityIndex | null,
): AnyMapEntity[] {
  if (
    !index ||
    selectionData === EMPTY_SELECTION ||
    selectionData.length === 0
  ) {
    return EMPTY_SELECTION;
  }

  const selected = selectionData[0];

  // Check if the selected entity is a portal with kill requirements
  if (selected.type === "portal") {
    const portal = selected as PortalMapEntity;
    if (
      portal.isClosed ||
      !portal.killRequirementSpawnIds ||
      portal.killRequirementSpawnIds.length === 0
    ) {
      return EMPTY_SELECTION;
    }

    const relatedMonsters: MonsterMapEntity[] = [];
    for (const spawnId of portal.killRequirementSpawnIds) {
      const monster = index.monstersBySpawnId.get(spawnId);
      if (monster && monster.position !== null) {
        relatedMonsters.push(monster);
      }
    }

    return relatedMonsters.length > 0 ? relatedMonsters : EMPTY_SELECTION;
  }

  // Check if the selected entity is a Renewal Sage NPC with a dungeon zone
  if (selected.type === "npc") {
    const npc = selected as NpcMapEntity;
    // Only link if they have a renewal dungeon zone (excludes World Boss sages)
    if (!npc.renewalDungeonZoneId || !npc.zoneId) {
      return EMPTY_SELECTION;
    }

    // Find portals in the same zone that lead to the dungeon
    const key = `${npc.zoneId}:${npc.renewalDungeonZoneId}`;
    const portals = index.portalsByZoneAndDest.get(key);

    return portals && portals.length > 0 ? portals : EMPTY_SELECTION;
  }

  // Check if the selected entity is a monster
  const selectedMonster = selected as MonsterMapEntity;

  // Check if the selected entity is a placeholder spawn with source spawn IDs
  if (
    selectedMonster.spawnType === "placeholder" &&
    selectedMonster.sourceSpawnIds &&
    selectedMonster.sourceSpawnIds.length > 0
  ) {
    const sources: MonsterMapEntity[] = [];
    for (const spawnId of selectedMonster.sourceSpawnIds) {
      const monster = index.monstersBySpawnId.get(spawnId);
      if (monster && monster.position !== null) {
        sources.push(monster);
      }
    }
    return sources.length > 0 ? sources : EMPTY_SELECTION;
  }

  // Check if the selected entity is a summon spawn with blocker spawn IDs
  if (
    selectedMonster.spawnType !== "summon" ||
    !selectedMonster.blockerSpawnIds ||
    selectedMonster.blockerSpawnIds.length === 0
  ) {
    return EMPTY_SELECTION;
  }

  // Look up each blocker spawn by its specific ID
  const blockers: MonsterMapEntity[] = [];
  for (const spawnId of selectedMonster.blockerSpawnIds) {
    const monster = index.monstersBySpawnId.get(spawnId);
    if (monster && monster.position !== null) {
      blockers.push(monster);
    }
  }

  return blockers.length > 0 ? blockers : EMPTY_SELECTION;
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
    case "crafting":
      return index.crafting;
    // Entity types (when clicking directly on map)
    case "boss":
    case "elite":
    case "hunt":
      return index.monsters;
    case "gathering_plant":
    case "gathering_mineral":
    case "gathering_spark":
    case "gathering_other":
      return index.gathering;
    case "alchemy_table":
    case "crafting_station":
      return index.crafting;
    default:
      return null;
  }
}

/**
 * Compute relation arcs from selected summon spawns to their blocker spawns.
 * Call via $derived so it's cached and only recomputed when selection changes.
 */
export function computeRelationArcs(
  selectionData: AnyMapEntity[],
  relatedEntities: AnyMapEntity[],
): RelationArcData {
  if (
    selectionData === EMPTY_SELECTION ||
    selectionData.length === 0 ||
    relatedEntities === EMPTY_SELECTION ||
    relatedEntities.length === 0
  ) {
    return EMPTY_RELATION_ARCS;
  }

  const arcs: RelationArcData["arcs"] = [];
  const endpointSet = new Set<string>();
  const endpoints: RelationArcData["endpoints"] = [];

  // Create arcs from each selected summon spawn to each blocker spawn
  for (const selected of selectionData) {
    if (!selected.position) continue;

    for (const related of relatedEntities) {
      if (!related.position) continue;

      arcs.push({
        source: selected.position,
        target: related.position,
      });

      // Collect unique endpoints
      const key = `${related.position[0]},${related.position[1]}`;
      if (!endpointSet.has(key)) {
        endpointSet.add(key);
        endpoints.push(related.position);
      }
    }
  }

  return arcs.length > 0 ? { arcs, endpoints } : EMPTY_RELATION_ARCS;
}

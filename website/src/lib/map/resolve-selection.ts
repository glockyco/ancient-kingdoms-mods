/**
 * Unified Selection Resolution System
 *
 * Centralizes all selection logic in one place. All entry points (click, search,
 * URL restoration, popup links) use these functions to determine:
 * - What popup to show
 * - What entities to highlight on the map
 */

import type {
  MapEntityData,
  AnyMapEntity,
  ParentZoneBoundary,
  GatheringMapEntity,
} from "$lib/types/map";
import { query } from "$lib/db";
import type { EntityId } from "$lib/entities/registry";
import { resolveMapEntityType } from "./selection";
import { loadBrowserAcquisition, itemMapLocations } from "./acquisition";
import type { LocationRef } from "$lib/acquisition/types";

// ============================================================================
// Types
// ============================================================================

/** Physical entity popup - entity object available */
interface EntityPopup {
  type: "entity";
  entity: AnyMapEntity;
}

/** Zone popup */
interface ZonePopup {
  type: "zone";
  zone: ParentZoneBoundary;
}

/** Virtual entity popup - no map position, load data by ID */
interface VirtualPopup {
  type: "item" | "quest" | "monster";
  id: string;
}

/** Highlightable categories (physical entities that can be highlighted on map) */
export type HighlightCategory =
  | "monster"
  | "npc"
  | "altar"
  | "portal"
  | "chest"
  | "treasure"
  | "house"
  | "resource"
  | "crafting";

/** Override group for virtual entity highlighting */
export interface OverrideGroup {
  ids: string[];
  category: HighlightCategory;
  exactPlacement?: boolean;
}

/** What to highlight on the map */
interface SelectionHighlight {
  /** ID for EntityIndex lookup (via computeSelectionData) */
  entityId: string;
  /** Type/category for EntityIndex lookup */
  entityType: string;
  /** Override groups for virtual entities (multiple categories of entities to highlight) */
  overrideGroups?: OverrideGroup[];
}

/** Result of selection resolution */
export interface ResolvedSelection {
  /** What popup to show */
  popup: EntityPopup | ZonePopup | VirtualPopup | null;
  /** Requested physical identity, independent of template/group popup data. */
  selectionId?: string;
  /** What to highlight on the map */
  highlight: SelectionHighlight | null;
}

// ============================================================================
// Main Resolution Functions
// ============================================================================

/**
 * Resolve selection for physical entities (synchronous).
 * Returns what popup to show and what to highlight.
 */
export function resolvePhysicalSelection(
  category: string,
  id: string,
  entityData: MapEntityData,
): ResolvedSelection {
  const entityType = resolveMapEntityType(category);
  const resolver = entityType
    ? PHYSICAL_SELECTION_BY_ENTITY[entityType]
    : undefined;
  const resolved: ResolvedSelection = resolver
    ? resolver(id, entityData)
    : { popup: null, highlight: null };
  if (resolved.popup?.type === "entity") resolved.selectionId = id;
  return resolved;
}

/**
 * Resolve selection for virtual entities (async - needs DB query).
 * Returns what popup to show and what physical entities to highlight.
 */
export async function resolveVirtualSelection(
  category: "item" | "quest",
  id: string,
): Promise<ResolvedSelection> {
  if (category === "item") {
    const model = await loadBrowserAcquisition({
      kind: "items",
      itemIds: [id],
    });
    const categories: Partial<Record<LocationRef["kind"], HighlightCategory>> =
      {
        monster_spawns: "monster",
        npcs: "npc",
        resource_spawns: "resource",
        chests: "chest",
        altars: "altar",
        treasure_locations: "treasure",
        crafting_stations: "crafting",
        alchemy_tables: "crafting",
        scribing_tables: "crafting",
        portals: "portal",
      };
    const groups = new Map<HighlightCategory, Set<string>>();
    for (const location of itemMapLocations(model, id)) {
      const category = categories[location.provider.kind];
      if (!category) continue;
      const ids = groups.get(category) ?? new Set<string>();
      if (category === "monster" && location.approximate) {
        for (const methodId of location.methodIds) {
          const method = model.methodViews.get(methodId);
          ids.add(
            method?.kind === "kill" &&
              method.detail.event_kind === "placeholder"
              ? methodId
              : location.provider.id,
          );
        }
      } else {
        ids.add(location.provider.id);
      }
      groups.set(category, ids);
    }
    const overrideGroups: OverrideGroup[] = [...groups].map(
      ([category, ids]) => ({
        category,
        ids: [...ids],
        exactPlacement: category === "monster" || category === "resource",
      }),
    );

    return {
      popup: { type: "item", id },
      highlight:
        overrideGroups.length > 0
          ? { entityId: id, entityType: "item", overrideGroups }
          : null,
    };
  }

  if (category === "quest") {
    const npcIds = await queryQuestNpcs(id);
    return {
      popup: { type: "quest", id },
      highlight:
        npcIds.length > 0
          ? {
              entityId: id,
              entityType: "quest",
              overrideGroups: [{ ids: npcIds, category: "npc" }],
            }
          : null,
    };
  }

  return { popup: null, highlight: null };
}

// ============================================================================
// Category-Specific Resolution Functions
// ============================================================================

/**
 * Resolve monster selection.
 * Monsters without map positions (altar-only, excluded zones) still show
 * EntityPopup but highlight related altars if available.
 */
function resolveMonsterSelection(
  monsterId: string,
  entityData: MapEntityData,
): ResolvedSelection {
  const exactSpawn = entityData.monsters.find((m) => m.id === monsterId);
  const monster =
    exactSpawn ?? entityData.monsters.find((m) => m.monsterId === monsterId);

  if (!monster) {
    return { popup: null, highlight: null };
  }

  // Check if monster has a map position
  const hasPosition = monster.position !== null;

  if (hasPosition) {
    // Placement links highlight one spawn. Template links highlight the group.
    return {
      popup: { type: "entity", entity: monster },
      highlight: exactSpawn
        ? {
            entityId: monsterId,
            entityType: "monster",
            overrideGroups: [
              { ids: [monsterId], category: "monster", exactPlacement: true },
            ],
          }
        : { entityId: monsterId, entityType: "monster" },
    };
  }

  // Monster has no position - check if it spawns in an altar (pre-computed in entity data)
  if (monster.altarIds && monster.altarIds.length > 0) {
    // Show monster popup, highlight the altar(s) where it spawns
    return {
      popup: { type: "entity", entity: monster },
      highlight: {
        entityId: monsterId,
        entityType: "monster",
        overrideGroups: [{ ids: monster.altarIds, category: "altar" }],
      },
    };
  }

  // Monster has no position and no altar - just show popup, no highlight
  // (e.g., Temple of Valaark monsters)
  return {
    popup: { type: "entity", entity: monster },
    highlight: null,
  };
}

/**
 * Resolve NPC selection.
 */
function resolveNpcSelection(
  npcId: string,
  entityData: MapEntityData,
): ResolvedSelection {
  const npc = entityData.npcs.find(
    (n) => n.id === npcId && n.position !== null,
  );

  if (npc) {
    return {
      popup: { type: "entity", entity: npc },
      highlight: { entityId: npcId, entityType: "npc" },
    };
  }

  return { popup: null, highlight: null };
}

/**
 * Resolve zone selection.
 */
function resolveZoneSelection(
  zoneId: string,
  entityData: MapEntityData,
): ResolvedSelection {
  const zone = entityData.parentZones.find((z) => z.zoneId === zoneId);

  if (zone) {
    return {
      popup: { type: "zone", zone },
      highlight: null, // Zones don't highlight entities
    };
  }

  return { popup: null, highlight: null };
}

/**
 * Resolve altar selection.
 */
function resolveAltarSelection(
  altarId: string,
  entityData: MapEntityData,
): ResolvedSelection {
  const altar = entityData.altars.find(
    (a) => a.id === altarId && a.position !== null,
  );

  if (altar) {
    return {
      popup: { type: "entity", entity: altar },
      highlight: { entityId: altarId, entityType: "altar" },
    };
  }

  return { popup: null, highlight: null };
}

function resolveTrapSelection(
  trapId: string,
  entityData: MapEntityData,
): ResolvedSelection {
  const trap = entityData.traps.find(
    (t) => t.id === trapId && t.position !== null,
  );

  if (trap) {
    return {
      popup: { type: "entity", entity: trap },
      highlight: { entityId: trapId, entityType: "trap" },
    };
  }

  return { popup: null, highlight: null };
}

/**
 * Resolve portal selection.
 */
function resolvePortalSelection(
  portalId: string,
  entityData: MapEntityData,
): ResolvedSelection {
  const portal = entityData.portals.find(
    (p) => p.id === portalId && p.position !== null,
  );

  if (portal) {
    return {
      popup: { type: "entity", entity: portal },
      highlight: { entityId: portalId, entityType: "portal" },
    };
  }

  return { popup: null, highlight: null };
}

/**
 * Resolve chest selection.
 * Chests without map positions (excluded zones) still show popup but no highlight.
 */
function resolveChestSelection(
  chestId: string,
  entityData: MapEntityData,
): ResolvedSelection {
  // Find ANY chest with this id (may have position or not)
  const chest = entityData.chests.find((c) => c.id === chestId);

  if (!chest) {
    return { popup: null, highlight: null };
  }

  // Check if chest has a map position
  const hasPosition = chest.position !== null;

  if (hasPosition) {
    return {
      popup: { type: "entity", entity: chest },
      highlight: { entityId: chestId, entityType: "chest" },
    };
  }

  // Chest has no position (excluded zone) - just show popup, no highlight
  return {
    popup: { type: "entity", entity: chest },
    highlight: null,
  };
}

/**
 * Resolve house selection.
 */
function resolveHouseSelection(
  houseId: string,
  entityData: MapEntityData,
): ResolvedSelection {
  const house = entityData.houses.find((h) => h.id === houseId);

  if (!house) {
    return { popup: null, highlight: null };
  }

  if (house.position !== null) {
    return {
      popup: { type: "entity", entity: house },
      highlight: { entityId: houseId, entityType: "house" },
    };
  }

  return {
    popup: { type: "entity", entity: house },
    highlight: null,
  };
}

/**
 * Resolve treasure dig location selection.
 */
function resolveTreasureSelection(
  treasureId: string,
  entityData: MapEntityData,
): ResolvedSelection {
  const treasure = entityData.treasure.find(
    (t) => t.id === treasureId && t.position !== null,
  );

  if (treasure) {
    return {
      popup: { type: "entity", entity: treasure },
      highlight: { entityId: treasureId, entityType: "treasure" },
    };
  }

  return { popup: null, highlight: null };
}

/**
 * Resolve gathering resource selection.
 */
function resolveGatheringSelection(
  resourceId: string,
  entityData: MapEntityData,
): ResolvedSelection {
  const exactResource = entityData.gathering.find(
    (g) => g.id === resourceId,
  ) as GatheringMapEntity | undefined;
  const candidates = entityData.gathering.filter(
    (g) => g.selectionGroupId === resourceId || g.resourceId === resourceId,
  );
  const resource =
    exactResource ??
    candidates.find((g) => g.position !== null) ??
    candidates[0];

  if (!resource) {
    return { popup: null, highlight: null };
  }

  return {
    popup: { type: "entity", entity: resource },
    highlight:
      resource.position !== null
        ? exactResource
          ? {
              entityId: resourceId,
              entityType: "resource",
              overrideGroups: [
                {
                  ids: [resourceId],
                  category: "resource",
                  exactPlacement: true,
                },
              ],
            }
          : { entityId: resourceId, entityType: "resource" }
        : null,
  };
}

/**
 * Resolve crafting station selection.
 */
function resolveCraftingSelection(
  craftingId: string,
  entityData: MapEntityData,
): ResolvedSelection {
  const station = entityData.crafting.find(
    (c) => c.id === craftingId && c.position !== null,
  );

  if (station) {
    return {
      popup: { type: "entity", entity: station },
      highlight: { entityId: craftingId, entityType: "crafting" },
    };
  }

  return { popup: null, highlight: null };
}

/** Physical popup/highlight handlers keyed by entity-registry family. */
type PhysicalSelectionResolver = (
  id: string,
  entityData: MapEntityData,
) => ResolvedSelection;

const PHYSICAL_SELECTION_BY_ENTITY: Partial<
  Record<EntityId, PhysicalSelectionResolver>
> = {
  monster: resolveMonsterSelection,
  npc: resolveNpcSelection,
  zone: resolveZoneSelection,
  altar: resolveAltarSelection,
  trap: resolveTrapSelection,
  portal: resolvePortalSelection,
  chest: resolveChestSelection,
  treasure: resolveTreasureSelection,
  house: resolveHouseSelection,
  gathering_resource: resolveGatheringSelection,
  crafting_station: resolveCraftingSelection,
  alchemy_table: resolveCraftingSelection,
  scribing_table: resolveCraftingSelection,
};

// ============================================================================
// Database Query Helpers (for virtual entities)
// ============================================================================

async function queryQuestNpcs(questId: string): Promise<string[]> {
  const rows = await query<{ npc_id: string }>(
    `SELECT DISTINCT m.npc_id FROM npc_quest_memberships m
     JOIN npc_spawns ns ON ns.npc_id=m.npc_id
     WHERE m.quest_id=? AND ns.position_x IS NOT NULL AND ns.position_y IS NOT NULL
     ORDER BY m.npc_id`,
    [questId],
  );
  return rows.map((row) => row.npc_id);
}

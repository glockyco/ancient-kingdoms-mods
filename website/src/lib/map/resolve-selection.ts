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
} from "$lib/types/map";
import { query } from "$lib/db";

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
  | "resource"
  | "crafting";

/** What to highlight on the map */
interface SelectionHighlight {
  /** ID for EntityIndex lookup (via computeSelectionData) */
  entityId: string;
  /** Type/category for EntityIndex lookup */
  entityType: string;
  /** Override IDs for virtual entities (bypasses normal index lookup) */
  overrideIds?: string[];
  /** Override category for virtual entities */
  overrideCategory?: HighlightCategory;
}

/** Result of selection resolution */
export interface ResolvedSelection {
  /** What popup to show */
  popup: EntityPopup | ZonePopup | VirtualPopup | null;
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
  switch (category) {
    case "monster":
    case "boss":
    case "elite":
    case "hunt":
      return resolveMonsterSelection(id, entityData);
    case "npc":
      return resolveNpcSelection(id, entityData);
    case "zone":
      return resolveZoneSelection(id, entityData);
    case "altar":
      return resolveAltarSelection(id, entityData);
    case "portal":
      return resolvePortalSelection(id, entityData);
    case "chest":
      return resolveChestSelection(id, entityData);
    case "resource":
    case "gathering_plant":
    case "gathering_mineral":
    case "gathering_spark":
    case "gathering_other":
      return resolveGatheringSelection(id, entityData);
    case "crafting":
    case "alchemy_table":
    case "crafting_station":
      return resolveCraftingSelection(id, entityData);
    default:
      return { popup: null, highlight: null };
  }
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
    const dropperIds = await queryItemDroppers(id);
    return {
      popup: { type: "item", id },
      highlight:
        dropperIds.length > 0
          ? {
              entityId: id,
              entityType: "item",
              overrideIds: dropperIds,
              overrideCategory: "monster",
            }
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
              overrideIds: npcIds,
              overrideCategory: "npc",
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
  // Find ANY monster with this monsterId (may have position or not)
  const monster = entityData.monsters.find((m) => m.monsterId === monsterId);

  if (!monster) {
    return { popup: null, highlight: null };
  }

  // Check if monster has a map position
  const hasPosition = monster.position !== null;

  if (hasPosition) {
    // Physical entity - has map position, highlight all spawns
    return {
      popup: { type: "entity", entity: monster },
      highlight: { entityId: monsterId, entityType: "monster" },
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
        overrideIds: monster.altarIds,
        overrideCategory: "altar",
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
 */
function resolveChestSelection(
  chestId: string,
  entityData: MapEntityData,
): ResolvedSelection {
  const chest = entityData.chests.find(
    (c) => c.id === chestId && c.position !== null,
  );

  if (chest) {
    return {
      popup: { type: "entity", entity: chest },
      highlight: { entityId: chestId, entityType: "chest" },
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
  const resource = entityData.gathering.find(
    (g) => g.id === resourceId && g.position !== null,
  );

  if (resource) {
    return {
      popup: { type: "entity", entity: resource },
      highlight: { entityId: resourceId, entityType: "resource" },
    };
  }

  return { popup: null, highlight: null };
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

// ============================================================================
// Database Query Helpers (for virtual entities)
// ============================================================================

interface DropperRow {
  monster_id: string;
}

/**
 * Query monster IDs that drop a specific item.
 */
async function queryItemDroppers(itemId: string): Promise<string[]> {
  const rows = await query<DropperRow>(
    `
    SELECT DISTINCT m.id as monster_id
    FROM monsters m, json_each(m.drops) d
    WHERE json_extract(d.value, '$.item_id') = ?
  `,
    [itemId],
  );

  return rows.map((r) => r.monster_id);
}

interface QuestNpcRow {
  npc_id: string;
}

/**
 * Query NPC IDs associated with a specific quest (givers and turn-ins).
 * Quest-NPC relationships are stored as JSON in npcs.quests_offered and npcs.quests_completed_here.
 */
async function queryQuestNpcs(questId: string): Promise<string[]> {
  const rows = await query<QuestNpcRow>(
    `
    SELECT DISTINCT n.id as npc_id
    FROM npcs n
    WHERE EXISTS (
      SELECT 1 FROM json_each(n.quests_offered) q
      WHERE json_extract(q.value, '$.id') = ?
    )
    OR EXISTS (
      SELECT 1 FROM json_each(n.quests_completed_here) q
      WHERE json_extract(q.value, '$.id') = ?
    )
  `,
    [questId, questId],
  );

  return rows.map((r) => r.npc_id);
}

import { browser } from "$app/environment";
import { pushState, replaceState } from "$app/navigation";
import { base } from "$app/paths";
import type { LayerVisibility, LevelFilter, LevelRanges } from "$lib/types/map";
import { INITIAL_VIEW_STATE } from "./config";

/**
 * Get normalized URL search string.
 * Fixes HTML entity encoding from forum posts where & becomes &amp;
 * (e.g., Steam discussion forums HTML-encode URLs, breaking query params).
 * Also cleans up the browser URL bar to prevent propagating the issue when re-sharing.
 */
export function getNormalizedSearch(): string {
  let search = window.location.search;
  if (search.includes("&amp;")) {
    search = search.replaceAll("&amp;", "&");
    // Clean up browser URL bar so re-sharing works correctly
    const cleanUrl = window.location.pathname + search + window.location.hash;
    window.history.replaceState(null, "", cleanUrl);
  }
  return search;
}

/**
 * Fallback level filter values (used before data is loaded)
 */
const FALLBACK_LEVEL_FILTER: LevelFilter = {
  monsterMin: 1,
  monsterMax: 100,
  gatheringMin: 0,
  gatheringMax: 10,
};

/**
 * Map URL state for shareable links
 */
export interface MapUrlState {
  x: number;
  y: number;
  zoom: number;
  layers?: (keyof LayerVisibility)[];
  levelFilter?: LevelFilter;
  /** Selected entity ID for highlighting/deep linking */
  entity?: string;
  /** Selected entity type (monster, npc, gathering, etc.) */
  etype?: string;
  /** Focused zone ID for filtering content */
  zone?: string;
  /** Selected zone ID for popup display */
  selectedZone?: string;
}

/**
 * Default layers that are enabled when no URL parameter is present
 * Minimal view: bosses, elites, altars, and terrain only
 */
const DEFAULT_LAYERS: (keyof LayerVisibility)[] = [
  "bosses",
  "elites",
  "altars",
  "tiles",
  "npcRenewalSages",
];

/**
 * Get default LayerVisibility state
 * Minimal view: bosses, elites, altars, and terrain only
 */
export function getDefaultLayerVisibility(): LayerVisibility {
  return {
    // Monsters
    bosses: true,
    fabled: true,
    elites: true,
    creatures: false,
    hunts: false,
    // NPCs
    npcVendors: false,
    npcQuestGivers: false,
    npcRepair: false,
    npcBanks: false,
    npcInnkeepers: false,
    npcSoulBinders: false,
    npcSkillTrainers: false,
    npcVeteranTrainers: false,
    npcAttributeReset: false,
    npcFactionVendors: false,
    npcEssenceTraders: false,
    npcAugmenters: false,
    npcPriestesses: false,
    npcRenewalSages: true,
    npcAdventurerTasks: false,
    npcAdventurerVendors: false,
    npcMercenaryRecruiters: false,
    npcGuards: false,
    npcTeleporters: false,
    npcVillagers: false,
    // Interactables
    portals: false,
    portalArcs: false,
    chests: false,
    treasure: false,
    altars: true,
    alchemyTables: false,
    forges: false,
    cookingOvens: false,
    // Resources
    gatheringPlants: false,
    gatheringMinerals: false,
    gatheringSparks: false,
    gatheringOther: false,
    // Zones
    subZones: false,
    parentZones: false,
    tiles: true,
  };
}

/**
 * Build a URL for navigating to a specific entity on the map.
 * Used for generating href attributes on entity links.
 */
export function buildEntityUrl(
  entityId: string,
  entityType: string,
  position?: { x: number; y: number },
): string {
  const params = new URLSearchParams();
  params.set("entity", entityId);
  params.set("etype", entityType);
  if (position) {
    params.set("x", position.x.toFixed(1));
    params.set("y", position.y.toFixed(1));
  }
  return `${base}/map?${params.toString()}`;
}

/**
 * Parse URL parameters to restore map state
 */
export function parseUrlState(): MapUrlState | null {
  if (!browser) return null;

  const params = new URLSearchParams(getNormalizedSearch());

  // Only return state if at least one relevant map param is present
  const hasPositionParams =
    params.has("x") || params.has("y") || params.has("z");
  const hasEntityParams = params.has("entity") && params.has("etype");
  const hasOtherParams =
    params.has("layers") || params.has("zone") || params.has("szone");

  if (!hasPositionParams && !hasEntityParams && !hasOtherParams) {
    return null;
  }

  const state: MapUrlState = {
    x: params.has("x")
      ? parseFloat(params.get("x")!)
      : INITIAL_VIEW_STATE.target[0],
    y: params.has("y")
      ? parseFloat(params.get("y")!)
      : INITIAL_VIEW_STATE.target[1],
    zoom: params.has("z")
      ? parseFloat(params.get("z")!)
      : INITIAL_VIEW_STATE.zoom,
  };

  if (params.has("layers")) {
    state.layers = params
      .get("layers")!
      .split(",") as (keyof LayerVisibility)[];
  }

  // Parse level filter (only if any filter param is present)
  if (params.has("mlvl") || params.has("gtier")) {
    const mlvl = params.get("mlvl")?.split("-").map(Number) ?? [
      FALLBACK_LEVEL_FILTER.monsterMin,
      FALLBACK_LEVEL_FILTER.monsterMax,
    ];
    const gtier = params.get("gtier")?.split("-").map(Number) ?? [
      FALLBACK_LEVEL_FILTER.gatheringMin,
      FALLBACK_LEVEL_FILTER.gatheringMax,
    ];
    state.levelFilter = {
      monsterMin: mlvl[0],
      monsterMax: mlvl[1],
      gatheringMin: gtier[0],
      gatheringMax: gtier[1],
    };
  }

  // Parse entity selection for deep linking
  if (params.has("entity") && params.has("etype")) {
    state.entity = params.get("entity")!;
    state.etype = params.get("etype")!;
  }

  // Parse zone focus
  if (params.has("zone")) {
    state.zone = params.get("zone")!;
  }

  // Parse selected zone for popup
  if (params.has("szone")) {
    state.selectedZone = params.get("szone")!;
  }

  return state;
}

/**
 * Convert URL state to LayerVisibility object
 */
export function urlStateToLayerVisibility(
  urlLayers: (keyof LayerVisibility)[] | undefined,
): LayerVisibility {
  // If no layers specified in URL, use defaults
  if (!urlLayers) {
    return getDefaultLayerVisibility();
  }

  // Otherwise, only enable layers specified in URL
  return {
    // Monsters
    bosses: urlLayers.includes("bosses"),
    fabled: urlLayers.includes("fabled"),
    elites: urlLayers.includes("elites"),
    creatures: urlLayers.includes("creatures"),
    hunts: urlLayers.includes("hunts"),
    // NPCs
    npcVendors: urlLayers.includes("npcVendors"),
    npcQuestGivers: urlLayers.includes("npcQuestGivers"),
    npcRepair: urlLayers.includes("npcRepair"),
    npcBanks: urlLayers.includes("npcBanks"),
    npcInnkeepers: urlLayers.includes("npcInnkeepers"),
    npcSoulBinders: urlLayers.includes("npcSoulBinders"),
    npcSkillTrainers: urlLayers.includes("npcSkillTrainers"),
    npcVeteranTrainers: urlLayers.includes("npcVeteranTrainers"),
    npcAttributeReset: urlLayers.includes("npcAttributeReset"),
    npcFactionVendors: urlLayers.includes("npcFactionVendors"),
    npcEssenceTraders: urlLayers.includes("npcEssenceTraders"),
    npcAugmenters: urlLayers.includes("npcAugmenters"),
    npcPriestesses: urlLayers.includes("npcPriestesses"),
    npcRenewalSages: urlLayers.includes("npcRenewalSages"),
    npcAdventurerTasks: urlLayers.includes("npcAdventurerTasks"),
    npcAdventurerVendors: urlLayers.includes("npcAdventurerVendors"),
    npcMercenaryRecruiters: urlLayers.includes("npcMercenaryRecruiters"),
    npcGuards: urlLayers.includes("npcGuards"),
    npcTeleporters: urlLayers.includes("npcTeleporters"),
    npcVillagers: urlLayers.includes("npcVillagers"),
    // Interactables
    portals: urlLayers.includes("portals"),
    portalArcs: urlLayers.includes("portalArcs"),
    chests: urlLayers.includes("chests"),
    treasure: urlLayers.includes("treasure"),
    altars: urlLayers.includes("altars"),
    alchemyTables: urlLayers.includes("alchemyTables"),
    forges: urlLayers.includes("forges"),
    cookingOvens: urlLayers.includes("cookingOvens"),
    // Resources
    gatheringPlants: urlLayers.includes("gatheringPlants"),
    gatheringMinerals: urlLayers.includes("gatheringMinerals"),
    gatheringSparks: urlLayers.includes("gatheringSparks"),
    gatheringOther: urlLayers.includes("gatheringOther"),
    // Zones
    subZones: urlLayers.includes("subZones"),
    parentZones: urlLayers.includes("parentZones"),
    tiles: urlLayers.includes("tiles"),
  };
}

/**
 * Get default level filter values from data ranges or fallback
 */
export function getDefaultLevelFilter(ranges?: LevelRanges): LevelFilter {
  if (ranges) {
    return {
      monsterMin: ranges.monsterMin,
      monsterMax: ranges.monsterMax,
      gatheringMin: ranges.gatheringMin,
      gatheringMax: ranges.gatheringMax,
    };
  }
  return { ...FALLBACK_LEVEL_FILTER };
}

// ============================================================================
// URL Manager - Centralized URL state management
// ============================================================================

/**
 * Selection state for deduplication and history tracking.
 */
interface SelectionState {
  entityId: string | null;
  entityType: string | null;
  zoneId: string | null;
}

/**
 * All state needed to build a URL.
 */
export interface UrlStateParams {
  viewState: { x: number; y: number; zoom: number };
  layers: LayerVisibility;
  levelFilter: LevelFilter;
  levelRanges?: LevelRanges;
  entityId: string | null;
  entityType: string | null;
  focusedZoneId: string | null;
  selectedZoneId: string | null;
}

// Internal state for the URL manager
let lastSelection: SelectionState = {
  entityId: null,
  entityType: null,
  zoneId: null,
};
let isPassiveMode = false;
let viewSyncTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Build URL from state parameters.
 */
function buildUrl(params: UrlStateParams): string {
  const urlParams = new URLSearchParams();

  // Position (rounded for cleaner URLs)
  urlParams.set("x", params.viewState.x.toFixed(1));
  urlParams.set("y", params.viewState.y.toFixed(1));
  urlParams.set("z", params.viewState.zoom.toFixed(2));

  // Active layers (only include if different from default)
  const activeLayers = (
    Object.keys(params.layers) as (keyof LayerVisibility)[]
  ).filter((k) => params.layers[k]);
  const sortedActive = [...activeLayers].sort();
  const sortedDefault = [...DEFAULT_LAYERS].sort();
  if (JSON.stringify(sortedActive) !== JSON.stringify(sortedDefault)) {
    urlParams.set("layers", activeLayers.join(","));
  }

  // Level filters (only include if different from defaults)
  const defaultFilter = params.levelRanges ?? FALLBACK_LEVEL_FILTER;
  if (
    params.levelFilter.monsterMin !== defaultFilter.monsterMin ||
    params.levelFilter.monsterMax !== defaultFilter.monsterMax
  ) {
    urlParams.set(
      "mlvl",
      `${params.levelFilter.monsterMin}-${params.levelFilter.monsterMax}`,
    );
  }
  if (
    params.levelFilter.gatheringMin !== defaultFilter.gatheringMin ||
    params.levelFilter.gatheringMax !== defaultFilter.gatheringMax
  ) {
    urlParams.set(
      "gtier",
      `${params.levelFilter.gatheringMin}-${params.levelFilter.gatheringMax}`,
    );
  }

  // Entity selection
  if (params.entityId && params.entityType) {
    urlParams.set("entity", params.entityId);
    urlParams.set("etype", params.entityType);
  }

  // Zone focus
  if (params.focusedZoneId) {
    urlParams.set("zone", params.focusedZoneId);
  }

  // Selected zone popup
  if (params.selectedZoneId) {
    urlParams.set("szone", params.selectedZoneId);
  }

  return `${base}/map?${urlParams.toString()}`;
}

/**
 * Cancel any pending view sync timer.
 */
function cancelViewSync(): void {
  if (viewSyncTimer) {
    clearTimeout(viewSyncTimer);
    viewSyncTimer = null;
  }
}

/**
 * URL Manager - centralized, explicit URL state management.
 *
 * Instead of using reactive effects that race each other, call these methods
 * explicitly from action handlers. This provides predictable timing and
 * clear cause-and-effect relationships.
 */
export const urlManager = {
  /**
   * Enter passive mode during popstate restoration.
   * While in passive mode, all URL updates are suppressed.
   */
  enterPassiveMode(): void {
    isPassiveMode = true;
    cancelViewSync();
  },

  /**
   * Exit passive mode after popstate restoration is complete.
   */
  exitPassiveMode(): void {
    isPassiveMode = false;
  },

  /**
   * Update the last known selection state.
   * Call this after restoring from URL to sync internal tracking.
   */
  setLastSelection(
    entityId: string | null,
    entityType: string | null,
    zoneId: string | null,
  ): void {
    lastSelection = { entityId, entityType, zoneId };
  },

  /**
   * Get the last known selection state (for debugging/testing).
   */
  getLastSelection(): SelectionState {
    return { ...lastSelection };
  },

  /**
   * Debounced URL sync for continuous changes (pan/zoom).
   * Uses replaceState - does NOT add to browser history.
   */
  syncViewState(params: UrlStateParams, delay = 150): void {
    if (!browser || isPassiveMode) return;

    cancelViewSync();
    viewSyncTimer = setTimeout(() => {
      const url = buildUrl(params);
      // eslint-disable-next-line svelte/no-navigation-without-resolve -- static route
      replaceState(url, {});
      viewSyncTimer = null;
    }, delay);
  },

  /**
   * Immediate URL sync for preference changes (layers, filters, zone focus).
   * Uses replaceState - does NOT add to browser history.
   */
  syncPreferences(params: UrlStateParams): void {
    if (!browser || isPassiveMode) return;

    cancelViewSync();
    const url = buildUrl(params);
    // eslint-disable-next-line svelte/no-navigation-without-resolve -- static route
    replaceState(url, {});
  },

  /**
   * Push selection change to browser history.
   * Handles both opening a selection AND closing (null values).
   * Deduplicates: skips if selection matches the last pushed state.
   */
  pushSelection(params: UrlStateParams): void {
    if (!browser || isPassiveMode) return;

    const { entityId, entityType, selectedZoneId: zoneId } = params;

    // Deduplicate: skip if same as last pushed selection
    if (
      entityId === lastSelection.entityId &&
      entityType === lastSelection.entityType &&
      zoneId === lastSelection.zoneId
    ) {
      return;
    }

    cancelViewSync();
    const url = buildUrl(params);
    // eslint-disable-next-line svelte/no-navigation-without-resolve -- static route
    pushState(url, {});

    // Update tracking
    lastSelection = { entityId, entityType, zoneId };
  },
};

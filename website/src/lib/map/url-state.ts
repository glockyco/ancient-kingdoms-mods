import { browser } from "$app/environment";
import { replaceState } from "$app/navigation";
import { base } from "$app/paths";
import type { LayerVisibility, LevelFilter, LevelRanges } from "$lib/types/map";
import { INITIAL_VIEW_STATE } from "./config";

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
}

/**
 * Default layers that are enabled when no URL parameter is present
 * Note: zones and areas are off by default
 */
const DEFAULT_LAYERS: (keyof LayerVisibility)[] = [
  // Monsters
  "bosses",
  "elites",
  "creatures",
  "hunts",
  // NPCs (all enabled by default)
  "npcVendors",
  "npcQuestGivers",
  "npcRepair",
  "npcBanks",
  "npcInnkeepers",
  "npcSoulBinders",
  "npcSkillTrainers",
  "npcVeteranTrainers",
  "npcAttributeReset",
  "npcFactionVendors",
  "npcEssenceTraders",
  "npcAugmenters",
  "npcPriestesses",
  "npcRenewalSages",
  "npcAdventurerTasks",
  "npcAdventurerVendors",
  "npcMercenaryRecruiters",
  "npcGuards",
  // Interactables
  "portals",
  "portalArcs",
  "chests",
  "altars",
  "alchemyTables",
  "forges",
  "cookingOvens",
  // Resources
  "gatheringPlants",
  "gatheringMinerals",
  "gatheringSparks",
];

/**
 * Get default LayerVisibility state (all enabled except zones and areas)
 */
export function getDefaultLayerVisibility(): LayerVisibility {
  return {
    // Monsters
    bosses: true,
    elites: true,
    creatures: true,
    hunts: true,
    // NPCs (all enabled by default)
    npcVendors: true,
    npcQuestGivers: true,
    npcRepair: true,
    npcBanks: true,
    npcInnkeepers: true,
    npcSoulBinders: true,
    npcSkillTrainers: true,
    npcVeteranTrainers: true,
    npcAttributeReset: true,
    npcFactionVendors: true,
    npcEssenceTraders: true,
    npcAugmenters: true,
    npcPriestesses: true,
    npcRenewalSages: true,
    npcAdventurerTasks: true,
    npcAdventurerVendors: true,
    npcMercenaryRecruiters: true,
    npcGuards: true,
    // Interactables
    portals: true,
    portalArcs: true,
    chests: true,
    altars: true,
    alchemyTables: true,
    forges: true,
    cookingOvens: true,
    // Resources
    gatheringPlants: true,
    gatheringMinerals: true,
    gatheringSparks: true,
    // Zones
    subZones: false,
    parentZones: false,
  };
}

/**
 * Parse URL parameters to restore map state
 */
export function parseUrlState(): MapUrlState | null {
  if (!browser) return null;

  const params = new URLSearchParams(window.location.search);

  // Only return state if at least one map param is present
  if (!params.has("x") && !params.has("y") && !params.has("z")) {
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

  return state;
}

/**
 * Update URL with current map state (without page reload)
 */
export function updateUrlState(
  viewState: { x: number; y: number; zoom: number },
  layers: LayerVisibility,
  levelFilter: LevelFilter,
  levelRanges?: LevelRanges,
  selectedEntityId?: string | null,
  selectedEntityType?: string | null,
): void {
  if (!browser) return;

  const params = new URLSearchParams();

  // Position (rounded to 1 decimal for cleaner URLs)
  params.set("x", viewState.x.toFixed(1));
  params.set("y", viewState.y.toFixed(1));
  params.set("z", viewState.zoom.toFixed(2));

  // Active layers (only include if different from default)
  const activeLayers = (
    Object.keys(layers) as (keyof LayerVisibility)[]
  ).filter((k) => layers[k]);
  const sortedActive = [...activeLayers].sort();
  const sortedDefault = [...DEFAULT_LAYERS].sort();

  if (JSON.stringify(sortedActive) !== JSON.stringify(sortedDefault)) {
    params.set("layers", activeLayers.join(","));
  }

  // Level filters (only include if different from data-derived defaults)
  const defaultFilter = levelRanges ?? FALLBACK_LEVEL_FILTER;
  if (
    levelFilter.monsterMin !== defaultFilter.monsterMin ||
    levelFilter.monsterMax !== defaultFilter.monsterMax
  ) {
    params.set("mlvl", `${levelFilter.monsterMin}-${levelFilter.monsterMax}`);
  }
  if (
    levelFilter.gatheringMin !== defaultFilter.gatheringMin ||
    levelFilter.gatheringMax !== defaultFilter.gatheringMax
  ) {
    params.set(
      "gtier",
      `${levelFilter.gatheringMin}-${levelFilter.gatheringMax}`,
    );
  }

  // Entity selection for deep linking
  if (selectedEntityId && selectedEntityType) {
    params.set("entity", selectedEntityId);
    params.set("etype", selectedEntityType);
  }

  const url = `${base}/map?${params.toString()}`;
  // eslint-disable-next-line svelte/no-navigation-without-resolve -- static route, no params to resolve
  replaceState(url, {});
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
    // Interactables
    portals: urlLayers.includes("portals"),
    portalArcs: urlLayers.includes("portalArcs"),
    chests: urlLayers.includes("chests"),
    altars: urlLayers.includes("altars"),
    alchemyTables: urlLayers.includes("alchemyTables"),
    forges: urlLayers.includes("forges"),
    cookingOvens: urlLayers.includes("cookingOvens"),
    // Resources
    gatheringPlants: urlLayers.includes("gatheringPlants"),
    gatheringMinerals: urlLayers.includes("gatheringMinerals"),
    gatheringSparks: urlLayers.includes("gatheringSparks"),
    // Zones
    subZones: urlLayers.includes("subZones"),
    parentZones: urlLayers.includes("parentZones"),
  };
}

// Debounce timer for URL updates
let urlUpdateTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Debounced URL update to avoid excessive history entries during pan/zoom
 */
export function debouncedUpdateUrlState(
  viewState: { x: number; y: number; zoom: number },
  layers: LayerVisibility,
  levelFilter: LevelFilter,
  levelRanges?: LevelRanges,
  selectedEntityId?: string | null,
  selectedEntityType?: string | null,
  delay = 500,
): void {
  if (urlUpdateTimer) {
    clearTimeout(urlUpdateTimer);
  }

  urlUpdateTimer = setTimeout(() => {
    updateUrlState(
      viewState,
      layers,
      levelFilter,
      levelRanges,
      selectedEntityId,
      selectedEntityType,
    );
    urlUpdateTimer = null;
  }, delay);
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

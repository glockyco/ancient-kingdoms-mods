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
 * Note: subZones and parentZones are off by default
 */
const DEFAULT_LAYERS: (keyof LayerVisibility)[] = [
  "monsters",
  "bosses",
  "elites",
  "npcs",
  "portals",
  "chests",
  "altars",
  "gatheringPlants",
  "gatheringMinerals",
  "gatheringSparks",
  "crafting",
];

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
  // If no layers specified in URL, use defaults (all enabled except zones and arcs)
  if (!urlLayers) {
    return {
      monsters: true,
      bosses: true,
      elites: true,
      npcs: true,
      portals: true,
      portalArcs: false,
      chests: true,
      altars: true,
      gatheringPlants: true,
      gatheringMinerals: true,
      gatheringSparks: true,
      crafting: true,
      subZones: false,
      parentZones: false,
    };
  }

  // Otherwise, only enable layers specified in URL
  return {
    monsters: urlLayers.includes("monsters"),
    bosses: urlLayers.includes("bosses"),
    elites: urlLayers.includes("elites"),
    npcs: urlLayers.includes("npcs"),
    portals: urlLayers.includes("portals"),
    portalArcs: urlLayers.includes("portalArcs"),
    chests: urlLayers.includes("chests"),
    altars: urlLayers.includes("altars"),
    gatheringPlants: urlLayers.includes("gatheringPlants"),
    gatheringMinerals: urlLayers.includes("gatheringMinerals"),
    gatheringSparks: urlLayers.includes("gatheringSparks"),
    crafting: urlLayers.includes("crafting"),
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

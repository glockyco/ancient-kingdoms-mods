import { FLY_TO_CONFIG, INITIAL_VIEW_STATE } from "./config";

export interface FlyToOptions {
  duration?: number; // ms, default 1000
  zoom?: number; // target zoom level (optional, maintains current if not specified)
}

/**
 * Animate the map view to a target position.
 * Uses deck.gl's built-in transition system.
 */
export function flyTo(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deckInstance: any,
  targetX: number,
  targetY: number,
  currentZoom: number,
  options: FlyToOptions = {},
): void {
  if (!deckInstance) return;

  const { duration = FLY_TO_CONFIG.duration, zoom } = options;

  deckInstance.setProps({
    initialViewState: {
      target: [targetX, targetY, 0],
      zoom: zoom ?? currentZoom,
      minZoom: INITIAL_VIEW_STATE.minZoom,
      maxZoom: INITIAL_VIEW_STATE.maxZoom,
      transitionDuration: duration,
      transitionEasing: (t: number) => t * (2 - t), // ease-out quadratic
    },
  });
}

/**
 * Reset the map view to the initial/default position.
 */
export function resetView(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deckInstance: any,
  options: { duration?: number } = {},
): void {
  if (!deckInstance) return;

  const { duration = FLY_TO_CONFIG.duration } = options;

  deckInstance.setProps({
    initialViewState: {
      ...INITIAL_VIEW_STATE,
      transitionDuration: duration,
      transitionEasing: (t: number) => t * (2 - t),
    },
  });
}

/**
 * Fly to an entity position from search results.
 * Returns true if successful, false if position is null.
 */
export function flyToPosition(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deckInstance: any,
  position: [number, number] | null,
  currentZoom: number,
  options: FlyToOptions = {},
): boolean {
  if (!position) return false;
  flyTo(deckInstance, position[0], position[1], currentZoom, {
    zoom: options.zoom ?? FLY_TO_CONFIG.maxZoom,
    duration: options.duration ?? FLY_TO_CONFIG.duration,
  });
  return true;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Create bounds from a single position with padding.
 */
export function boundsFromPosition(
  position: [number, number],
  padding = FLY_TO_CONFIG.singlePointPadding,
): Bounds {
  return {
    minX: position[0] - padding,
    maxX: position[0] + padding,
    minY: position[1] - padding,
    maxY: position[1] + padding,
  };
}

/**
 * Create bounds that encompass multiple positions.
 * Returns null if no positions provided.
 */
export function boundsFromPositions(
  positions: Array<[number, number]>,
): Bounds | null {
  if (positions.length === 0) return null;
  return {
    minX: Math.min(...positions.map((p) => p[0])),
    maxX: Math.max(...positions.map((p) => p[0])),
    minY: Math.min(...positions.map((p) => p[1])),
    maxY: Math.max(...positions.map((p) => p[1])),
  };
}

/**
 * Create bounds from a polygon's vertices.
 */
export function boundsFromPolygon(polygon: Array<[number, number]>): Bounds {
  return {
    minX: Math.min(...polygon.map((p) => p[0])),
    maxX: Math.max(...polygon.map((p) => p[0])),
    minY: Math.min(...polygon.map((p) => p[1])),
    maxY: Math.max(...polygon.map((p) => p[1])),
  };
}

/**
 * Computed view state from fitted bounds.
 */
export interface FlyToBoundsResult {
  x: number;
  y: number;
  zoom: number;
}

export interface FittedBoundsViewState extends FlyToBoundsResult {
  target: [number, number, number];
  minZoom: number;
  maxZoom: number;
}

export interface FitBoundsToViewStateOptions {
  width: number;
  height: number;
  padding?: number;
  maxZoom?: number;
  /** Pixels reserved on right side (e.g., popup width). Shifts center left. */
  rightPadding?: number;
}

export interface FlyToBoundsOptions {
  duration?: number;
  padding?: number;
  maxZoom?: number;
  /** Pixels reserved on right side (e.g., popup width). Shifts center left. */
  rightPadding?: number;
}

/**
 * Calculate the view state needed to fit bounds in explicit viewport dimensions.
 */
export function fitBoundsToViewState(
  bounds: Bounds,
  options: FitBoundsToViewStateOptions,
): FittedBoundsViewState | null {
  const {
    width,
    height,
    padding = FLY_TO_CONFIG.padding,
    maxZoom = FLY_TO_CONFIG.maxZoom,
    rightPadding = 0,
  } = options;

  const effectiveWidth = width - rightPadding;
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    !Number.isFinite(effectiveWidth) ||
    width <= 0 ||
    height <= 0 ||
    effectiveWidth <= 0
  ) {
    return null;
  }

  let centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  const boundsWidth = (bounds.maxX - bounds.minX) * padding;
  const boundsHeight = (bounds.maxY - bounds.minY) * padding;

  const zoomX =
    boundsWidth > 0 ? Math.log2(effectiveWidth / boundsWidth) : maxZoom;
  const zoomY = boundsHeight > 0 ? Math.log2(height / boundsHeight) : maxZoom;
  let zoom = Math.min(zoomX, zoomY);

  zoom = Math.max(INITIAL_VIEW_STATE.minZoom, Math.min(zoom, maxZoom));

  if (rightPadding > 0) {
    centerX += rightPadding / 2 / Math.pow(2, zoom);
  }

  return {
    x: centerX,
    y: centerY,
    zoom,
    target: [centerX, centerY, 0],
    minZoom: INITIAL_VIEW_STATE.minZoom,
    maxZoom,
  };
}

/**
 * Fly to fit a bounding box in the viewport.
 * Calculates appropriate zoom level to show all content with padding.
 * Returns the computed view state for manual state updates.
 */
export function flyToBounds(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deckInstance: any,
  bounds: Bounds,
  options: FlyToBoundsOptions = {},
): FlyToBoundsResult | null {
  if (!deckInstance) return null;

  const { duration = FLY_TO_CONFIG.duration, ...fitOptions } = options;

  const viewState = fitBoundsToViewState(bounds, {
    ...fitOptions,
    width: deckInstance.width,
    height: deckInstance.height,
  });
  if (!viewState) return null;

  deckInstance.setProps({
    initialViewState: {
      target: viewState.target,
      zoom: viewState.zoom,
      minZoom: viewState.minZoom,
      maxZoom: viewState.maxZoom,
      transitionDuration: duration,
      transitionEasing: (t: number) => t * (2 - t),
    },
  });

  return viewState;
}

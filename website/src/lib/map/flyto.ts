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
 * Computed view state from flyToBounds
 */
export interface FlyToBoundsResult {
  x: number;
  y: number;
  zoom: number;
}

export interface FlyToBoundsOptions {
  duration?: number;
  padding?: number;
  maxZoom?: number;
  /** Pixels reserved on right side (e.g., popup width). Shifts center left. */
  rightPadding?: number;
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

  const {
    duration = FLY_TO_CONFIG.duration,
    padding = FLY_TO_CONFIG.padding,
    maxZoom = FLY_TO_CONFIG.maxZoom,
    rightPadding = 0,
  } = options;

  // Get actual viewport dimensions from deck instance
  const viewportWidth = deckInstance.width || 1000;
  const viewportHeight = deckInstance.height || 800;

  // Effective viewport width accounting for right padding (popup)
  const effectiveWidth = viewportWidth - rightPadding;

  // Calculate center
  let centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  // Calculate bounds size with 10% padding
  const boundsWidth = (bounds.maxX - bounds.minX) * padding;
  const boundsHeight = (bounds.maxY - bounds.minY) * padding;

  // Calculate zoom to fit bounds in viewport
  // In OrthographicView at zoom=0, 1 world unit = 1 pixel
  // At zoom=n, 1 world unit = 2^n pixels
  // So: zoom = log2(viewportPx / worldUnits)
  const zoomX =
    boundsWidth > 0 ? Math.log2(effectiveWidth / boundsWidth) : maxZoom;
  const zoomY =
    boundsHeight > 0 ? Math.log2(viewportHeight / boundsHeight) : maxZoom;

  // Use the smaller zoom to ensure both dimensions fit
  let zoom = Math.min(zoomX, zoomY);

  // Clamp to valid zoom range
  zoom = Math.max(INITIAL_VIEW_STATE.minZoom, Math.min(zoom, maxZoom));

  // Offset center to account for right padding (shift view right so entity appears left)
  // At zoom level Z, 1 pixel = 1/2^Z world units
  if (rightPadding > 0) {
    centerX += rightPadding / 2 / Math.pow(2, zoom);
  }

  deckInstance.setProps({
    initialViewState: {
      target: [centerX, centerY, 0],
      zoom,
      minZoom: INITIAL_VIEW_STATE.minZoom,
      maxZoom: INITIAL_VIEW_STATE.maxZoom,
      transitionDuration: duration,
      transitionEasing: (t: number) => t * (2 - t),
    },
  });

  return { x: centerX, y: centerY, zoom };
}

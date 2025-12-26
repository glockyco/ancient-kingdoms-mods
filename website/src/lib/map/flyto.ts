import { INITIAL_VIEW_STATE } from "./config";

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

  const { duration = 1000, zoom } = options;

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

  const { duration = 800 } = options;

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
    zoom: options.zoom ?? 4, // Default to closer zoom for search results
    duration: options.duration ?? 800,
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
  padding = 50,
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
 * Fly to fit a bounding box in the viewport.
 * Calculates appropriate zoom level to show all content with padding.
 */
export function flyToBounds(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deckInstance: any,
  bounds: Bounds,
  options: { duration?: number; padding?: number; maxZoom?: number } = {},
): void {
  if (!deckInstance) return;

  const { duration = 1000, padding = 1.1, maxZoom = 2 } = options;

  // Get actual viewport dimensions from deck instance
  const viewportWidth = deckInstance.width || 1000;
  const viewportHeight = deckInstance.height || 800;

  // Calculate center
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  // Calculate bounds size with 10% padding
  const boundsWidth = (bounds.maxX - bounds.minX) * padding;
  const boundsHeight = (bounds.maxY - bounds.minY) * padding;

  // Calculate zoom to fit bounds in viewport
  // In OrthographicView at zoom=0, 1 world unit = 1 pixel
  // At zoom=n, 1 world unit = 2^n pixels
  // So: zoom = log2(viewportPx / worldUnits)
  const zoomX =
    boundsWidth > 0 ? Math.log2(viewportWidth / boundsWidth) : maxZoom;
  const zoomY =
    boundsHeight > 0 ? Math.log2(viewportHeight / boundsHeight) : maxZoom;

  // Use the smaller zoom to ensure both dimensions fit
  let zoom = Math.min(zoomX, zoomY);

  // Clamp to valid zoom range
  zoom = Math.max(INITIAL_VIEW_STATE.minZoom, Math.min(zoom, maxZoom));

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
}

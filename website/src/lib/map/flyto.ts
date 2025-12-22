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

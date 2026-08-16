import type { DeckProps } from "@deck.gl/core";

/**
 * deck.gl's default click recognizer waits out the double-click window before
 * reporting a single click, which put the popup shell about 311 ms behind the
 * pointer. Measured: pointerup at ~20 ms and popup shell at ~331 ms by default,
 * against ~28 ms with this interval set to 1 ms.
 *
 * The trade-off is accepted deliberately: double-click still zooms, but its
 * first click now also selects. Selection itself was never the cost — under 6x
 * CPU throttle, applySelection measured ~5-6 ms and createLayers/setProps ~3 ms.
 * The remaining latency is the DB-backed detail load (~330 ms locally, 450-580 ms
 * throttled), which is why EntityPopup defers that work to a later macrotask.
 */
export const MAP_CLICK_RECOGNIZER_INTERVAL_MS = 1;

export const MAP_EVENT_RECOGNIZER_OPTIONS = {
  click: { interval: MAP_CLICK_RECOGNIZER_INTERVAL_MS },
} satisfies NonNullable<DeckProps["eventRecognizerOptions"]>;

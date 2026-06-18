import type { DeckProps } from "@deck.gl/core";

export const MAP_CLICK_RECOGNIZER_INTERVAL_MS = 1;

export const MAP_EVENT_RECOGNIZER_OPTIONS = {
  click: { interval: MAP_CLICK_RECOGNIZER_INTERVAL_MS },
} satisfies NonNullable<DeckProps["eventRecognizerOptions"]>;

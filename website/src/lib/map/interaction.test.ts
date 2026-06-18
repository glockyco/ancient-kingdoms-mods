import { describe, expect, test } from "vitest";

import {
  MAP_EVENT_RECOGNIZER_OPTIONS,
  MAP_CLICK_RECOGNIZER_INTERVAL_MS,
} from "./interaction";

describe("map interaction recognizers", () => {
  test("single-click marker selection does not wait for deck.gl's double-click interval", () => {
    expect(MAP_CLICK_RECOGNIZER_INTERVAL_MS).toBeLessThanOrEqual(16);
    expect(MAP_EVENT_RECOGNIZER_OPTIONS.click?.interval).toBe(
      MAP_CLICK_RECOGNIZER_INTERVAL_MS,
    );
  });
});

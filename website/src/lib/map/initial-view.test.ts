import { describe, expect, test } from "vitest";

import { INITIAL_VIEW_STATE } from "./config";
import { createInitialViewState } from "./initial-view";
import type { Bounds } from "./flyto";
import type { MapUrlState } from "./url-state";

const bounds: Bounds = {
  minX: 0,
  maxX: 100,
  minY: 0,
  maxY: 50,
};

const urlState: MapUrlState = {
  x: 12,
  y: -34,
  zoom: 1.5,
};

describe("createInitialViewState", () => {
  test("uses explicit URL coordinates when present", () => {
    expect(
      createInitialViewState({
        urlState,
        hasPositionParams: true,
        bounds,
        width: 400,
        height: 200,
      }),
    ).toEqual({
      target: [12, -34, 0],
      zoom: 1.5,
      minZoom: INITIAL_VIEW_STATE.minZoom,
      maxZoom: INITIAL_VIEW_STATE.maxZoom,
    });
  });

  test("fits initial bounds with measured container dimensions", () => {
    expect(
      createInitialViewState({
        urlState: null,
        hasPositionParams: false,
        bounds,
        width: 400,
        height: 200,
        rightPadding: 200,
        maxZoom: 10,
        padding: 1,
      }),
    ).toEqual({
      target: [100, 25, 0],
      zoom: 1,
      minZoom: INITIAL_VIEW_STATE.minZoom,
      maxZoom: 10,
    });
  });

  test("falls back to default view when measured dimensions are invalid", () => {
    expect(
      createInitialViewState({
        urlState: null,
        hasPositionParams: false,
        bounds,
        width: 0,
        height: 200,
      }),
    ).toBe(INITIAL_VIEW_STATE);
  });
});

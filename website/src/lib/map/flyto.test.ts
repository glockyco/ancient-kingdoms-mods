import { describe, expect, test } from "vitest";

import { fitBoundsToViewState, flyToBounds, type Bounds } from "./flyto";

const bounds: Bounds = {
  minX: 0,
  maxX: 100,
  minY: 0,
  maxY: 50,
};

describe("fitBoundsToViewState", () => {
  test("fits bounds from explicit viewport dimensions", () => {
    const viewState = fitBoundsToViewState(bounds, {
      width: 400,
      height: 200,
      padding: 1,
      maxZoom: 10,
    });

    expect(viewState).toEqual({
      x: 50,
      y: 25,
      zoom: 2,
      target: [50, 25, 0],
      minZoom: -3,
      maxZoom: 10,
    });
  });

  test("accounts for popup padding without changing canvas dimensions", () => {
    const viewState = fitBoundsToViewState(bounds, {
      width: 400,
      height: 200,
      rightPadding: 200,
      padding: 1,
      maxZoom: 10,
    });

    expect(viewState).toEqual({
      x: 100,
      y: 25,
      zoom: 1,
      target: [100, 25, 0],
      minZoom: -3,
      maxZoom: 10,
    });
  });

  test("refuses invalid viewport dimensions", () => {
    expect(fitBoundsToViewState(bounds, { width: 0, height: 200 })).toBeNull();
    expect(fitBoundsToViewState(bounds, { width: 400, height: 0 })).toBeNull();
    expect(
      fitBoundsToViewState(bounds, {
        width: 400,
        height: 200,
        rightPadding: 400,
      }),
    ).toBeNull();
  });
});

describe("flyToBounds", () => {
  test("does not invent fallback dimensions before deck measures", () => {
    let setPropsCalls = 0;
    const deckInstance = {
      width: 0,
      height: 0,
      setProps: () => {
        setPropsCalls += 1;
      },
    };

    expect(flyToBounds(deckInstance, bounds)).toBeNull();
    expect(setPropsCalls).toBe(0);
  });
});

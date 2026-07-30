import { describe, expect, test } from "vitest";
import { getDefaultLayerVisibility } from "./url-state";
import { getWallTrapAreaPolygon } from "./trap-geometry";

describe("trap map presentation", () => {
  test("shows traps in the default map view", () => {
    expect(getDefaultLayerVisibility().traps).toBe(true);
  });

  test("maps a wall trap overlap box from its top-center anchor", () => {
    expect(
      getWallTrapAreaPolygon({
        position: [10, -20],
        trapWidth: 2,
        trapHeight: 8,
      }),
    ).toEqual([
      [9, -20],
      [11, -20],
      [11, -12],
      [9, -12],
    ]);
  });

  test("omits area geometry when dimensions are unavailable", () => {
    expect(
      getWallTrapAreaPolygon({
        position: [10, -20],
        trapWidth: null,
        trapHeight: null,
      }),
    ).toBeNull();
  });
});

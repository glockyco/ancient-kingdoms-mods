import { describe, expect, test } from "vitest";
import {
  formatTrapArea,
  getTrapAreaTiles,
  parseTrapAreaRings,
} from "./trapArea";

describe("trap areas", () => {
  test("parses exported rings", () => {
    expect(parseTrapAreaRings("[[[0,0],[2,0],[2,8],[0,8]]]")).toEqual([
      [
        [0, 0],
        [2, 0],
        [2, 8],
        [0, 8],
      ],
    ]);
  });

  test("treats a missing or empty area as no area", () => {
    expect(parseTrapAreaRings(null)).toBeNull();
    expect(parseTrapAreaRings("[]")).toBeNull();
  });

  test("counts tiles regardless of winding order", () => {
    const clockwise = [
      [
        [0, 0],
        [0, 8],
        [2, 8],
        [2, 0],
      ],
    ] as [number, number][][];
    expect(getTrapAreaTiles(clockwise)).toBe(16);
  });

  test("counts tiles of a concave patch", () => {
    // 4 x 4 square with a 2 x 2 bite taken out of one corner
    expect(
      getTrapAreaTiles([
        [
          [0, 0],
          [4, 0],
          [4, 2],
          [2, 2],
          [2, 4],
          [0, 4],
        ],
      ]),
    ).toBe(12);
  });

  test("describes a rectangle by its sides", () => {
    expect(
      formatTrapArea([
        [
          [-730, 795],
          [-728, 795],
          [-728, 803],
          [-730, 803],
        ],
      ]),
    ).toBe("2 × 8 tiles");
  });

  test("reads a barely rotated collider as the box it is", () => {
    expect(
      formatTrapArea([
        [
          [860.51, 280.42673],
          [858.38995, 280.38678],
          [858.4281, 278.51248],
          [860.524, 278.519],
        ],
      ]),
    ).toBe("2.1 × 1.9 tiles");
  });

  test("keeps a fraction of a tile visible and singular", () => {
    expect(
      formatTrapArea([
        [
          [0, 0],
          [3, 0],
          [0, 1],
        ],
      ]),
    ).toBe("~1.5 tiles");
    expect(
      formatTrapArea([
        [
          [0, 0],
          [2, 0],
          [0, 1],
        ],
      ]),
    ).toBe("~1 tile");
  });

  test("describes an irregular patch by its tiles", () => {
    expect(
      formatTrapArea([
        [
          [0, 0],
          [4, 0],
          [4, 2],
          [2, 2],
          [2, 4],
          [0, 4],
        ],
      ]),
    ).toBe("~12 tiles");
  });
});

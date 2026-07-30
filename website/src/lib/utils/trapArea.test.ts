import { describe, expect, test } from "vitest";
import { formatTrapArea, parseTrapAreaRings } from "./trapArea";

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

  test("states a rectangle as its side lengths", () => {
    expect(
      formatTrapArea([
        [
          [-730, 795],
          [-728, 795],
          [-728, 803],
          [-730, 803],
        ],
      ]),
    ).toBe("2 × 8 units");
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
    ).toBe("2.1 × 1.9 units");
  });

  test("states an irregular patch as its reach, not its shape", () => {
    // 4 x 4 square with a 2 x 2 bite taken out of one corner
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
    ).toBe("reaches 4 × 4 units");
  });
});

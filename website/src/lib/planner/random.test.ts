import { describe, expect, it } from "vitest";
import { createRandomSource, replicateSeed } from "./random";

describe("createRandomSource", () => {
  it("reproduces the xoshiro128** reference sequence for seed 42", () => {
    // Reference values computed with an independent implementation of splitmix32 + xoshiro128**.
    const source = createRandomSource(42);
    const draws = Array.from({ length: 5 }, () => source.next());
    expect(draws).toEqual([
      0.15377163887023926, 0.8504892587661743, 0.01808452606201172,
      0.2119302749633789, 0.5348905920982361,
    ]);
  });

  it("returns identical streams for identical seeds", () => {
    const left = createRandomSource(7);
    const right = createRandomSource(7);
    for (let index = 0; index < 100; index += 1)
      expect(left.next()).toBe(right.next());
  });

  it("maps draws onto the game's range and integer forms", () => {
    const source = createRandomSource(42);
    expect(source.range(0.9, 1.1)).toBeCloseTo(0.9 + 0.2 * 0.15377163887023926);
    expect(source.below(4)).toBe(3);
    expect(source.bernoulli(0.02)).toBe(true);
    expect(source.bernoulli(0.2)).toBe(false);
  });

  it("derives a distinct stream seed per replicate index", () => {
    expect(replicateSeed(42, 0)).toBe(1759338658);
    expect(replicateSeed(42, 1)).toBe(2370221968);
    expect(replicateSeed(42, 2)).toBe(1993415469);
  });

  it("refuses invalid seeds and probabilities", () => {
    expect(() => createRandomSource(-1)).toThrow("seed must be an integer");
    expect(() => createRandomSource(1.5)).toThrow("seed must be an integer");
    expect(() => createRandomSource(1).bernoulli(1.5)).toThrow(
      "probability must be between 0 and 1",
    );
  });
});

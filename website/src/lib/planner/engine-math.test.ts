import { describe, expect, it } from "vitest";
import {
  ceilToInt,
  clamp,
  expectedBernoulli,
  expectedUniform,
  f32,
  floorToInt,
  iround,
  multiplyF32,
} from "./engine-math";

describe("engine numeric primitives", () => {
  it("narrows each float operand before multiplication", () => {
    const staged = multiplyF32(30, 1.05);
    const narrowedOnlyAfterMultiplication = f32(30 * 1.05);

    expect(staged).toBe(31.499998092651367);
    expect(narrowedOnlyAfterMultiplication).toBe(31.5);
    expect(iround(staged)).toBe(31);
    expect(iround(narrowedOnlyAfterMultiplication)).toBe(32);
  });

  it.each([
    [1.5, 2],
    [2.5, 2],
    [-1.5, -2],
    [-2.5, -2],
  ])("rounds the midpoint %f to the even integer %i", (value, expected) => {
    expect(iround(value)).toBe(expected);
  });

  it("keeps ceiling and floor on opposite sides of negative fractions", () => {
    expect(ceilToInt(-1.25)).toBe(-1);
    expect(floorToInt(-1.25)).toBe(-2);
  });

  it("clamps before a later operation can use an out-of-range value", () => {
    expect(clamp(1.25, 0, 0.8) * 100).toBe(80);
    expect(clamp(-0.25, 0, 0.8) * 100).toBe(0);
    expect(() => clamp(0, 1, 0)).toThrow("minimum must not exceed maximum");
  });

  it("substitutes exact expectations for supported random terms", () => {
    expect(expectedBernoulli(0.25, 40, 8)).toBe(16);
    expect(expectedUniform(0.9, 1.1)).toBe(1);
    expect(() => expectedBernoulli(1.01, 1)).toThrow(
      "probability must be between 0 and 1",
    );
  });
});

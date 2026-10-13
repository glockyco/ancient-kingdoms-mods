import { describe, expect, it } from "vitest";
import { charmResistChance, finalCadenceMelody } from "./bard";

describe("Final Cadence Melody", () => {
  it("rounds exact halves to even after the Melody bonus", () => {
    expect(
      finalCadenceMelody().example!({ scaledAmount: 10, songs: 5 }).result,
    ).toMatch(/^12 /);
    expect(
      finalCadenceMelody().example!({ scaledAmount: 14, songs: 5 }).result,
    ).toMatch(/^18 /);
  });
  it("caps the bonus at six distinct songs", () => {
    expect(
      finalCadenceMelody().example!({ scaledAmount: 100, songs: 30 }).result,
    ).toMatch(/^130 /);
    expect(
      finalCadenceMelody().example!({ scaledAmount: 100, songs: 3 }).result,
    ).toMatch(/^100 /);
  });
});

describe("Bard Charm resistance", () => {
  it("includes level adjustment before capping base resistance", () => {
    expect(charmResistChance(40, 50, 1900, 0)).toBeCloseTo(0.9);
  });
  it("caps the level adjustment before adding the higher-level Charm penalty", () => {
    // 30 levels above: the level term caps at 10%, then 30 × 2.5% = 75% is added.
    expect(charmResistChance(80, 50, 0, 0)).toBeCloseTo(0.85);
    expect(charmResistChance(50, 50, 100, 100)).toBeCloseTo(0.03);
  });
  it("floors negative Charisma and final resistance at zero", () => {
    expect(charmResistChance(50, 50, 100, -100)).toBeCloseTo(0.05);
    expect(charmResistChance(50, 50, 100, 1000)).toBe(0);
  });
});

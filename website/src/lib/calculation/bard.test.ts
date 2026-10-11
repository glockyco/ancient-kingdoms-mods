import { describe, expect, it } from "vitest";
import { finalCadenceMelody } from "./bard";

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

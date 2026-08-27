import { describe, expect, test } from "vitest";
import { effectiveBlockChance, statAtLevel } from "./monster-stats";

describe("statAtLevel", () => {
  test("reads the curve at the level, counting from one", () => {
    // block_chance_base 0.01, block_chance_per_level 0.001 for the training dummy.
    expect(statAtLevel(0.01, 0.001, 1)).toBeCloseTo(0.01, 6);
    expect(statAtLevel(0.01, 0.001, 50)).toBeCloseTo(0.059, 6);
  });

  test("a flat curve reads the same at every level", () => {
    expect(statAtLevel(0.2, 0, 55)).toBeCloseTo(0.2, 6);
  });
});

describe("effectiveBlockChance", () => {
  // Ancient Cyclops: base 0.1, flat curve, defense 700 at level 55. The running game
  // reported 0.17 for this exact spawn, which is what pins the defense term.
  test("matches a reading taken from the running game", () => {
    expect(
      effectiveBlockChance({ base: 0.1, perLevel: 0, level: 55, defense: 700 }),
    ).toBeCloseTo(0.17, 6);
  });

  // The same monster with its defense raised to 10000 reported 0.8 in the running game,
  // which is the cap rather than the 1.1 the formula would otherwise give.
  test("caps where the game caps", () => {
    expect(
      effectiveBlockChance({
        base: 0.1,
        perLevel: 0,
        level: 55,
        defense: 10000,
      }),
    ).toBeCloseTo(0.8, 6);
  });

  // Every training dummy spawn. The curve is identical across them, so the spread comes
  // entirely from defense, which is the term a base-only reading drops.
  test.each([
    { level: 40, defense: 200, expected: 0.069 },
    { level: 45, defense: 225, expected: 0.0765 },
    { level: 50, defense: 250, expected: 0.084 },
    { level: 55, defense: 1000, expected: 0.164 },
  ])(
    "dummy at level $level blocks $expected",
    ({ level, defense, expected }) => {
      expect(
        effectiveBlockChance({ base: 0.01, perLevel: 0.001, level, defense }),
      ).toBeCloseTo(expected, 6);
    },
  );

  // The level 50 value is what the exporter denormalises into monsters.block_chance, so a
  // reader who sees 0.084 on the level 55 spawn is seeing another spawn's number.
  test("the level 55 spawn blocks about twice as often as the denormalised value implies", () => {
    const denormalised = 0.084;
    const atLevel55 = effectiveBlockChance({
      base: 0.01,
      perLevel: 0.001,
      level: 55,
      defense: 1000,
    });
    expect(atLevel55 / denormalised).toBeGreaterThan(1.9);
  });

  test("a spawn with no defense is its curve alone", () => {
    expect(
      effectiveBlockChance({ base: 0.05, perLevel: 0, level: 30, defense: 0 }),
    ).toBeCloseTo(0.05, 6);
  });
});

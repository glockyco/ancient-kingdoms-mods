import { describe, expect, it } from "vitest";
import {
  fishDropChancePerCast,
  fishDropChancePerSuccessfulHook,
  fishingClickWindowSeconds,
  fishingCastDelaySecondsRange,
  fishingExperienceForTier,
  fishingMasteryGainChance,
  fishingMasteryGainRange,
  fishingSpotSuccessChance,
  fishTrashChancePerHook,
  fishEscapeChancePerHook,
  fishLowerTierFishChancePerHook,
  fishOutcomeRowsForSpot,
} from "./fishing";

describe("fishing utilities", () => {
  it("matches server fishing spot success formulas", () => {
    expect(
      fishingSpotSuccessChance({
        rodQuality: 0,
        fishingPercent: 0,
        spotTier: 0,
      }),
    ).toBe(0.8);
    expect(
      fishingSpotSuccessChance({
        rodQuality: 1,
        fishingPercent: 0,
        spotTier: 1,
      }),
    ).toBe(0.5);
    expect(
      fishingSpotSuccessChance({
        rodQuality: 2,
        fishingPercent: 50,
        spotTier: 2,
      }),
    ).toBe(0.6);
    expect(
      fishingSpotSuccessChance({
        rodQuality: 4,
        fishingPercent: 100,
        spotTier: 4,
      }),
    ).toBe(0.6);
    expect(
      fishingSpotSuccessChance({
        rodQuality: 4,
        fishingPercent: 100,
        spotTier: 0,
      }),
    ).toBe(1);
  });

  it("treats below-threshold fishing spots as unavailable", () => {
    expect(
      fishingSpotSuccessChance({
        rodQuality: 0,
        fishingPercent: 0,
        spotTier: 2,
      }),
    ).toBe(0);
  });

  it("applies fisherman costume bonus per equipped costume piece", () => {
    expect(
      fishDropChancePerSuccessfulHook({
        configuredDropRate: 0.2,
        fishCountAtSpot: 4,
        fishingPercent: 40,
        fishermanCostumePieces: 3,
      }),
    ).toBeCloseTo(0.115);
  });

  it("combines spot success and selected fish roll for per-cast chance", () => {
    expect(
      fishDropChancePerCast({
        configuredDropRate: 0.2,
        fishCountAtSpot: 4,
        fishingPercent: 40,
        fishermanCostumePieces: 3,
        rodQuality: 2,
        spotTier: 2,
      }),
    ).toBeCloseTo(0.0621);
  });

  it("matches mastery chance and tier caps", () => {
    expect(
      fishingMasteryGainChance({ fishingPercent: 0, spotTier: 0 }),
    ).toBeCloseTo(0.6);
    expect(fishingMasteryGainChance({ fishingPercent: 26, spotTier: 0 })).toBe(
      0,
    );
    expect(
      fishingMasteryGainChance({ fishingPercent: 49, spotTier: 1 }),
    ).toBeCloseTo(0.355);
    expect(fishingMasteryGainChance({ fishingPercent: 51, spotTier: 1 })).toBe(
      0,
    );
    expect(
      fishingMasteryGainChance({ fishingPercent: 74, spotTier: 2 }),
    ).toBeCloseTo(0.23);
    expect(fishingMasteryGainChance({ fishingPercent: 76, spotTier: 2 })).toBe(
      0,
    );
  });

  it("scales mastery gain amount inversely with spot success", () => {
    expect(fishingMasteryGainRange(1)).toEqual({ min: 0.02, max: 0.06 });
    expect(fishingMasteryGainRange(0.5)).toEqual({ min: 0.04, max: 0.12 });
  });

  it("matches fishing XP by spot tier", () => {
    expect(fishingExperienceForTier(0)).toBe(15);
    expect(fishingExperienceForTier(1)).toBe(150);
    expect(fishingExperienceForTier(2)).toBe(750);
    expect(fishingExperienceForTier(3)).toBe(4000);
    expect(fishingExperienceForTier(4)).toBe(10000);
  });

  it("matches click-window length and cast delay range by tier", () => {
    expect(fishingClickWindowSeconds(0)).toBe(2.0);
    expect(fishingClickWindowSeconds(1)).toBe(1.5);
    expect(fishingClickWindowSeconds(2)).toBe(1.0);
    expect(fishingClickWindowSeconds(3)).toBe(0.75);
    expect(fishingClickWindowSeconds(4)).toBe(0.75);
    expect(fishingCastDelaySecondsRange()).toEqual({ min: 3, max: 7 });
  });

  it("splits failed-primary outcomes by spot tier", () => {
    const drops = {
      spotDrops: [{ probability: 0.5 }, { probability: 0.5 }],
      fishingPercent: 0,
      fishermanCostumePieces: 0,
    };
    // A = 0.5, so the failed-primary mass is (1 − A) = 0.5.
    // Tier I (level 0): 30% trash, 0% lower-tier fish, 70% escape.
    expect(fishTrashChancePerHook({ ...drops, spotTier: 0 })).toBeCloseTo(0.15);
    expect(
      fishLowerTierFishChancePerHook({ ...drops, spotTier: 0 }),
    ).toBeCloseTo(0);
    expect(fishEscapeChancePerHook({ ...drops, spotTier: 0 })).toBeCloseTo(
      0.35,
    );
    // Tier II (level 1): 10% trash, 45% lower-tier fish, 45% escape.
    expect(fishTrashChancePerHook({ ...drops, spotTier: 1 })).toBeCloseTo(0.05);
    expect(
      fishLowerTierFishChancePerHook({ ...drops, spotTier: 1 }),
    ).toBeCloseTo(0.225);
    expect(fishEscapeChancePerHook({ ...drops, spotTier: 1 })).toBeCloseTo(
      0.225,
    );
    // Tier III (level 2): 0% trash, 75% lower-tier fish, 25% escape.
    expect(fishTrashChancePerHook({ ...drops, spotTier: 2 })).toBeCloseTo(0);
    expect(
      fishLowerTierFishChancePerHook({ ...drops, spotTier: 2 }),
    ).toBeCloseTo(0.375);
    expect(fishEscapeChancePerHook({ ...drops, spotTier: 2 })).toBeCloseTo(
      0.125,
    );
    // Tier IV (level 3): 0% trash, 90% lower-tier fish, 10% escape.
    expect(fishTrashChancePerHook({ ...drops, spotTier: 3 })).toBeCloseTo(0);
    expect(
      fishLowerTierFishChancePerHook({ ...drops, spotTier: 3 }),
    ).toBeCloseTo(0.45);
    expect(fishEscapeChancePerHook({ ...drops, spotTier: 3 })).toBeCloseTo(
      0.05,
    );
  });

  it("distributes lower-tier fallback chance across exact fish", () => {
    const rows = fishOutcomeRowsForSpot({
      spotTier: 1,
      fishingPercent: 0,
      fishermanCostumePieces: 0,
      spotDrops: [
        {
          itemId: "rough_primary",
          itemName: "Rough Primary",
          quality: 1,
          tooltipHtml: "<p>rough</p>",
          probability: 0.5,
        },
        {
          itemId: "rough_secondary",
          itemName: "Rough Secondary",
          quality: 1,
          tooltipHtml: "<p>secondary</p>",
          probability: 0.5,
        },
      ],
      fishPoolsByQuality: {
        0: [
          {
            itemId: "calm_one",
            itemName: "Calm One",
            quality: 0,
            tooltipHtml: "<p>calm one</p>",
          },
          {
            itemId: "calm_two",
            itemName: "Calm Two",
            quality: 0,
            tooltipHtml: "<p>calm two</p>",
          },
        ],
      },
    });

    const fallbackRows = rows.flatMap((row) =>
      row.kind === "fallback_fish" ? [row] : [],
    );
    expect(fallbackRows).toHaveLength(2);
    expect(fallbackRows.map((row) => row.itemId)).toEqual([
      "calm_one",
      "calm_two",
    ]);
    expect(fallbackRows.map((row) => row.chancePerBite)).toEqual([
      0.1125, 0.1125,
    ]);
  });
});

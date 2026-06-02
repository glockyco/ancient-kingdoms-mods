import { describe, expect, it } from "vitest";
import {
  assembleFishingRangeData,
  resolveFishingSourceRange,
} from "./fishing-source-ranges";
import {
  fishDropChanceRange,
  fishFallbackChanceRange,
  fishTrashChanceRange,
} from "./fishing";

describe("fishing source ranges", () => {
  function sampleData() {
    return assembleFishingRangeData({
      spots: [
        { id: "deep_spot", spotTier: 3, requiredRodQuality: 0 },
        { id: "calm_spot", spotTier: 1, requiredRodQuality: 0 },
      ],
      dropRates: [
        { resourceId: "deep_spot", dropRate: 0.1 },
        { resourceId: "deep_spot", dropRate: 0.2 },
        { resourceId: "deep_spot", dropRate: 0.2 },
        { resourceId: "deep_spot", dropRate: 0.2 },
        { resourceId: "deep_spot", dropRate: 0.2 },
        { resourceId: "calm_spot", dropRate: 0.5 },
      ],
      bestRodQuality: 4,
      trashCount: 2,
      fishQualities: [0, 1, 2, 3],
    });
  }

  it("groups configured drop rates under each spot", () => {
    const data = sampleData();
    expect(data.spotById.get("deep_spot")).toEqual({
      spotTier: 3,
      requiredRodQuality: 0,
      dropRates: [0.1, 0.2, 0.2, 0.2, 0.2],
    });
    expect(data.spotById.get("calm_spot")?.dropRates).toEqual([0.5]);
  });

  it("returns null for resources that are not fishing spots", () => {
    expect(
      resolveFishingSourceRange(sampleData(), {
        resourceId: "iron_node",
        role: "primary",
        configuredDropRate: 1,
      }),
    ).toBeNull();
  });

  it("resolves a primary source via the shared drop-chance helper", () => {
    // deep_spot: tier 3, 5 configured fish, rusty required (q0), best q4.
    expect(
      resolveFishingSourceRange(sampleData(), {
        resourceId: "deep_spot",
        role: "primary",
        configuredDropRate: 0.1,
      }),
    ).toEqual(
      fishDropChanceRange({
        configuredDropRate: 0.1,
        fishCountAtSpot: 5,
        spotTier: 3,
        requiredRodQuality: 0,
        bestRodQuality: 4,
      }),
    );
  });

  it("resolves a trash source split across the global trash pool", () => {
    expect(
      resolveFishingSourceRange(sampleData(), {
        resourceId: "deep_spot",
        role: "trash",
        configuredDropRate: 0,
      }),
    ).toEqual(
      fishTrashChanceRange({
        spotDrops: [0.1, 0.2, 0.2, 0.2, 0.2].map((probability) => ({
          probability,
        })),
        spotTier: 3,
        trashCount: 2,
        requiredRodQuality: 0,
        bestRodQuality: 4,
      }),
    );
  });

  it("resolves a fallback source sized by lower-tier fish below the spot tier", () => {
    // fishQualities [0,1,2,3], tier 3 -> pool size 3 (qualities 0,1,2).
    expect(
      resolveFishingSourceRange(sampleData(), {
        resourceId: "deep_spot",
        role: "fallback",
        configuredDropRate: 0,
      }),
    ).toEqual(
      fishFallbackChanceRange({
        spotDrops: [0.1, 0.2, 0.2, 0.2, 0.2].map((probability) => ({
          probability,
        })),
        spotTier: 3,
        fallbackPoolSize: 3,
        requiredRodQuality: 0,
        bestRodQuality: 4,
      }),
    );
  });
});

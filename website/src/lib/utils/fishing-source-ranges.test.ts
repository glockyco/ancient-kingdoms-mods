import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { professionAttempt } from "$lib/acquisition/rules";
import {
  assembleFishingRangeData,
  resolveFishingSourceRange,
  FISHING_RANGE_QUERIES,
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

  it("loads canonical primary slots once across spawn methods, including anonymous slots", () => {
    const db = new Database(":memory:");
    try {
      db.exec(`
        CREATE TABLE acquisition_resource_details (id TEXT, resource_id TEXT);
        CREATE TABLE acquisition_method_pools (method_id TEXT, pool_id TEXT);
        CREATE TABLE loot_pools (id TEXT, kind TEXT);
        CREATE TABLE loot_pool_entries (id TEXT, pool_id TEXT, probability REAL);
        INSERT INTO acquisition_resource_details VALUES ('spawn_a', 'spot'), ('spawn_b', 'spot');
        INSERT INTO acquisition_method_pools VALUES ('spawn_a', 'primary'), ('spawn_b', 'primary'), ('spawn_a', 'trash');
        INSERT INTO loot_pools VALUES ('primary', 'fishing_primary'), ('trash', 'fishing_trash');
        INSERT INTO loot_pool_entries VALUES ('first', 'primary', 0.2), ('anonymous', 'primary', 0.2), ('trash', 'trash', 1);
      `);
      expect(db.prepare(FISHING_RANGE_QUERIES.dropRates).all()).toEqual([
        { resourceId: "spot", id: "anonymous", dropRate: 0.2 },
        { resourceId: "spot", id: "first", dropRate: 0.2 },
      ]);
    } finally {
      db.close();
    }
  });

  it("evaluates entered profession and tool scenarios without assuming missing tools", () => {
    expect(professionAttempt("mining", 4, 0, 4)).toEqual({
      raw: 0.2,
      qualified: true,
      displayed: 0.2,
    });
    expect(professionAttempt("fishing", 4, 0, null)).toEqual({
      raw: 0,
      qualified: false,
      displayed: 0,
    });
    expect(professionAttempt("herbalism", 4, 0, null)).toEqual({
      raw: 0,
      qualified: false,
      displayed: 0,
    });
    expect(professionAttempt("herbalism", 4, 1, null)).toEqual({
      raw: 1,
      qualified: true,
      displayed: 1,
    });
    expect(professionAttempt("fishing", 4, 0.4, 0)).toEqual({
      raw: 0.2,
      qualified: true,
      displayed: 0.2,
    });
  });
});

import { describe, expect, test } from "vitest";
import { getDb } from "$lib/db.server";
import { loadChambersOverview, loadMonsterChambers } from "./chambers.server";
import { getProsperityRegion } from "./regional-events.server";

const db = getDb();

describe("Chambers zone and monster queries", () => {
  test("only the Chambers zone has an overview", () => {
    const overview = loadChambersOverview(db, "chambers_of_chaos");
    expect(overview?.keeper.id).toBe("mordrath");
    expect(overview?.monsters).toHaveLength(9);
    expect(overview?.rewardRange).toEqual({ minimum: 1, maximum: 5 });
    expect(loadChambersOverview(db, "crescent_coast")).toBeNull();
  });

  test("every pool monster links to the Chambers and no other monster does", () => {
    const pool = loadChambersOverview(db, "chambers_of_chaos")?.monsters ?? [];
    for (const monster of pool)
      expect(loadMonsterChambers(db, monster.id)?.zoneId).toBe(
        "chambers_of_chaos",
      );
    expect(loadMonsterChambers(db, "wolf")).toBeNull();
  });

  test("Chambers kills are not a region's Prosperity", () => {
    expect(getProsperityRegion("chambers_of_chaos")).toBeNull();
  });
});

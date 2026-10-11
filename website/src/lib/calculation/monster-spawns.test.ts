import { describe, expect, it } from "vitest";
import { rareSpawnOdds } from "./monster-spawns";

describe("rare spawn statistics", () => {
  it("multiplies independent failure chances rather than adding successes", () => {
    expect(rareSpawnOdds(0.25, 1200).example!({ rolls: 2 }).result).toMatch(
      /^43.75%/,
    );
    expect(rareSpawnOdds(0.25, 1200).example!({ rolls: 3 }).result).toMatch(
      /^57.81%/,
    );
    expect(rareSpawnOdds(1, 1200).example!({ rolls: 1 }).result).toMatch(
      /^100%/,
    );
  });
});

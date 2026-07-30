import { describe, expect, it } from "vitest";
import { reputationTierName, type ReputationTier } from "./reputation";

// The eight rows shipped in reputation_tiers, in id order.
const tiers: ReputationTier[] = [
  { id: 0, name: "Hated", min_value: null, max_value: -3000, is_hostile: true },
  {
    id: 1,
    name: "Hostile",
    min_value: -3000,
    max_value: -500,
    is_hostile: true,
  },
  {
    id: 2,
    name: "Unfriendly",
    min_value: -500,
    max_value: 0,
    is_hostile: true,
  },
  { id: 3, name: "Neutral", min_value: 0, max_value: 1000, is_hostile: false },
  {
    id: 4,
    name: "Friendly",
    min_value: 1000,
    max_value: 21000,
    is_hostile: false,
  },
  {
    id: 5,
    name: "Honored",
    min_value: 21000,
    max_value: 221000,
    is_hostile: false,
  },
  {
    id: 6,
    name: "Ally",
    min_value: 221000,
    max_value: 721000,
    is_hostile: false,
  },
  {
    id: 7,
    name: "Revered",
    min_value: 721000,
    max_value: null,
    is_hostile: false,
  },
];

describe("reputationTierName", () => {
  it("treats a NULL minimum as unbounded below", () => {
    expect(reputationTierName(tiers, -5000)).toBe("Hated");
  });

  it("treats a NULL maximum as unbounded above", () => {
    expect(reputationTierName(tiers, 721000)).toBe("Revered");
  });

  it.each([
    [-3000, "Hostile"],
    [-500, "Unfriendly"],
    [0, "Neutral"],
    [1000, "Friendly"],
    [21000, "Honored"],
    [221000, "Ally"],
  ])("places %i at the inclusive bottom of %s", (value, expected) => {
    expect(reputationTierName(tiers, value)).toBe(expected);
  });

  it("excludes the upper bound from a tier", () => {
    expect(reputationTierName(tiers, 999)).toBe("Neutral");
    expect(reputationTierName(tiers, -3001)).toBe("Hated");
  });

  it("falls back to Unknown when no tier covers the value", () => {
    expect(reputationTierName([], 0)).toBe("Unknown");
  });
});

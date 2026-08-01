import { describe, expect, test } from "vitest";
import { getRadiantSeekerPageData } from "./radiant-seeker-page-data.server";

describe("Radiant Seeker page data", () => {
  test("loads every Radiant Spark location and the Aether use finding", () => {
    const data = getRadiantSeekerPageData();

    expect(data.profession.id).toBe("radiant_seeker");
    expect(data.resource.id).toBe("radiant_spark");
    expect(data.resource.reward_item_id).toBe("radiant_aether");
    expect(data.resource.node_count).toBe(227);
    expect(data.resource.zones).toEqual([
      {
        zone_id: "the_molten_summit",
        zone_name: "The Molten Summit",
        node_count: 48,
      },
      {
        zone_id: "the_lone-lands",
        zone_name: "The Lone-lands",
        node_count: 43,
      },
      {
        zone_id: "twilight_forest",
        zone_name: "Twilight Forest",
        node_count: 42,
      },
      {
        zone_id: "crescent_coast",
        zone_name: "Crescent Coast",
        node_count: 36,
      },
      {
        zone_id: "northern_wastes",
        zone_name: "Northern Wastes",
        node_count: 33,
      },
      { zone_id: "everfrost", zone_name: "Everfrost", node_count: 25 },
    ]);
    expect(data.recipe_count).toBe(0);
  });
});

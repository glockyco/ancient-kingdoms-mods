import Database from "better-sqlite3";
import { describe, expect, test } from "vitest";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import { getRadiantSeekerPageData } from "./radiant-seeker-page-data.server";

describe("Radiant Seeker page data", () => {
  test("retains the canonical reward and exact public locations", async () => {
    const data = await getRadiantSeekerPageData();
    const db = new Database(DB_SOURCE_PATH, { readonly: true });
    try {
      expect(data.profession.id).toBe("radiant_seeker");
      const outputs = db
        .prepare(
          `SELECT DISTINCT o.item_id FROM acquisition_outputs o JOIN acquisition_resource_details d ON d.id = o.method_id WHERE d.resource_id = ? AND o.yield_rule != 'pool' AND o.withheld = 0 ORDER BY o.item_id`,
        )
        .all(data.resource.id) as { item_id: string }[];
      expect(outputs.length).toBeGreaterThan(0);
      expect(outputs.map((output) => output.item_id)).toContain(
        data.resource.reward_item_id,
      );
      expect(data.resource.reward_item_name).toBe("Radiant Aether");
      const zones = db
        .prepare(
          `SELECT z.id AS zone_id, z.name AS zone_name, COUNT(*) AS node_count FROM gathering_resource_spawns s JOIN zones z ON z.id = s.zone_id WHERE s.resource_id = ? GROUP BY z.id, z.name ORDER BY node_count DESC, z.name`,
        )
        .all(data.resource.id);
      expect(data.resource.zones).toEqual(zones);
      expect(data.resource.node_count).toBe(
        data.resource.zones.reduce((sum, zone) => sum + zone.node_count, 0),
      );
      const recipes = db
        .prepare(
          `SELECT COUNT(DISTINCT d.id) AS count FROM acquisition_inputs i JOIN acquisition_cost_groups c ON c.id = i.cost_group_id JOIN acquisition_recipe_details d ON d.id = c.method_id WHERE i.withheld = 0 AND i.item_id IN (SELECT o.item_id FROM acquisition_outputs o JOIN acquisition_resource_details resource ON resource.id = o.method_id WHERE resource.resource_id = ? AND o.yield_rule != 'pool' AND o.withheld = 0)`,
        )
        .get(data.resource.id) as { count: number };
      expect(data.recipe_count).toBe(recipes.count);
    } finally {
      db.close();
    }
  });
});

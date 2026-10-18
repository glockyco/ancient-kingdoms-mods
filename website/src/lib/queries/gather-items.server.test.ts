import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  getFishingSpotVariantDetails,
  getGatheringResourceByIdFromDb,
} from "./gather-items.server";

function createDb() {
  const db = new Database(":memory:");
  db.exec(readFileSync("../build-pipeline/schema.sql", "utf8"));
  db.exec(`
    INSERT INTO items (id, name, quality) VALUES
      ('rusty_fishing_rod', 'Rusty Fishing Rod', 0),
      ('blue_dartfish', 'Blue Dartfish', 1),
      ('ironjaw_catfish', 'Ironjaw Catfish', 2),
      ('worn_rucksack', 'Worn Rucksack', 0),
      ('rusty_dagger', 'Rusty Dagger', 0);
    INSERT INTO zones (id, zone_id, name) VALUES
      ('twilight_forest', 0, 'Twilight Forest'),
      ('lone_lands', 1, 'The Lone-lands');
    INSERT INTO gathering_resources (id, name, is_fishing_spot, tool_required_id) VALUES
      ('calm_fishing_spot_11111111', 'Calm Fishing Spot', 1, 'rusty_fishing_rod'),
      ('calm_fishing_spot_22222222', 'Calm Fishing Spot', 1, 'rusty_fishing_rod');
    INSERT INTO gathering_resource_spawns (id, resource_id, zone_id) VALUES
      ('spawn_1', 'calm_fishing_spot_11111111', 'twilight_forest'),
      ('spawn_2', 'calm_fishing_spot_22222222', 'lone_lands');
    INSERT INTO acquisition_methods (id, kind, rule_id, rooted) VALUES
      ('method_1', 'gather', 'fishing', 1), ('method_2', 'gather', 'fishing', 1);
    INSERT INTO acquisition_resource_details VALUES
      ('method_1', 'calm_fishing_spot_11111111', 'fishing', 1, 0, 0),
      ('method_2', 'calm_fishing_spot_22222222', 'fishing', 1, 0, 0);
    INSERT INTO acquisition_providers_resource_spawns VALUES
      ('provider_1', 'method_1', 'spawn_1', NULL), ('provider_2', 'method_2', 'spawn_2', NULL);
    INSERT INTO loot_pools VALUES
      ('pool_1', 'fishing_primary'), ('pool_2', 'fishing_primary'),
      ('trash_pool', 'fishing_trash'), ('fallback_pool', 'fishing_fallback');
    INSERT INTO acquisition_method_pools VALUES
      ('membership_1', 'method_1', 'pool_1', 0, 'successful_hook'),
      ('membership_2', 'method_2', 'pool_2', 0, 'successful_hook');
    INSERT INTO loot_fishing_rules VALUES
      ('rule_1', 'pool_1', 'trash_pool', 'fallback_pool', 0),
      ('rule_2', 'pool_2', 'trash_pool', 'fallback_pool', 0);
    INSERT INTO acquisition_method_fishing_rules VALUES
      ('method_1', 'method_1', 'rule_1'), ('method_2', 'method_2', 'rule_2');
    INSERT INTO loot_pool_entries (id, pool_id, ordinal, item_id, resolution, probability, duplicate_group, cap, counts_equipment, guaranteed_equipment_candidate, quest_gate, scales_with_treasure_hunter, quality) VALUES
      ('fish_1', 'pool_1', 0, 'blue_dartfish', 'direct', 0.25, 0, 1, 0, 0, 'none', 0, 1),
      ('fish_2', 'pool_2', 0, 'ironjaw_catfish', 'direct', 0.5, 0, 1, 0, 0, 'none', 0, 2),
      ('trash_1', 'trash_pool', 0, 'worn_rucksack', 'direct', 1, 0, 1, 0, 0, 'none', 0, 0),
      ('trash_2', 'trash_pool', 1, 'rusty_dagger', 'direct', 1, 1, 1, 0, 0, 'none', 0, 0),
      ('fallback_1', 'fallback_pool', 0, 'blue_dartfish', 'direct', 1, 0, 1, 0, 0, 'none', 0, 1);
    INSERT INTO fish VALUES
      ('blue_dartfish', 0),
      ('ironjaw_catfish', 0),
      ('worn_rucksack', 1),
      ('rusty_dagger', 1);
  `);
  return db;
}

describe("fishing spot variant detail queries", () => {
  test("resolves a base fishing spot id to all variant drop tables and locations", async () => {
    const db = createDb();
    const resource = await getGatheringResourceByIdFromDb(
      db,
      "calm_fishing_spot",
    );

    expect(resource?.id).toBe("calm_fishing_spot_11111111");

    const variants = await getFishingSpotVariantDetails(db, resource!);

    expect(variants.map((variant) => variant.resource.id)).toEqual([
      "calm_fishing_spot_11111111",
      "calm_fishing_spot_22222222",
    ]);
    expect(variants[0].spawns).toEqual([
      {
        zone_id: "twilight_forest",
        zone_name: "Twilight Forest",
        spawn_count: 1,
      },
    ]);
    expect(variants[0].drops.map((drop) => drop.item_id)).toEqual(
      expect.arrayContaining([
        "blue_dartfish",
        "worn_rucksack",
        "rusty_dagger",
      ]),
    );
    expect(
      variants[0].drops.filter((drop) => drop.is_fishing_trash),
    ).toHaveLength(2);
    expect(variants[1].drops.map((drop) => drop.item_id)).toContain(
      "ironjaw_catfish",
    );

    db.close();
  });
});

import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  getAllResourceDropsFromDb,
  getGatherItemsFromDb,
  getChestByIdFromDb,
  getChestsListFromDb,
  getGatheringResourceByIdFromDb,
  getResourceZonesFromDb,
} from "./gather-items.server";

function createDb() {
  const db = new Database(":memory:");
  db.exec(readFileSync("../build-pipeline/schema.sql", "utf8"));
  db.exec(`
    INSERT INTO items (id, name, quality) VALUES
      ('rusty_fishing_rod', 'Rusty Fishing Rod', 0),
      ('blue_dartfish', 'Blue Dartfish', 1),
      ('ironjaw_catfish', 'Ironjaw Catfish', 2),
      ('sunspike_gar', 'Sunspike Gar', 2),
      ('tideclaw_crab', 'Tideclaw Crab', 3),
      ('lily_item', 'Lily', 0), ('gem', 'Gem', 1);
    INSERT INTO zones (id, zone_id, name) VALUES
      ('twilight_forest', 0, 'Twilight Forest'), ('lone_lands', 1, 'The Lone-lands');
    INSERT INTO gathering_resources (id, name, is_fishing_spot, level, tool_required_id) VALUES
      ('calm_fishing_spot_11111111', 'Calm Fishing Spot', 1, 0, 'rusty_fishing_rod'),
      ('calm_fishing_spot_22222222', 'Calm Fishing Spot', 1, 0, 'rusty_fishing_rod'),
      ('deep_fishing_spot_33333333', 'Deep Fishing Spot', 1, 2, 'rusty_fishing_rod'),
      ('ancient_fishing_spot_44444444', 'Ancient Fishing Spot', 1, 3, 'rusty_fishing_rod');
    INSERT INTO gathering_resources (id, name, is_plant, respawn_time) VALUES ('lily', 'Lily', 1, 60);
    INSERT INTO loot_pools VALUES ('trash', 'fishing_trash'), ('fallback', 'fishing_fallback');
    INSERT INTO loot_pool_entries
      (id, pool_id, ordinal, item_id, resolution, probability, duplicate_group, cap, counts_equipment, guaranteed_equipment_candidate, quest_gate, scales_with_treasure_hunter, quality)
      VALUES ('fallback_fish', 'fallback', 0, 'blue_dartfish', 'direct', 1, 0, 1, 0, 0, 'none', 0, 1);
  `);
  const spots = [
    [
      "calm_1",
      "calm_fishing_spot_11111111",
      "twilight_forest",
      "blue_dartfish",
      0,
    ],
    [
      "calm_2",
      "calm_fishing_spot_22222222",
      "lone_lands",
      "ironjaw_catfish",
      0,
    ],
    [
      "deep",
      "deep_fishing_spot_33333333",
      "twilight_forest",
      "sunspike_gar",
      2,
    ],
    [
      "ancient",
      "ancient_fishing_spot_44444444",
      "lone_lands",
      "tideclaw_crab",
      3,
    ],
  ] as const;
  for (const [id, resourceId, zoneId, itemId, tier] of spots) {
    db.prepare(
      "INSERT INTO gathering_resource_spawns (id, resource_id, zone_id) VALUES (?, ?, ?)",
    ).run(id, resourceId, zoneId);
    db.prepare(
      "INSERT INTO acquisition_methods (id, kind, rule_id, rooted) VALUES (?, 'gather', 'fishing', 1)",
    ).run(id);
    db.prepare(
      "INSERT INTO acquisition_resource_details VALUES (?, ?, 'fishing', 1, 0, 0)",
    ).run(id, resourceId);
    db.prepare(
      "INSERT INTO acquisition_providers_resource_spawns VALUES (?, ?, ?, NULL)",
    ).run(`${id}_provider`, id, id);
    db.prepare("INSERT INTO loot_pools VALUES (?, 'fishing_primary')").run(
      `${id}_pool`,
    );
    db.prepare(
      "INSERT INTO acquisition_method_pools VALUES (?, ?, ?, 0, 'successful_hook')",
    ).run(`${id}_membership`, id, `${id}_pool`);
    db.prepare(
      "INSERT INTO loot_fishing_rules VALUES (?, ?, 'trash', 'fallback', ?)",
    ).run(`${id}_rule`, `${id}_pool`, tier);
    db.prepare(
      "INSERT INTO acquisition_method_fishing_rules VALUES (?, ?, ?)",
    ).run(id, id, `${id}_rule`);
    db.prepare(
      `INSERT INTO loot_pool_entries
      (id, pool_id, ordinal, item_id, resolution, probability, duplicate_group, cap, counts_equipment, guaranteed_equipment_candidate, quest_gate, scales_with_treasure_hunter, quality)
      VALUES (?, ?, 0, ?, 'direct', 0.2, 0, 1, 0, 0, 'none', 0, 1)`,
    ).run(`${id}_fish`, `${id}_pool`, itemId);
  }
  for (const max of [1, 2, 3, 4]) {
    const id = `lily_${max}`;
    db.prepare(
      "INSERT INTO gathering_resource_spawns (id, resource_id, zone_id) VALUES (?, 'lily', 'twilight_forest')",
    ).run(id);
    db.prepare(
      "INSERT INTO acquisition_methods (id, kind, rule_id, rooted) VALUES (?, 'gather', 'herbalism', 1)",
    ).run(id);
    db.prepare(
      "INSERT INTO acquisition_resource_details VALUES (?, 'lily', 'plant', 1, 0, 0)",
    ).run(id);
    db.prepare(
      "INSERT INTO acquisition_providers_resource_spawns VALUES (?, ?, ?, NULL)",
    ).run(`${id}_provider`, id, id);
    db.prepare(
      `INSERT INTO acquisition_outputs
      (id, method_id, ordinal, resource_kind, item_id, amount_min, amount_max, yield_rule, delivery)
      VALUES (?, ?, 0, 'item', 'lily_item', 1, ?, 'extra_gather', 'inventory')`,
    ).run(`${id}_output`, id, max);
  }
  db.exec(`
    INSERT INTO acquisition_methods (id, kind, rule_id, rooted) VALUES ('lily_template', 'gather', 'herbalism', 0);
    INSERT INTO acquisition_resource_details VALUES ('lily_template', 'lily', 'plant', 1, 0, 0);
    INSERT INTO acquisition_outputs
      (id, method_id, ordinal, resource_kind, item_id, amount_min, amount_max, yield_rule, delivery) VALUES
      ('template_output', 'lily_template', 0, 'item', 'lily_item', 1, 2, 'extra_gather', 'inventory');
  `);
  return db;
}

describe("gather item overview queries", () => {
  test("collapses fishing variants without losing zones or random drops", async () => {
    const db = createDb();
    try {
      const resources = (await getGatherItemsFromDb(db)).filter(
        (item) => item.type !== "Chest",
      );
      const fishingSpots = resources.filter(
        (item) => item.type === "Fishing Spot",
      );
      expect(fishingSpots.map((spot) => [spot.id, spot.level])).toEqual([
        ["ancient_fishing_spot", 3],
        ["calm_fishing_spot", 0],
        ["deep_fishing_spot", 2],
      ]);
      expect(
        fishingSpots.find((spot) => spot.id === "calm_fishing_spot"),
      ).toMatchObject({ zone_count: 2, item_reward_id: null });
      expect(
        getResourceZonesFromDb(db)
          .filter((zone) => zone.resource_id === "calm_fishing_spot")
          .map((zone) => zone.zone_name)
          .sort(),
      ).toEqual(["The Lone-lands", "Twilight Forest"]);
      expect(
        getAllResourceDropsFromDb(db)
          .filter((drop) => drop.resource_id === "calm_fishing_spot")
          .map((drop) => drop.item_name)
          .sort(),
      ).toEqual(["Blue Dartfish", "Ironjaw Catfish"]);
    } finally {
      db.close();
    }
  });

  test("summarizes every native Lily yield rather than a template or first method", async () => {
    const db = createDb();
    try {
      const overview = (await getGatherItemsFromDb(db)).find(
        (resource) => resource.id === "lily",
      );
      const detail = await getGatheringResourceByIdFromDb(db, "lily");
      for (const resource of [overview, detail]) {
        expect(resource).toMatchObject({
          item_reward_id: "lily_item",
          item_reward_name: "Lily",
          item_reward_amount: 4,
        });
      }
    } finally {
      db.close();
    }
  });

  test("does not confuse quest progress or key-ring delivery with a carried primary reward", async () => {
    const db = createDb();
    try {
      db.exec(`INSERT INTO acquisition_outputs
        (id, method_id, ordinal, resource_kind, item_id, amount_min, amount_max, yield_rule, delivery) VALUES
        ('quest_output', 'lily_4', 1, 'item', 'lily_item', 1, 4, 'extra_gather', 'quest_progress'),
        ('gem_output', 'lily_4', 2, 'item', 'gem', 2, 2, 'fixed', 'keyring'),
        ('gold_output', 'lily_4', 3, 'gold', NULL, 10, 15, 'uniform_upper_exclusive', 'inventory')`);
      const detail = await getGatheringResourceByIdFromDb(db, "lily");
      expect(detail).toMatchObject({
        item_reward_id: "lily_item",
        item_reward_name: "Lily",
        item_reward_amount: 4,
      });
    } finally {
      db.close();
    }
  });

  test("keeps random pool outcomes even when a direct output shares their item", () => {
    const db = createDb();
    try {
      db.exec(`
        INSERT INTO loot_pools VALUES ('lily_pool', 'resource_secondary');
        INSERT INTO acquisition_method_pools VALUES ('lily_membership', 'lily_1', 'lily_pool', 0, 'attempt');
        INSERT INTO loot_pool_entries
          (id, pool_id, ordinal, item_id, resolution, probability, duplicate_group, cap, counts_equipment, guaranteed_equipment_candidate, quest_gate, scales_with_treasure_hunter, quality) VALUES
          ('pool_lily', 'lily_pool', 0, 'lily_item', 'direct', 0.1, 0, 1, 0, 0, 'none', 0, 0),
          ('pool_gem', 'lily_pool', 1, 'gem', 'direct', 0.2, 1, 1, 0, 0, 'none', 0, 1);
      `);
      expect(
        getAllResourceDropsFromDb(db).filter(
          (drop) => drop.resource_id === "lily",
        ),
      ).toEqual([
        { resource_id: "lily", item_id: "gem", item_name: "Gem" },
        { resource_id: "lily", item_id: "lily_item", item_name: "Lily" },
      ]);
    } finally {
      db.close();
    }
  });

  test("chest fields preserve evaluated gold bounds and reject conflicting opening chances", async () => {
    const db = createDb();
    try {
      db.exec(`
        INSERT INTO items (id, name) VALUES ('key_a', 'Key A');
        INSERT INTO chests (id, name, zone_id) VALUES ('chest', 'Chest', 'twilight_forest');
        INSERT INTO acquisition_methods (id, kind, rule_id, rooted) VALUES
          ('chest_a', 'world_chest', 'world_chest', 1), ('chest_b', 'world_chest', 'world_chest', 1);
        INSERT INTO acquisition_world_chest_details VALUES
          ('chest_a', 'chest', 'key_a', 0, 0.75, 10, 15),
          ('chest_b', 'chest', NULL, 1, 0.5, 20, 21);
        INSERT INTO acquisition_providers_chests VALUES
          ('chest_provider_a', 'chest_a', 'chest', NULL), ('chest_provider_b', 'chest_b', 'chest', NULL);
        INSERT INTO acquisition_outputs
          (id, method_id, ordinal, resource_kind, item_id, amount_min, amount_max, yield_rule, delivery) VALUES
          ('chest_gold_a', 'chest_a', 0, 'gold', NULL, 10, 15, 'uniform_upper_exclusive', 'inventory'),
          ('chest_gold_b', 'chest_b', 0, 'gold', NULL, 20, 21, 'uniform_upper_exclusive', 'inventory'),
          ('chest_lily', 'chest_a', 1, 'item', 'lily_item', 2, 4, 'uniform_inclusive', 'inventory'),
          ('chest_gem', 'chest_a', 2, 'item', 'gem', 2, 2, 'fixed', 'keyring');
      `);
      await expect(getChestByIdFromDb(db, "chest")).rejects.toThrow(
        "Conflicting chest opening chances",
      );
      db.exec(
        "UPDATE acquisition_world_chest_details SET outer_success = 0.75",
      );
      const detail = await getChestByIdFromDb(db, "chest");
      const overview = (await getChestsListFromDb(db)).find(
        (chest) => chest.id === "chest",
      );
      for (const chest of [detail, overview]) {
        expect(chest).toMatchObject({
          gold_min: 10,
          gold_max: 20,
          item_reward_id: "lily_item",
          item_reward_amount: 4,
          chest_reward_probability: 0.75,
        });
      }
    } finally {
      db.close();
    }
  });
});

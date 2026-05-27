import Database from "better-sqlite3";
import { describe, expect, test } from "vitest";
import { getGatherSources } from "./item-sources";

function createDb() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE zones (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
    CREATE TABLE gathering_resources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      item_reward_amount INTEGER NOT NULL,
      is_radiant_spark INTEGER NOT NULL DEFAULT 0,
      is_fishing_spot INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE gathering_resource_spawns (
      id TEXT PRIMARY KEY,
      resource_id TEXT NOT NULL,
      zone_id TEXT NOT NULL
    );
    CREATE TABLE fish (
      item_id TEXT PRIMARY KEY,
      is_trash INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE item_sources_gather (
      item_id TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      drop_rate REAL NOT NULL,
      actual_drop_chance REAL
    );
  `);
  db.exec(`
    INSERT INTO zones VALUES
      ('lone_lands', 'The Lone-lands'),
      ('crescent_coast', 'Crescent Coast');
    INSERT INTO gathering_resources VALUES
      ('iron_node', 'Iron Node', 3, 0, 0, 0),
      ('rough_fishing_spot', 'Rough Fishing Spot', 0, 0, 1, 1);
    INSERT INTO gathering_resource_spawns VALUES
      ('fish_spawn_1', 'rough_fishing_spot', 'lone_lands'),
      ('fish_spawn_2', 'rough_fishing_spot', 'lone_lands'),
      ('fish_spawn_3', 'rough_fishing_spot', 'crescent_coast');
    INSERT INTO fish VALUES
      ('driftscale_catfish', 0),
      ('worn_rucksack', 1);
    INSERT INTO item_sources_gather VALUES
      ('iron_ore', 'iron_node', 1.0, 1.0),
      ('golden_stripe_eel', 'rough_fishing_spot', 0.2, 0.0666666667);
  `);
  return db;
}

describe("getGatherSources", () => {
  test("keeps normal gather amount ranges", () => {
    const db = createDb();
    const [source] = getGatherSources(db, "iron_ore");

    expect(source).toMatchObject({
      resource_id: "iron_node",
      is_fishing_spot: 0,
      virtual_location_count: 0,
      amount_min: 1,
      amount_max: 3,
    });

    db.close();
  });

  test("returns one fishing gather row per spot instance", () => {
    const db = createDb();
    const sources = getGatherSources(db, "golden_stripe_eel");

    expect(sources).toHaveLength(3);
    expect(sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resource_id: "rough_fishing_spot",
          spawn_id: "fish_spawn_1",
          zone_id: "lone_lands",
          zone_name: "The Lone-lands",
          is_fishing_spot: 1,
          virtual_location_count: 1,
          amount_min: null,
          amount_max: null,
        }),
        expect.objectContaining({
          resource_id: "rough_fishing_spot",
          spawn_id: "fish_spawn_2",
          zone_id: "lone_lands",
          zone_name: "The Lone-lands",
          is_fishing_spot: 1,
          virtual_location_count: 1,
          amount_min: null,
          amount_max: null,
        }),
        expect.objectContaining({
          resource_id: "rough_fishing_spot",
          spawn_id: "fish_spawn_3",
          zone_id: "crescent_coast",
          zone_name: "Crescent Coast",
          is_fishing_spot: 1,
          virtual_location_count: 1,
          amount_min: null,
          amount_max: null,
        }),
      ]),
    );

    db.close();
  });

  test("does not invent fishing spot rows for fish without explicit source data", () => {
    const db = createDb();
    const sources = getGatherSources(db, "driftscale_catfish");

    expect(sources).toEqual([]);

    db.close();
  });

  test("treats fishing trash as obtainable from each fishing spot instance", () => {
    const db = createDb();
    const sources = getGatherSources(db, "worn_rucksack");

    expect(sources).toHaveLength(3);
    expect(sources[0]).toMatchObject({
      resource_id: "rough_fishing_spot",
      is_fishing_spot: 1,
      virtual_location_count: 1,
      amount_min: null,
      amount_max: null,
    });

    db.close();
  });
});

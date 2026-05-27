import Database from "better-sqlite3";
import { describe, expect, test } from "vitest";
import {
  getFishingSpotVariantDetails,
  getGatheringResourceByIdFromDb,
} from "./gather-items.server";

function createDb() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      quality INTEGER DEFAULT 0
    );
    CREATE TABLE zones (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
    CREATE TABLE gathering_resources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      is_plant INTEGER NOT NULL DEFAULT 0,
      is_fishing_spot INTEGER NOT NULL DEFAULT 0,
      is_mineral INTEGER NOT NULL DEFAULT 0,
      is_radiant_spark INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 0,
      tool_required_id TEXT,
      respawn_time INTEGER NOT NULL DEFAULT 0,
      item_reward_id TEXT,
      item_reward_amount INTEGER NOT NULL DEFAULT 0,
      gathering_exp INTEGER,
      description TEXT
    );
    CREATE TABLE gathering_resource_spawns (
      id TEXT PRIMARY KEY,
      resource_id TEXT NOT NULL,
      zone_id TEXT NOT NULL
    );
    CREATE TABLE item_sources_gather (
      item_id TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      drop_rate REAL NOT NULL,
      actual_drop_chance REAL
    );
    CREATE TABLE fish (
      item_id TEXT PRIMARY KEY,
      is_trash INTEGER NOT NULL DEFAULT 0
    );
  `);
  db.exec(`
    INSERT INTO items VALUES
      ('rusty_fishing_rod', 'Rusty Fishing Rod', 0),
      ('blue_dartfish', 'Blue Dartfish', 1),
      ('ironjaw_catfish', 'Ironjaw Catfish', 2),
      ('worn_rucksack', 'Worn Rucksack', 0),
      ('rusty_dagger', 'Rusty Dagger', 0);
    INSERT INTO zones VALUES
      ('twilight_forest', 'Twilight Forest'),
      ('lone_lands', 'The Lone-lands');
    INSERT INTO gathering_resources VALUES
      ('calm_fishing_spot_11111111', 'Calm Fishing Spot', 0, 1, 0, 0, 0, 'rusty_fishing_rod', 0, NULL, 0, NULL, NULL),
      ('calm_fishing_spot_22222222', 'Calm Fishing Spot', 0, 1, 0, 0, 0, 'rusty_fishing_rod', 0, NULL, 0, NULL, NULL);
    INSERT INTO gathering_resource_spawns VALUES
      ('spawn_1', 'calm_fishing_spot_11111111', 'twilight_forest'),
      ('spawn_2', 'calm_fishing_spot_22222222', 'lone_lands');
    INSERT INTO item_sources_gather VALUES
      ('blue_dartfish', 'calm_fishing_spot_11111111', 0.25, 0.1),
      ('ironjaw_catfish', 'calm_fishing_spot_22222222', 0.5, 0.2);
    INSERT INTO fish VALUES
      ('blue_dartfish', 0),
      ('ironjaw_catfish', 0),
      ('worn_rucksack', 1),
      ('rusty_dagger', 1);
  `);
  return db;
}

describe("fishing spot variant detail queries", () => {
  test("resolves a base fishing spot id to all variant drop tables and locations", () => {
    const db = createDb();
    const resource = getGatheringResourceByIdFromDb(db, "calm_fishing_spot");

    expect(resource?.id).toBe("calm_fishing_spot_11111111");

    const variants = getFishingSpotVariantDetails(db, resource!);

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

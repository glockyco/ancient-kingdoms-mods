import Database from "better-sqlite3";
import { describe, expect, test } from "vitest";
import {
  getAllResourceDropsFromDb,
  getGatherItemsFromDb,
  getResourceZonesFromDb,
} from "./gather-items.server";

function createDb() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
    CREATE TABLE zones (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      is_dungeon INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE gathering_resources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      is_plant INTEGER NOT NULL DEFAULT 0,
      is_fishing_spot INTEGER NOT NULL DEFAULT 0,
      is_mineral INTEGER NOT NULL DEFAULT 0,
      is_radiant_spark INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 0,
      respawn_time INTEGER NOT NULL DEFAULT 0,
      tool_required_id TEXT,
      item_reward_id TEXT,
      item_reward_amount INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE gathering_resource_spawns (
      id TEXT PRIMARY KEY,
      resource_id TEXT NOT NULL,
      zone_id TEXT NOT NULL
    );
    CREATE TABLE item_sources_gather (
      item_id TEXT NOT NULL,
      resource_id TEXT NOT NULL
    );
    CREATE TABLE chests (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      respawn_time INTEGER NOT NULL DEFAULT 0,
      key_required_id TEXT,
      item_reward_id TEXT,
      item_reward_amount INTEGER NOT NULL DEFAULT 0
    );
  `);
  db.exec(`
    INSERT INTO items VALUES
      ('rusty_fishing_rod', 'Rusty Fishing Rod'),
      ('blue_dartfish', 'Blue Dartfish'),
      ('ironjaw_catfish', 'Ironjaw Catfish'),
      ('sunspike_gar', 'Sunspike Gar'),
      ('tideclaw_crab', 'Tideclaw Crab');
    INSERT INTO zones VALUES
      ('twilight_forest', 'Twilight Forest', 0),
      ('lone_lands', 'The Lone-lands', 0);
    INSERT INTO gathering_resources VALUES
      ('calm_fishing_spot_11111111', 'Calm Fishing Spot', 0, 1, 0, 0, 0, 0, 'rusty_fishing_rod', NULL, 0),
      ('calm_fishing_spot_22222222', 'Calm Fishing Spot', 0, 1, 0, 0, 0, 0, 'rusty_fishing_rod', NULL, 0),
      ('deep_fishing_spot_33333333', 'Deep Fishing Spot', 0, 1, 0, 0, 2, 0, 'rusty_fishing_rod', NULL, 0),
      ('ancient_fishing_spot_44444444', 'Ancient Fishing Spot', 0, 1, 0, 0, 3, 0, 'rusty_fishing_rod', NULL, 0),
      ('wheat', 'Wheat', 1, 0, 0, 0, 0, 60, NULL, NULL, 0);
    INSERT INTO gathering_resource_spawns VALUES
      ('spawn_1', 'calm_fishing_spot_11111111', 'twilight_forest'),
      ('spawn_2', 'calm_fishing_spot_22222222', 'lone_lands'),
      ('spawn_deep', 'deep_fishing_spot_33333333', 'twilight_forest'),
      ('spawn_ancient', 'ancient_fishing_spot_44444444', 'lone_lands'),
      ('spawn_3', 'wheat', 'twilight_forest');
    INSERT INTO item_sources_gather VALUES
      ('blue_dartfish', 'calm_fishing_spot_11111111'),
      ('ironjaw_catfish', 'calm_fishing_spot_22222222'),
      ('sunspike_gar', 'deep_fishing_spot_33333333'),
      ('tideclaw_crab', 'ancient_fishing_spot_44444444');
  `);
  return db;
}

describe("gather item overview queries", () => {
  test("collapses fishing spot variants and aggregates their zones and random drops", () => {
    const db = createDb();

    const resources = getGatherItemsFromDb(db).filter(
      (item) => item.type !== "Chest",
    );
    const fishingSpots = resources.filter(
      (item) => item.type === "Fishing Spot",
    );
    const zones = getResourceZonesFromDb(db).filter(
      (zone) => zone.resource_id === "calm_fishing_spot",
    );
    const drops = getAllResourceDropsFromDb(db).filter(
      (drop) => drop.resource_id === "calm_fishing_spot",
    );

    expect(fishingSpots).toHaveLength(3);
    expect(fishingSpots.map((spot) => [spot.id, spot.level])).toEqual([
      ["ancient_fishing_spot", 3],
      ["calm_fishing_spot", 0],
      ["deep_fishing_spot", 2],
    ]);
    expect(
      fishingSpots.find((spot) => spot.id === "calm_fishing_spot"),
    ).toMatchObject({
      id: "calm_fishing_spot",
      name: "Calm Fishing Spot",
      zone_count: 2,
    });
    expect(zones.map((zone) => zone.zone_name).sort()).toEqual([
      "The Lone-lands",
      "Twilight Forest",
    ]);
    expect(drops.map((drop) => drop.item_name).sort()).toEqual([
      "Blue Dartfish",
      "Ironjaw Catfish",
    ]);

    db.close();
  });
});

import Database from "better-sqlite3";
import { describe, expect, test } from "vitest";
import {
  getGatherSources,
  getMonsterSources,
  getPackSources,
  getRandomSources,
  getChestItemSources,
} from "./item-sources";

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
      level INTEGER NOT NULL DEFAULT 0,
      tool_required_id TEXT,
      item_reward_id TEXT
    );
    CREATE TABLE gathering_resource_spawns (
      id TEXT PRIMARY KEY,
      resource_id TEXT NOT NULL,
      zone_id TEXT NOT NULL
    );
    CREATE TABLE items (
      id TEXT PRIMARY KEY,
      quality INTEGER NOT NULL DEFAULT 0,
      weapon_category TEXT
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
    INSERT INTO items VALUES
      ('iron_ore', 0, NULL),
      ('golden_stripe_eel', 1, NULL),
      ('rough_dummy_one', 1, NULL),
      ('rough_dummy_two', 1, NULL),
      ('driftscale_catfish', 0, NULL),
      ('worn_rucksack', 0, NULL),
      ('rusty_rod', 0, 'Fishing Rod'),
      ('gilded_rod', 4, 'Fishing Rod');
    INSERT INTO gathering_resources (id, name, item_reward_amount, is_radiant_spark, is_fishing_spot, level, tool_required_id) VALUES
      ('iron_node', 'Iron Node', 3, 0, 0, 0, NULL),
      ('rough_fishing_spot', 'Rough Fishing Spot', 0, 0, 1, 1, 'rusty_rod');
    UPDATE gathering_resources SET item_reward_id = 'iron_ore' WHERE id = 'iron_node';
    INSERT INTO gathering_resource_spawns VALUES
      ('rough_fishing_spot_lone_lands_-10_0', 'rough_fishing_spot', 'lone_lands'),
      ('rough_fishing_spot_lone_lands_20_30', 'rough_fishing_spot', 'lone_lands'),
      ('rough_fishing_spot_crescent_coast_40_-50', 'rough_fishing_spot', 'crescent_coast');
    INSERT INTO fish VALUES
      ('driftscale_catfish', 0),
      ('rough_dummy_one', 0),
      ('rough_dummy_two', 0),
      ('worn_rucksack', 1);
    INSERT INTO item_sources_gather VALUES
      ('iron_ore', 'iron_node', 1.0, 1.0),
      ('golden_stripe_eel', 'rough_fishing_spot', 0.2, 0.0666666667),
      ('rough_dummy_one', 'rough_fishing_spot', 0.2, 0.0666666667),
      ('rough_dummy_two', 'rough_fishing_spot', 0.2, 0.0666666667);
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
  test("random gather drops do not inherit the primary reward quantity", () => {
    const db = createDb();
    db.exec(`
      INSERT INTO item_sources_gather VALUES ('gem', 'iron_node', 0.1, 0.025);
    `);
    expect(getGatherSources(db, "gem")[0]).toMatchObject({
      amount_min: 1,
      amount_max: 1,
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
          spawn_id: "rough_fishing_spot_lone_lands_-10_0",
          zone_id: "lone_lands",
          zone_name: "The Lone-lands",
          is_fishing_spot: 1,
          virtual_location_count: 1,
          fishing_source_role: "primary",
          amount_min: null,
          amount_max: null,
        }),
        expect.objectContaining({
          resource_id: "rough_fishing_spot",
          spawn_id: "rough_fishing_spot_lone_lands_20_30",
          zone_id: "lone_lands",
          zone_name: "The Lone-lands",
          is_fishing_spot: 1,
          virtual_location_count: 1,
          amount_min: null,
          amount_max: null,
        }),
        expect.objectContaining({
          resource_id: "rough_fishing_spot",
          spawn_id: "rough_fishing_spot_crescent_coast_40_-50",
          zone_id: "crescent_coast",
          zone_name: "Crescent Coast",
          is_fishing_spot: 1,
          virtual_location_count: 1,
          amount_min: null,
          amount_max: null,
        }),
      ]),
    );

    // per cast: floor success(rusty q0, 0%)=0.3 x 0.20/3 = 0.02 ;
    //           ceiling success(gilded q4, 100%)=1 x 0.76/3 = 0.2533
    const primary = sources.find(
      (s) => s.spawn_id === "rough_fishing_spot_lone_lands_-10_0",
    )!;
    expect(primary.fishing_chance_min).toBeCloseTo(0.02, 5);
    expect(primary.fishing_chance_max).toBeCloseTo(0.25333, 4);

    db.close();
  });

  test("adds virtual higher-tier fishing sources for lower-tier fallback fish", () => {
    const db = createDb();
    const sources = getGatherSources(db, "driftscale_catfish");

    expect(sources).toHaveLength(3);
    expect(sources[0]).toMatchObject({
      resource_id: "rough_fishing_spot",
      is_fishing_spot: 1,
      fishing_source_role: "fallback",
      virtual_location_count: 1,
      amount_min: null,
      amount_max: null,
    });
    expect(sources[0].fishing_chance_min).toBeCloseTo(0.108);
    expect(sources[0].fishing_chance_max).toBeCloseTo(0.108);

    db.close();
  });

  test("treats fishing trash as obtainable from each fishing spot instance", () => {
    const db = createDb();
    const sources = getGatherSources(db, "worn_rucksack");

    expect(sources).toHaveLength(3);
    expect(sources[0]).toMatchObject({
      resource_id: "rough_fishing_spot",
      is_fishing_spot: 1,
      fishing_source_role: "trash",
      virtual_location_count: 1,
      amount_min: null,
      amount_max: null,
    });
    expect(sources[0].fishing_chance_min).toBeCloseTo(0.024);
    expect(sources[0].fishing_chance_max).toBeCloseTo(0.024);

    db.close();
  });
});

test("boss sources expose per-kill chances without replacing configured roll chances", () => {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE monsters (
      id TEXT, name TEXT, level INTEGER, level_min INTEGER, level_max INTEGER,
      is_boss INTEGER, is_fabled INTEGER, is_elite INTEGER, loot_inputs TEXT
    );
    CREATE TABLE item_sources_monster (item_id TEXT, monster_id TEXT, drop_rate REAL);
    CREATE TABLE monster_spawns (monster_id TEXT, zone_id TEXT);
    CREATE TABLE zones (id TEXT, zone_id INTEGER, is_dungeon INTEGER);
    CREATE TABLE items (luck_token_zone_id TEXT, luck_token_bonus INTEGER);
    INSERT INTO monster_spawns VALUES ('boss', 'dungeon');
    INSERT INTO zones VALUES ('dungeon', 1, 1);
    INSERT INTO items VALUES ('dungeon', 1);
    INSERT INTO item_sources_monster VALUES ('helm', 'boss', 0.5);
  `);
  db.prepare("INSERT INTO monsters VALUES (?, ?, 50, 50, 50, 1, 0, 0, ?)").run(
    "boss",
    "Boss",
    JSON.stringify([
      {
        item_id: "helm",
        item_name: "Helm",
        probability: 0.5,
        counts_as_equipment: true,
        requires_quest: false,
      },
      {
        item_id: "boots",
        item_name: "Boots",
        probability: 0.5,
        counts_as_equipment: true,
        requires_quest: false,
      },
    ]),
  );
  const [source] = getMonsterSources(db, "helm");
  expect(source.drop_rate).toBe(0.5);
  expect(source.per_kill_chance).toBeCloseTo(0.625);
  expect(source.per_kill_chance_with_fatecharm).toBeGreaterThan(
    source.per_kill_chance!,
  );
  db.exec("UPDATE zones SET is_dungeon = 0");
  expect(
    getMonsterSources(db, "helm")[0].per_kill_chance_with_fatecharm,
  ).toBeUndefined();
  db.exec(
    "INSERT INTO item_sources_monster VALUES ('distribution', 'boss', 0.25)",
  );
  db.prepare("UPDATE monsters SET loot_inputs = ?").run(
    JSON.stringify([
      {
        item_id: "distribution",
        item_name: "Distribution",
        probability: 0.25,
        counts_as_equipment: false,
        requires_quest: false,
        random_items: [{ item_id: "helm", counts_as_equipment: true }],
      },
    ]),
  );
  const [distribution] = getMonsterSources(db, "distribution");
  expect(distribution).toMatchObject({
    drop_rate: 0.25,
    is_distribution_roll: true,
  });
  expect(distribution.per_kill_chance).toBeUndefined();
  db.close();
});

test("container source queries use canonical reachability without losing contents", () => {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE items (id TEXT PRIMARY KEY, name TEXT, quality INTEGER);
    CREATE TABLE item_sources_pack (item_id TEXT, pack_item_id TEXT, amount INTEGER);
    CREATE TABLE item_sources_random (item_id TEXT, random_item_id TEXT, probability REAL);
    CREATE TABLE item_source_entries (item_id TEXT, source_type TEXT, source_id TEXT);
    INSERT INTO items VALUES
      ('gem', 'Gem', 1), ('reachable', 'Reachable', 1),
      ('unreachable', 'Unreachable', 1);
    INSERT INTO item_sources_pack VALUES
      ('gem', 'reachable', 1), ('gem', 'unreachable', 1);
    INSERT INTO item_sources_random VALUES
      ('gem', 'reachable', 0.5), ('gem', 'unreachable', 1);
    INSERT INTO item_source_entries VALUES
      ('gem', 'pack', 'reachable'), ('gem', 'random', 'reachable');
  `);

  expect(
    getPackSources(db, "gem").map((source) => source.pack_item_id),
  ).toEqual(["reachable"]);
  expect(
    getRandomSources(db, "gem").map((source) => source.random_item_id),
  ).toEqual(["reachable"]);
  expect(
    db.prepare("SELECT COUNT(*) count FROM item_sources_pack").get(),
  ).toEqual({ count: 2 });
  expect(
    db.prepare("SELECT COUNT(*) count FROM item_sources_random").get(),
  ).toEqual({ count: 2 });
  db.close();
});

test("chest item sources retain roll competition and omit unreachable containers", () => {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE items (id TEXT PRIMARY KEY, name TEXT, quality INTEGER DEFAULT 0,
      tooltip_html TEXT, item_type TEXT, relic_buff_id TEXT, relic_buff_name TEXT, chest_num_items INTEGER DEFAULT 0);
    CREATE TABLE chest_item_rewards (chest_item_id TEXT, item_id TEXT, roll_order INTEGER,
      roll_chance REAL, scales_with_treasure_hunter INTEGER);
    CREATE TABLE item_source_entries (item_id TEXT, source_type TEXT, source_id TEXT);
    INSERT INTO items (id, name, chest_num_items) VALUES
      ('reachable', 'Reachable', 1), ('unreachable', 'Unreachable', 1),
      ('gem', 'Gem', 0), ('other', 'Other', 0);
    INSERT INTO chest_item_rewards VALUES
      ('reachable', 'other', 0, 0.5, 1), ('reachable', 'gem', 1, 1, 0),
      ('unreachable', 'gem', 0, 1, 0);
    INSERT INTO item_source_entries VALUES ('gem', 'random', 'reachable');
  `);
  const sources = getChestItemSources(db, "gem");
  expect(sources).toHaveLength(1);
  expect(sources[0]).toMatchObject({
    chest_item_id: "reachable",
    item_id: "gem",
    open_chance: 0.5,
    chest_scales_with_treasure_hunter: true,
  });
  expect(
    db.prepare("SELECT COUNT(*) count FROM chest_item_rewards").get(),
  ).toEqual({ count: 3 });
  db.close();
});

import Database from "better-sqlite3";
import { describe, expect, test } from "vitest";
import type { ItemSourceType } from "$lib/constants/source-types";
import { loadFishingPageData } from "./fishing-page-data.server";

function createDb() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE professions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT NOT NULL,
      max_level INTEGER DEFAULT 100,
      steam_achievement_id TEXT,
      steam_achievement_name TEXT
    );
    CREATE TABLE items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      quality INTEGER DEFAULT 0,
      level_required INTEGER DEFAULT 0,
      tooltip_html TEXT,
      weapon_category TEXT,
      slot TEXT,
      food_buff_id TEXT,
      food_buff_name TEXT,
      potion_buff_id TEXT,
      potion_buff_name TEXT
    );
    CREATE TABLE fish (
      item_id TEXT PRIMARY KEY,
      is_trash INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE zones (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
    CREATE TABLE gathering_resources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      level INTEGER DEFAULT 0,
      tool_required_id TEXT,
      is_fishing_spot INTEGER NOT NULL DEFAULT 0
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
    CREATE TABLE item_usages_recipe (
      item_id TEXT NOT NULL,
      recipe_id TEXT NOT NULL,
      recipe_type TEXT NOT NULL,
      amount INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE crafting_recipes (
      id TEXT PRIMARY KEY,
      result_item_id TEXT NOT NULL,
      station_type TEXT
    );
    CREATE TABLE alchemy_recipes (
      id TEXT PRIMARY KEY,
      result_item_id TEXT NOT NULL
    );
    CREATE TABLE item_source_entries (
      item_id TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      source_name TEXT NOT NULL,
      source_level INTEGER,
      source_sort_name TEXT NOT NULL
    );
  `);
  db.exec(`
    INSERT INTO professions VALUES
      ('fishing', 'Fishing', 'Catch fish.', 'gathering', 100, NULL, NULL);

    INSERT INTO items VALUES
      ('rusty_fishing_rod', 'Rusty Fishing Rod', 0, 1, '<p>rod</p>', 'Fishing Rod', 'Fishing Rod', NULL, NULL, NULL, NULL),
      ('bamboo_fishing_rod', 'Bamboo Fishing Rod', 1, 1, '<p>bamboo rod</p>', 'Fishing Rod', 'Fishing Rod', NULL, NULL, NULL, NULL),
      ('gilded_wyrmhook', 'Gilded Wyrmhook', 4, 1, '<p>wyrmhook</p>', 'Fishing Rod', 'Fishing Rod', NULL, NULL, NULL, NULL),
      ('fishermans_garb', 'Fisherman''s Garb', 0, 1, '<p>garb</p>', NULL, 'Chest', NULL, NULL, NULL, NULL),
      ('fishermans_hat', 'Fisherman''s Hat', 0, 1, '<p>hat</p>', NULL, 'Head', NULL, NULL, NULL, NULL),
      ('fishermans_trousers', 'Fisherman''s Trousers', 0, 1, '<p>trousers</p>', NULL, 'Legs', NULL, NULL, NULL, NULL),
      ('cooking_fish', 'Cooking Fish', 0, 1, '<p>cook fish</p>', NULL, NULL, NULL, NULL, NULL, NULL),
      ('alchemy_fish', 'Alchemy Fish', 0, 1, '<p>alchemy fish</p>', NULL, NULL, NULL, NULL, NULL, NULL),
      ('trash_fish', 'Trash Fish', 0, 1, '<p>trash</p>', NULL, NULL, NULL, NULL, NULL, NULL),
      ('fish_chowder', 'Fish Chowder', 0, 1, '<p>food</p>', NULL, NULL, 'fish_chowder_buff', 'Fish Chowder Buff', NULL, NULL),
      ('fish_potion', 'Fish Potion', 0, 1, '<p>potion</p>', NULL, NULL, NULL, NULL, 'fish_potion_buff', 'Fish Potion Buff');

    INSERT INTO fish VALUES
      ('cooking_fish', 0),
      ('alchemy_fish', 0),
      ('trash_fish', 1);

    ALTER TABLE items ADD COLUMN comments TEXT DEFAULT '';
    INSERT INTO zones VALUES ('zone_a', 'Zone A');
    INSERT INTO gathering_resources VALUES
      ('rough_fishing_spot', 'Rough Fishing Spot', 1, 'rusty_fishing_rod', 1);
    INSERT INTO gathering_resource_spawns VALUES
      ('spawn_1', 'rough_fishing_spot', 'zone_a'),
      ('spawn_2', 'rough_fishing_spot', 'zone_a');
    INSERT INTO item_sources_gather VALUES
      ('cooking_fish', 'rough_fishing_spot', 0.2, 0.0666666667),
      ('alchemy_fish', 'rough_fishing_spot', 0.2, 0.0666666667),
      ('trash_fish', 'rough_fishing_spot', 0.2, 0.0666666667);
    INSERT INTO item_source_entries VALUES
      ('rusty_fishing_rod', 'vendor', 'rod_vendor', 'Rod Vendor', 1, 'Rod Vendor'),
      ('bamboo_fishing_rod', 'drop', 'rod_monster', 'Rod Monster', 40, 'Rod Monster'),
      ('gilded_wyrmhook', 'drop', 'lesser_wyrm', 'Lesser Wyrm', 55, 'Lesser Wyrm'),
      ('gilded_wyrmhook', 'drop', 'wyrm_boss', 'Wyrm Boss', 60, 'Wyrm Boss');

    INSERT INTO item_usages_recipe VALUES
      ('cooking_fish', 'fish_chowder_recipe', 'crafting', 2),
      ('alchemy_fish', 'fish_potion_recipe', 'alchemy', 1);
    INSERT INTO crafting_recipes VALUES
      ('fish_chowder_recipe', 'fish_chowder', 'cooking');
    INSERT INTO alchemy_recipes VALUES
      ('fish_potion_recipe', 'fish_potion');
  `);
  return db;
}

describe("loadFishingPageData", () => {
  test("loads fishing equipment and trash fish metadata", () => {
    const db = createDb();
    const data = loadFishingPageData(db);

    expect(data.rods.map((rod) => rod.item_id)).toEqual([
      "rusty_fishing_rod",
      "bamboo_fishing_rod",
      "gilded_wyrmhook",
    ]);
    expect(data.rods[2]).toMatchObject({
      item_id: "gilded_wyrmhook",
      quality: 4,
      min_source_level: 55,
      tooltip_html: expect.any(String),
      sources: [
        {
          type: "drop" satisfies ItemSourceType,
          id: "lesser_wyrm",
          name: "Lesser Wyrm",
          source_level: 55,
        },
        {
          type: "drop" satisfies ItemSourceType,
          id: "wyrm_boss",
          name: "Wyrm Boss",
          source_level: 60,
        },
      ],
    });
    expect(data.stats.rod_count).toBe(3);
    expect(data).not.toHaveProperty("rod");
    expect(data).not.toHaveProperty("recipes");
    expect(data.stats).not.toHaveProperty("zone_count");
    expect(data.spots[0]).not.toHaveProperty("zone_count");
    expect(data.stats.spot_count).toBe(2);
    expect(data.costumePieces.map((item) => item.item_id)).toEqual([
      "fishermans_garb",
      "fishermans_hat",
      "fishermans_trousers",
    ]);
    expect(data.trashFish.map((fish) => fish.item_id)).toEqual(["trash_fish"]);
    expect(data.trashFish[0]).toMatchObject({
      item_id: "trash_fish",
      item_name: "Trash Fish",
      tooltip_html: expect.any(String),
    });
    expect(data.trashFish[0]).not.toHaveProperty("cooking_recipe_count");
    expect(data.trashFish[0]).not.toHaveProperty("alchemy_recipe_count");
    expect(data.foods[0]).toMatchObject({
      result_item_id: "fish_chowder",
      effect_skill_id: "fish_chowder_buff",
      result_tooltip_html: expect.any(String),
      ingredient_tooltip_html: expect.any(String),
    });
    expect(data.potions[0]).toMatchObject({
      result_item_id: "fish_potion",
      effect_skill_id: "fish_potion_buff",
      result_tooltip_html: expect.any(String),
      ingredient_tooltip_html: expect.any(String),
    });
    expect(data.costumePieces).toHaveLength(3);
    expect(data.trashFish[0]).not.toHaveProperty("qualityLabel");

    db.close();
  });
});

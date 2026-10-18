import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { loadFishingPageData } from "./fishing-page-data.server";
import {
  BASELINE_ASSUMPTIONS,
  calculateMethodProbabilities,
} from "$lib/acquisition/rules";
import { fishDropChancePerSuccessfulHook } from "$lib/utils/fishing";

function createDb() {
  const db = new Database(":memory:");
  db.exec(readFileSync("../build-pipeline/schema.sql", "utf8"));
  db.exec(`
    INSERT INTO achievements (id, name, description, display_order) VALUES ('FISHER_MASTER', 'Master Angler', 'Catch fish.', 0);
    INSERT INTO professions (id, name, description, category, max_level, achievement_id, tracking_type)
      VALUES ('fishing', 'Fishing', 'Catch fish.', 'gathering', 100, 'FISHER_MASTER', 'float_level');
    INSERT INTO skills (id, name, skill_type) VALUES
      ('fish_chowder_buff', 'Fish Chowder Buff', 'buff'),
      ('fish_potion_buff', 'Fish Potion Buff', 'buff');
    INSERT INTO items (id, name, quality, level_required, tooltip_html, weapon_category, slot, food_buff_id, food_buff_name, potion_buff_id, potion_buff_name) VALUES
      ('rusty_fishing_rod', 'Rusty Fishing Rod', 0, 1, '<p>rod</p>', 'Fishing Rod', 'Fishing Rod', NULL, NULL, NULL, NULL),
      ('crafted_fishing_rod', 'Crafted Fishing Rod', 2, 35, '<p>crafted rod</p>', 'Fishing Rod', 'Fishing Rod', NULL, NULL, NULL, NULL),
      ('fishermans_garb', 'Fisherman''s Garb', 0, 1, '<p>garb</p>', NULL, 'Chest', NULL, NULL, NULL, NULL),
      ('fishermans_hat', 'Fisherman''s Hat', 0, 1, '<p>hat</p>', NULL, 'Head', NULL, NULL, NULL, NULL),
      ('fishermans_trousers', 'Fisherman''s Trousers', 0, 1, '<p>trousers</p>', NULL, 'Legs', NULL, NULL, NULL, NULL),
      ('cooking_fish', 'Cooking Fish', 0, 1, '<p>cook fish</p>', NULL, NULL, NULL, NULL, NULL, NULL),
      ('alchemy_fish', 'Alchemy Fish', 1, 1, '<p>alchemy fish</p>', NULL, NULL, NULL, NULL, NULL, NULL),
      ('trash_fish', 'Trash Fish', 0, 1, '<p>trash</p>', NULL, NULL, NULL, NULL, NULL, NULL),
      ('fish_chowder', 'Fish Chowder', 0, 1, '<p>food</p>', NULL, NULL, 'fish_chowder_buff', 'Fish Chowder Buff', NULL, NULL),
      ('fish_potion', 'Fish Potion', 0, 1, '<p>potion</p>', NULL, NULL, NULL, NULL, 'fish_potion_buff', 'Fish Potion Buff'),
      ('ember_prawn', 'Ember Prawn', 3, 1, '<p>prawn</p>', NULL, NULL, NULL, NULL, NULL, NULL),
      ('firecoil_worm', 'Firecoil Worm', 3, 1, '<p>worm</p>', NULL, NULL, NULL, NULL, NULL, NULL),
      ('dragonbait_stew', 'Dragonbait Stew', 4, 54, '<p>stew</p>', NULL, NULL, NULL, NULL, NULL, NULL);
    INSERT INTO fish VALUES ('cooking_fish', 0), ('alchemy_fish', 0), ('trash_fish', 1), ('ember_prawn', 0), ('firecoil_worm', 0);
    INSERT INTO zones (id, zone_id, name) VALUES ('zone_a', 0, 'Zone A');
    INSERT INTO gathering_resources (id, name, level, tool_required_id, is_fishing_spot)
      VALUES ('rough_fishing_spot', 'Rough Fishing Spot', 1, 'rusty_fishing_rod', 1);
    INSERT INTO gathering_resource_spawns (id, resource_id, zone_id) VALUES
      ('spawn_1', 'rough_fishing_spot', 'zone_a'), ('spawn_2', 'rough_fishing_spot', 'zone_a');
    INSERT INTO acquisition_methods (id, kind, rule_id, rooted, source_level_hint) VALUES
      ('fishing', 'gather', 'fishing', 1, NULL),
      ('rod_offer', 'vendor', 'vendor', 1, 1),
      ('rod_recipe', 'recipe', 'crafting', 1, 35),
      ('food_method', 'recipe', 'cooking', 0, NULL),
      ('stew_method', 'recipe', 'cooking', 0, NULL),
      ('potion_method', 'recipe', 'alchemy', 0, NULL);
    INSERT INTO acquisition_resource_details VALUES ('fishing', 'rough_fishing_spot', 'fishing', 1, 0, 0);
    INSERT INTO acquisition_providers_resource_spawns VALUES
      ('provider_1', 'fishing', 'spawn_1', NULL), ('provider_2', 'fishing', 'spawn_2', NULL);
    INSERT INTO loot_pools VALUES ('primary', 'fishing_primary'), ('trash', 'fishing_trash'), ('fallback', 'fishing_fallback');
    INSERT INTO acquisition_method_pools VALUES ('spot_pool', 'fishing', 'primary', 0, 'successful_hook');
    INSERT INTO loot_fishing_rules VALUES ('fishing_rule', 'primary', 'trash', 'fallback', 1);
    INSERT INTO acquisition_method_fishing_rules VALUES ('fishing', 'fishing', 'fishing_rule');
    INSERT INTO loot_pool_entries (id, pool_id, ordinal, item_id, resolution, probability, duplicate_group, cap, counts_equipment, guaranteed_equipment_candidate, quest_gate, scales_with_treasure_hunter, quality) VALUES
      ('cook', 'primary', 0, 'cooking_fish', 'direct', 0.2, 0, 1, 0, 0, 'none', 0, 0),
      ('alchemy', 'primary', 1, 'alchemy_fish', 'direct', 0.2, 1, 1, 0, 0, 'none', 0, 1),
      ('trash_entry', 'trash', 0, 'trash_fish', 'direct', 1, 0, 1, 0, 0, 'none', 0, 0),
      ('fallback_cook', 'fallback', 0, 'cooking_fish', 'direct', 1, 0, 1, 0, 0, 'none', 0, 0),
      ('fallback_alchemy', 'fallback', 1, 'alchemy_fish', 'direct', 1, 1, 1, 0, 0, 'none', 0, 1),
      ('fallback_prawn', 'fallback', 2, 'ember_prawn', 'direct', 1, 2, 1, 0, 0, 'none', 0, 3),
      ('fallback_worm', 'fallback', 3, 'firecoil_worm', 'direct', 1, 3, 1, 0, 0, 'none', 0, 3);
    INSERT INTO npcs (id, name) VALUES ('rod_vendor', 'Rod Vendor');
    INSERT INTO npc_spawns (id, npc_id, zone_id) VALUES ('vendor_spawn', 'rod_vendor', 'zone_a');
    INSERT INTO crafting_stations (id, name, zone_id) VALUES ('rod_station', 'Rod Station', 'zone_a');
    INSERT INTO acquisition_providers_crafting_stations VALUES ('rod_station_provider', 'rod_recipe', 'rod_station', 0);
    INSERT INTO acquisition_vendor_details VALUES ('rod_offer', 'rod_vendor', 'rusty_fishing_rod', 'none');
    INSERT INTO acquisition_providers_npcs VALUES ('rod_provider', 'rod_offer', 'rod_vendor', 0);
    INSERT INTO crafting_recipes VALUES ('crafted_fishing_rod_recipe', 'crafted_fishing_rod'), ('fish_chowder_recipe', 'fish_chowder'), ('dragonbait_stew_recipe', 'dragonbait_stew');
    INSERT INTO alchemy_recipes VALUES ('fish_potion_recipe', 'fish_potion');
    INSERT INTO acquisition_recipe_details VALUES
      ('rod_recipe', 'crafted_fishing_rod_recipe', NULL, NULL, 'crafted_fishing_rod', 1, 2, 'crafting', 0),
      ('food_method', 'fish_chowder_recipe', NULL, NULL, 'fish_chowder', 1, 0, 'cooking', 0),
      ('stew_method', 'dragonbait_stew_recipe', NULL, NULL, 'dragonbait_stew', 1, 4, 'cooking', 0),
      ('potion_method', NULL, 'fish_potion_recipe', NULL, 'fish_potion', 1, 0, 'alchemy', 0);
    INSERT INTO acquisition_outputs (id, method_id, ordinal, resource_kind, item_id, amount_min, amount_max, yield_rule, delivery) VALUES
      ('rod_sale', 'rod_offer', 0, 'item', 'rusty_fishing_rod', 1, 1, 'fixed', 'inventory'),
      ('rod_crafted', 'rod_recipe', 0, 'item', 'crafted_fishing_rod', 1, 1, 'fixed', 'inventory');
    INSERT INTO acquisition_cost_groups VALUES
      ('food_cost', 'food_method', 'attempt', 'fixed', 'on_success', 'always'),
      ('stew_cost', 'stew_method', 'attempt', 'fixed', 'on_success', 'always'),
      ('potion_cost', 'potion_method', 'attempt', 'fixed', 'on_success', 'always');
    INSERT INTO acquisition_inputs (id, cost_group_id, ordinal, resource_kind, item_id, amount, role) VALUES
      ('food_fish', 'food_cost', 0, 'item', 'cooking_fish', 2, 'material'),
      ('stew_prawn', 'stew_cost', 0, 'item', 'ember_prawn', 1, 'material'),
      ('stew_worm', 'stew_cost', 1, 'item', 'firecoil_worm', 1, 'material'),
      ('potion_fish', 'potion_cost', 0, 'item', 'alchemy_fish', 1, 'material');
  `);
  return db;
}

describe("loadFishingPageData", () => {
  test("loads canonical rod methods, fishing pools, and recipe inputs", async () => {
    const db = createDb();
    try {
      const data = await loadFishingPageData(db);
      expect(data.rods.map((rod) => rod.item_id)).toEqual([
        "rusty_fishing_rod",
        "crafted_fishing_rod",
      ]);
      expect(data.rods[0]).toMatchObject({
        min_source_level: 1,
        sources: [{ kind: "vendor", methodId: "rod_offer" }],
      });
      expect(data.rods[1]).toMatchObject({
        min_source_level: 35,
        sources: [{ kind: "recipe", methodId: "rod_recipe" }],
      });
      expect(data.stats.spot_count).toBe(2);
      expect(data.spots.map((spot) => spot.id)).toEqual(["spawn_1", "spawn_2"]);
      expect(data.spots[0].drops.map((drop) => drop.item_id)).toEqual([
        "alchemy_fish",
        "cooking_fish",
      ]);
      expect(
        data.spots[0].drops.every((drop) => drop.configured_drop_rate === 0.2),
      ).toBe(true);
      expect(data.costumePieces).toHaveLength(3);
      expect(data.trashFish).toMatchObject([
        { item_id: "trash_fish", tooltip_html: "<p>trash</p>" },
      ]);
      expect(data.fishPoolsByQuality[0].map((fish) => fish.item_id)).toEqual([
        "cooking_fish",
      ]);
      expect(data.foods[0]).toMatchObject({
        result_item_id: "fish_chowder",
        effect_skill_id: "fish_chowder_buff",
        ingredients: [{ item_id: "cooking_fish", amount: 2 }],
      });
      expect(data.foods[1]).toMatchObject({
        result_item_id: "dragonbait_stew",
        ingredients: [
          { item_id: "ember_prawn", amount: 1 },
          { item_id: "firecoil_worm", amount: 1 },
        ],
      });
      expect(data.potions[0]).toMatchObject({
        result_item_id: "fish_potion",
        effect_skill_id: "fish_potion_buff",
        ingredients: [{ item_id: "alchemy_fish", amount: 1 }],
      });
    } finally {
      db.close();
    }
  });
  test("preserves anonymous primary slots in shared fishing evaluation", async () => {
    const db = createDb();
    try {
      db.exec(`INSERT INTO loot_pool_entries
        (id, pool_id, ordinal, resolution, probability, duplicate_group, cap, counts_equipment, guaranteed_equipment_candidate, quest_gate, scales_with_treasure_hunter, quality, withheld)
        VALUES ('anonymous', 'primary', 2, 'direct', 0.2, 2, 1, 0, 0, 'none', 0, 1, 1)`);
      const data = await loadFishingPageData(db);
      expect(data.spots[0].drops).toHaveLength(2);
      expect(
        data.spotAcquisitionRows.poolEntries.filter(
          (entry) => entry.pool_id === "primary",
        ),
      ).toHaveLength(3);
      const method = data.spotMethods[0];
      const results = calculateMethodProbabilities(
        data.spotAcquisitionRows,
        data.spotAcquisitionRows.methods.find(
          (row) => row.id === method.methodId,
        )!,
        method.detail,
        {
          assumptions: {
            ...BASELINE_ASSUMPTIONS,
            scenario: "entered",
            professionFraction: 0.4,
            toolQuality: 2,
          },
        },
      );
      expect(
        results.find(
          (result) =>
            result.event === "successful_hook" &&
            result.target.kind === "item" &&
            result.target.itemId === "alchemy_fish",
        )?.probability,
      ).toBeCloseTo(
        fishDropChancePerSuccessfulHook({
          configuredDropRate: 0.2,
          fishCountAtSpot: 3,
          fishingPercent: 40,
          fishermanCostumePieces: 0,
        }),
      );
    } finally {
      db.close();
    }
  });
});

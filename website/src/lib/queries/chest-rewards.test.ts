import Database from "better-sqlite3";
import { describe, expect, test } from "vitest";
import { calculateChestRewards } from "$lib/calculation/chest-rewards";
import {
  assembleChests,
  CHEST_REWARDS_QUERY,
  type ChestRewardRow,
} from "./chest-rewards";

describe("canonical portable chest rows", () => {
  test("retains anonymous slots and canonical duplicate groups before calculating the award cap", () => {
    const db = new Database(":memory:");
    try {
      db.exec(`
        CREATE TABLE items (id TEXT, name TEXT, quality INTEGER, tooltip_html TEXT, item_type TEXT, relic_buff_id TEXT, relic_buff_name TEXT);
        CREATE TABLE item_pool_definitions (item_id TEXT, pool_id TEXT);
        CREATE TABLE loot_chest_rules (pool_id TEXT, num_items INTEGER);
        CREATE TABLE loot_pool_entries (id TEXT, pool_id TEXT, item_id TEXT, ordinal INTEGER, probability REAL, duplicate_group INTEGER, scales_with_treasure_hunter INTEGER, withheld INTEGER);
        INSERT INTO items VALUES ('chest', 'Chest', 0, NULL, NULL, NULL, NULL), ('reward', 'Reward', 0, NULL, NULL, NULL, NULL);
        INSERT INTO item_pool_definitions VALUES ('chest', 'pool');
        INSERT INTO loot_chest_rules VALUES ('pool', 2);
        INSERT INTO loot_pool_entries VALUES
          ('hidden_a', 'pool', NULL, 0, 1, 0, 0, 1),
          ('hidden_b', 'pool', NULL, 1, 1, 0, 0, 1),
          ('visible', 'pool', 'reward', 2, 1, 1, 0, 0);
      `);
      const rows = db
        .prepare(`${CHEST_REWARDS_QUERY} ORDER BY entry.ordinal`)
        .all() as ChestRewardRow[];
      expect(rows).toHaveLength(3);
      expect(rows[0].withheld).toBe(1);
      expect(rows[0].item_name).toBe(rows[1].item_name);
      const [chest] = assembleChests(rows);
      const calculated = calculateChestRewards(chest, 0);
      expect(
        calculated.find((reward) => reward.item_id === "reward")?.open_chance,
      ).toBe(1);
      expect(
        calculated.find((reward) => reward.item_id === "reward")?.display_name,
      ).toBe("Reward");
    } finally {
      db.close();
    }
  });
});

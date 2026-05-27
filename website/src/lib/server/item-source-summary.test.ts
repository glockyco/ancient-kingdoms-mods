import Database from "better-sqlite3";
import { describe, expect, test } from "vitest";
import { getItemSourceSummaries } from "./item-source-summary";

function createDb() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      comments TEXT DEFAULT ''
    );
    CREATE TABLE fish (
      item_id TEXT PRIMARY KEY,
      is_trash INTEGER NOT NULL DEFAULT 0
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
    INSERT INTO items VALUES
      ('worn_rucksack', 'Worn Rucksack', ''),
      ('ironjaw_catfish', 'Ironjaw Catfish', ''),
      ('worn_backpack', 'Worn Backpack', 'Starter backpack.'),
      ('hand_made_backpack', 'Hand Made Backpack', '');
    INSERT INTO fish VALUES
      ('worn_rucksack', 1),
      ('ironjaw_catfish', 0);
    INSERT INTO item_source_entries VALUES
      ('worn_rucksack', 'drop', 'infernal_skeleton', 'Infernal Skeleton', 10, 'Infernal Skeleton'),
      ('hand_made_backpack', 'vendor', 'alias_daehorn', 'Alais Daehorn', 1, 'Alais Daehorn');
  `);
  return db;
}

describe("getItemSourceSummaries", () => {
  test("adds virtual fishing and starter sources", () => {
    const db = createDb();
    const summaries = getItemSourceSummaries(db, [
      "worn_rucksack",
      "ironjaw_catfish",
      "worn_backpack",
      "hand_made_backpack",
    ]);

    expect(summaries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          item_id: "worn_rucksack",
          type: "fishing",
          id: "fishing",
          name: "Fishing",
        }),
        expect.objectContaining({
          item_id: "worn_backpack",
          type: "starter",
          id: "worn_backpack",
          name: "New character",
        }),
        expect.objectContaining({
          item_id: "hand_made_backpack",
          type: "vendor",
          id: "alias_daehorn",
        }),
      ]),
    );

    expect(summaries).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          item_id: "ironjaw_catfish",
          type: "fishing",
        }),
      ]),
    );

    db.close();
  });
});

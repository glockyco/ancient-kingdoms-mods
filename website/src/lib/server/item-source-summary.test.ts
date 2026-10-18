import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import {
  getItemSourceSummaries,
  getMinimumSourceLevel,
  groupItemSourceSummaries,
} from "./item-source-summary";

test("starter summaries use the creation bundle instead of comment guesses", async () => {
  const db = new Database(":memory:");
  db.exec(
    readFileSync(
      new URL("../../../../build-pipeline/schema.sql", import.meta.url),
      "utf8",
    ),
  );
  try {
    db.exec(`
      INSERT INTO items (id,name,item_type,quality,comments) VALUES
        ('backpack','Worn Backpack','backpack',0,''),
        ('fake','Handmade Backpack','backpack',0,'Starter backpack');
      INSERT INTO classes (id,name,description,primary_role,difficulty,resource_type,compatible_races)
        VALUES ('warrior','Warrior','','tank',1,'rage','[]');
      INSERT INTO acquisition_methods (id,kind,rule_id,rooted) VALUES ('creation','creation','creation',1);
      INSERT INTO acquisition_creation_details (id,class_id) VALUES ('creation','warrior');
      INSERT INTO acquisition_global_roots (id,method_id,origin) VALUES ('creation','creation','creation');
      INSERT INTO acquisition_outputs
        (id,method_id,ordinal,resource_kind,item_id,amount_min,amount_max,yield_rule,delivery)
      VALUES ('backpack','creation',0,'item','backpack',1,1,'fixed','inventory');
    `);
    const rows = await getItemSourceSummaries(db, ["backpack", "fake"]);
    expect(rows).toContainEqual(
      expect.objectContaining({
        item_id: "backpack",
        type: "starter",
        name: "New character",
      }),
    );
    expect(rows.some((row) => row.item_id === "fake")).toBe(false);
  } finally {
    db.close();
  }
});

test("unrooted inventory cycles do not acquire summary sources", async () => {
  const db = new Database(":memory:");
  db.exec(
    readFileSync(
      new URL("../../../../build-pipeline/schema.sql", import.meta.url),
      "utf8",
    ),
  );
  try {
    db.exec(`
      INSERT INTO items (id,name,item_type,quality) VALUES ('pack','Pack','pack',0), ('gem','Gem','general',1);
      INSERT INTO acquisition_methods (id,kind,rule_id,rooted) VALUES ('pack-use','pack_use','pack_use',0);
      INSERT INTO acquisition_item_details (id,item_id) VALUES ('pack-use','pack');
      INSERT INTO acquisition_providers_items (id,method_id,item_id) VALUES ('pack','pack-use','pack');
      INSERT INTO acquisition_outputs
        (id,method_id,ordinal,resource_kind,item_id,amount_min,amount_max,yield_rule,delivery)
        VALUES ('gem','pack-use',0,'item','gem',1,1,'fixed','inventory');
    `);
    expect(await getItemSourceSummaries(db, ["gem"])).toEqual([]);
  } finally {
    db.close();
  }
});

test("grouped source levels keep unknown distinct from zero", () => {
  const rows = [
    {
      item_id: "one",
      type: "drop" as const,
      id: "monster",
      name: "Monster",
      source_level: 10,
    },
    {
      item_id: "two",
      type: "special" as const,
      id: "service",
      name: "Service",
      source_level: null,
    },
    {
      item_id: "one",
      type: "gather" as const,
      id: "node",
      name: "Node",
      source_level: 0,
    },
  ];
  const grouped = groupItemSourceSummaries(rows);
  expect(getMinimumSourceLevel(grouped.get("one")!)).toBe(0);
  expect(getMinimumSourceLevel(grouped.get("two")!)).toBeNull();
  expect(getMinimumSourceLevel([])).toBeNull();
});

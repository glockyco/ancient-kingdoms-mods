import { test } from "vitest";
import assert from "node:assert/strict";
import { itemDescription } from "./meta-description.ts";
import type { Item } from "$lib/queries/items";
import Database from "better-sqlite3";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import { getItemSourcesFromModel, loadItemSourceModel } from "./item-sources";
import { projectItemSeasons } from "$lib/acquisition/projections";

for (const [id, expected] of [
  [
    "festive_cookie",
    [
      "Sold by repair merchants during the Winter Festival for 1 Winter Festival Coin.",
    ],
  ],
  ["spook_token", ["Dropped by Pumpkin Head and Witch during Halloween."]],
  [
    "winter_festival_coin",
    ["Winter Festival", "Pack 3 Winter Festival Coin", "3 per pack"],
  ],
] as const) {
  test(`${id} metadata states its seasonal acquisition`, async () => {
    const db = new Database(DB_SOURCE_PATH, { readonly: true });
    try {
      const item = db
        .prepare("SELECT * FROM items WHERE id = ?")
        .get(id) as Item;
      const model = await loadItemSourceModel(db, [id]);
      const out = itemDescription(item, {
        sources: await getItemSourcesFromModel(db, model, id),
        seasons: projectItemSeasons(model, id),
      });
      for (const phrase of expected) assert.ok(out.includes(phrase), out);
    } finally {
      db.close();
    }
  });
}

import Database from "better-sqlite3";
import { expect, test } from "vitest";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import { getItemSourceSummaries } from "./item-source-summary";

test("summaries retain seasons on drops, quest rewards and containing packs", async () => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });
  try {
    const rows = await getItemSourceSummaries(db, [
      "spook_token",
      "pack_3_festival_token",
      "winter_festival_coin",
    ]);
    expect(rows).toContainEqual(
      expect.objectContaining({
        item_id: "spook_token",
        type: "drop",
        id: "pumpkin_head",
        seasons: ["halloween"],
      }),
    );
    expect(rows).toContainEqual(
      expect.objectContaining({
        item_id: "pack_3_festival_token",
        type: "quest",
        id: "a_wish_for_the_winter_heart",
        seasons: ["christmas"],
      }),
    );
    expect(rows).toContainEqual(
      expect.objectContaining({
        item_id: "winter_festival_coin",
        type: "pack",
        seasons: ["christmas"],
      }),
    );
  } finally {
    db.close();
  }
});

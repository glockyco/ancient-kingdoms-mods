import Database from "better-sqlite3";
import { describe, expect, test } from "vitest";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import { getRecipeMaterials } from "./obtainability";

describe("recipe material reader", () => {
  test("returns named materials from the junction in stable item-name order", () => {
    const db = new Database(DB_SOURCE_PATH, { readonly: true });
    try {
      expect(
        getRecipeMaterials(db, "cold_resistance_potion", "alchemy"),
      ).toEqual([
        { item_id: "frostheart", item_name: "Frostheart", amount: 2 },
        { item_id: "mossback_perch", item_name: "Mossback Perch", amount: 1 },
      ]);
      expect(getRecipeMaterials(db, "advisor_robe", "crafting")).toEqual([
        {
          item_id: "advisor_robe_mold",
          item_name: "Advisor Robe Mold",
          amount: 1,
        },
        { item_id: "icevril_ore", item_name: "Icevril Ore", amount: 5 },
      ]);
      expect(getRecipeMaterials(db, "fire_nova_scroll", "scribing")).toEqual([
        { item_id: "rune_of_blood", item_name: "Rune of Blood", amount: 1 },
        {
          item_id: "words_of_destruction",
          item_name: "Words of Destruction",
          amount: 1,
        },
      ]);
    } finally {
      db.close();
    }
  });
});

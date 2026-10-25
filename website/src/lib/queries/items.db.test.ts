import Database from "better-sqlite3";
import { afterAll, expect, test } from "vitest";
import { ITEM_DETAIL_SELECT, type Item } from "./items";

const db = new Database("data/compendium.db", { readonly: true });
afterAll(() => db.close());

test("a recipe item names the item its recipe teaches", () => {
  const recipe = db
    .prepare(`${ITEM_DETAIL_SELECT} WHERE i.id = ?`)
    .get("cold_resistance_potion_recipe") as Item;
  expect(recipe.recipe_potion_learned_id).toBe("cold_resistance_potion");
  expect(recipe.recipe_potion_learned_name).toBe("Cold Resistance Potion");
});

import Database from "better-sqlite3";
import { describe, expect, test } from "vitest";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import { getItemIconPaths } from "./item-icon-paths";

describe("item icon availability", () => {
  test("distinguishes an item without an icon from a published icon", () => {
    const db = new Database(DB_SOURCE_PATH, { readonly: true });
    try {
      const paths = getItemIconPaths(db, [
        "helm_of_the_twilight",
        "frostheart",
      ]);
      expect(paths.helm_of_the_twilight).toBeNull();
      expect(paths.frostheart).toBe("images/items/frostheart/icon.webp");
    } finally {
      db.close();
    }
  });

  test("rejects an unknown item instead of treating it as iconless", () => {
    const db = new Database(DB_SOURCE_PATH, { readonly: true });
    try {
      expect(() =>
        getItemIconPaths(db, ["frostheart", "item_not_in_export"]),
      ).toThrow("Missing items for icon availability: item_not_in_export");
    } finally {
      db.close();
    }
  });
});

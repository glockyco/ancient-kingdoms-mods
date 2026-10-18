import Database from "better-sqlite3";
import { describe, expect, test } from "vitest";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import { buildObtainabilityTree, getRecipeMaterials } from "./obtainability";

describe("recipe material reader", () => {
  test("returns named materials in stable item-name order", async () => {
    const db = new Database(DB_SOURCE_PATH, { readonly: true });
    try {
      expect(
        await getRecipeMaterials(db, "cold_resistance_potion", "alchemy"),
      ).toEqual([
        { item_id: "frostheart", item_name: "Frostheart", amount: 2 },
        { item_id: "mossback_perch", item_name: "Mossback Perch", amount: 1 },
      ]);
      expect(await getRecipeMaterials(db, "advisor_robe", "crafting")).toEqual([
        {
          item_id: "advisor_robe_mold",
          item_name: "Advisor Robe Mold",
          amount: 1,
        },
        { item_id: "icevril_ore", item_name: "Icevril Ore", amount: 5 },
      ]);
      expect(
        await getRecipeMaterials(db, "fire_nova_scroll", "scribing"),
      ).toEqual([
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

  test("keeps all Ancient Key merge components in one group", async () => {
    const db = new Database(DB_SOURCE_PATH, { readonly: true });
    try {
      const tree = await buildObtainabilityTree(
        db,
        "ancient_key",
        1,
        0,
        new Set(),
        true,
      );
      expect(
        tree.merge?.materials.map((material) => material.item_name).sort(),
      ).toEqual([
        "Ashen Key Shard",
        "Cinderbound Emblem",
        "Scorched Sigil Fragment",
      ]);
      expect(tree.merge?.materials.map((material) => material.amount)).toEqual([
        1, 1, 1,
      ]);
    } finally {
      db.close();
    }
  });

  test("rounds requested output to whole recipe batches without changing ingredient costs", async () => {
    const db = new Database(DB_SOURCE_PATH, { readonly: true });
    try {
      const candidate = db
        .prepare(
          `SELECT o.item_id, o.amount_min AS amount
        FROM acquisition_recipe_details d
        JOIN acquisition_outputs o ON o.method_id = d.id
        WHERE o.amount_min > 1 AND o.item_id IS NOT NULL
        ORDER BY d.id LIMIT 1`,
        )
        .get() as { item_id: string; amount: number } | undefined;
      expect(candidate).toBeDefined();
      if (!candidate) throw new Error("Missing multi-output recipe control");
      const oneBatch = await buildObtainabilityTree(
        db,
        candidate.item_id,
        candidate.amount,
        0,
        new Set(),
        true,
      );
      const twoBatches = await buildObtainabilityTree(
        db,
        candidate.item_id,
        candidate.amount + 1,
        0,
        new Set(),
        true,
      );
      expect(oneBatch.recipe).toBeDefined();
      expect(oneBatch.produced_amount).toBe(candidate.amount);
      expect(twoBatches.produced_amount).toBe(candidate.amount * 2);
      expect(twoBatches.recipe?.materials.map((item) => item.amount)).toEqual(
        oneBatch.recipe?.materials.map((item) => item.amount * 2),
      );
    } finally {
      db.close();
    }
  });
});

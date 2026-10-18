import Database from "better-sqlite3";
import { describe, expect, test } from "vitest";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import { getSlayerPageData } from "./slayer-page-data.server";

describe("Slayer page data", () => {
  test("retains every canonical physical boss and elite context", async () => {
    const data = await getSlayerPageData();
    const db = new Database(DB_SOURCE_PATH, { readonly: true });
    try {
      const expected = db
        .prepare(
          `
        SELECT DISTINCT k.monster_id AS id FROM acquisition_kill_details k
        JOIN monsters m ON m.id = k.monster_id
        WHERE m.is_dummy = 0 AND (m.is_boss = 1 OR m.is_elite = 1)
          AND (EXISTS (SELECT 1 FROM acquisition_providers_monster_spawns p WHERE p.method_id = k.id)
            OR EXISTS (SELECT 1 FROM acquisition_providers_altars p WHERE p.method_id = k.id))
        ORDER BY k.monster_id
      `,
        )
        .all() as { id: string }[];
      expect(expected.length).toBeGreaterThan(0);
      expect(
        [...new Set(data.targets.map((target) => target.id))].sort(),
      ).toEqual(expected.map((row) => row.id));
      expect(new Set(data.targets.map((target) => target.contextId)).size).toBe(
        data.targets.length,
      );
    } finally {
      db.close();
    }
  });

  test("summarizes complete altar tiers without losing their methods or gates", async () => {
    const data = await getSlayerPageData();
    const targets = data.targets.filter(
      (target) => target.id === "thalgrim_iceblood",
    );
    expect(targets).toHaveLength(1);
    const target = targets[0];
    expect(target.altar).toMatchObject({
      id: "altar_forgotten_altar_everfrost_-94_802",
      wave: 11,
    });
    expect(target.altarVariants).toHaveLength(4);
    expect(
      target.altarVariants
        .flatMap((method) =>
          method.requirements.flatMap((root) =>
            root.expression.kind === "predicate" &&
            root.expression.predicate.kind === "altar_tier"
              ? [root.expression.predicate.tier]
              : [],
          ),
        )
        .sort(),
    ).toEqual([0, 1, 2, 3]);
    expect(
      target.altarVariants.every((method) =>
        method.probabilityResults.some(
          (result) =>
            result.target.kind === "item" &&
            result.probability === 0.75 &&
            result.target.delivery === "corpse",
        ),
      ),
    ).toBe(true);
    const db = new Database(DB_SOURCE_PATH, { readonly: true });
    try {
      const methods = db
        .prepare(
          "SELECT id FROM acquisition_kill_details WHERE monster_id = ? ORDER BY id",
        )
        .all(target.id) as { id: string }[];
      expect(
        target.altarVariants.map((method) => method.methodId).sort(),
      ).toEqual(methods.map((method) => method.id));
    } finally {
      db.close();
    }
  });

  test("preserves authored, current-guard, altar and parent contexts", async () => {
    const data = await getSlayerPageData();
    expect(
      data.targets.some(
        (target) => target.id === "nyxarion" && target.spawn_type === "regular",
      ),
    ).toBe(true);
    const elemental = data.targets.find(
      (target) =>
        target.id === "ancient_elemental" && target.spawn_type === "summon",
    );
    expect(elemental).toBeDefined();
    expect(
      elemental?.guards.filter((guard) => guard.name === "Water Elemental"),
    ).toHaveLength(8);
    expect(elemental?.requirements.length).toBeGreaterThan(0);
    expect(
      data.targets.some(
        (target) => target.id === "avatar_of_war" && target.altar?.wave === 2,
      ),
    ).toBe(true);
    const remnant = data.targets.find(
      (target) =>
        target.id === "keeper_remnant" && target.spawn_type === "placeholder",
    );
    expect(remnant?.parent).toMatchObject({
      name: "Large Shade Beast",
      probability: 1,
    });
    expect(remnant?.no_respawn).toBe(true);
  });
});

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
      expect(
        data.targets.every(
          (target) =>
            target.zone_id !== null ||
            (target.position_x === null && target.position_y === null),
        ),
      ).toBe(true);
    } finally {
      db.close();
    }
  });

  test("shows each altar target once across reward tiers", async () => {
    const data = await getSlayerPageData();
    const targets = data.targets.filter(
      (target) => target.id === "thalgrim_iceblood",
    );
    expect(targets).toHaveLength(1);
    expect(targets[0]).toMatchObject({
      source_altar_id: "altar_forgotten_altar_everfrost_-94_802",
      source_altar_wave: 11,
      no_respawn: true,
    });
    const db = new Database(DB_SOURCE_PATH, { readonly: true });
    try {
      const contexts = db
        .prepare(
          `
        SELECT DISTINCT altar_id, wave_number FROM acquisition_kill_details
        WHERE monster_id = ? ORDER BY altar_id, wave_number
      `,
        )
        .all(targets[0].id);
      expect(contexts).toEqual([
        {
          altar_id: targets[0].source_altar_id,
          wave_number: targets[0].source_altar_wave,
        },
      ]);
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
    expect(elemental).toMatchObject({
      source_summon_kill_monster_name: "Water Elemental",
      source_summon_kill_count: 8,
    });
    expect(
      data.targets.some(
        (target) =>
          target.id === "avatar_of_war" && target.source_altar_wave === 2,
      ),
    ).toBe(true);
    const remnant = data.targets.find(
      (target) =>
        target.id === "keeper_remnant" && target.spawn_type === "placeholder",
    );
    expect(remnant).toMatchObject({
      source_monster_name: "Large Shade Beast",
      source_spawn_probability: 1,
    });
    expect(remnant?.no_respawn).toBe(true);
  });
});

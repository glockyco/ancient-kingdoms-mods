import Database from "better-sqlite3";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { query, queryScalar } from "$lib/db";
import {
  loadGatheringPopupDetails,
  loadNpcPopupDetails,
  loadQuestPopupDetails,
} from "./popup";

vi.mock("$lib/db", () => ({ query: vi.fn(), queryScalar: vi.fn() }));

const db = new Database("data/compendium.db", { readonly: true });

beforeAll(() => {
  vi.mocked(query).mockImplementation(async (sql, params = []) =>
    db.prepare(sql).all(...params),
  );
  vi.mocked(queryScalar).mockImplementation(async (sql, params = []) => {
    const row = db.prepare(sql).get(...params) as
      Record<string, unknown> | undefined;
    return row ? Object.values(row)[0] : null;
  });
});

afterAll(() => db.close());

describe("map popup detail parity", () => {
  test("retains all secondary inventory requirements, including zero-amount records", async () => {
    const quests = db
      .prepare(
        "SELECT id, gather_items, required_items FROM quests WHERE json_array_length(required_items) > 0",
      )
      .all() as Array<{
      id: string;
      gather_items: string;
      required_items: string;
    }>;
    expect(quests.length).toBeGreaterThan(0);
    for (const quest of quests) {
      const required = JSON.parse(quest.required_items) as Array<{
        item_id: string;
        amount: number;
      }>;
      const details = await loadQuestPopupDetails(quest.id);
      for (const item of required) {
        expect(details?.objectives).toContainEqual(
          expect.objectContaining({
            targetId: item.item_id,
            amount: item.amount,
          }),
        );
      }
    }
  });

  test("uses discovery place and map coordinates rather than the notification", async () => {
    const quest = db
      .prepare(
        `
      SELECT q.id, zt.name, q.discovered_location_position
      FROM quests q JOIN zone_triggers zt ON zt.id = q.discovered_location_sub_zone_id
      WHERE q.discovered_location_position IS NOT NULL LIMIT 1
    `,
      )
      .get() as {
      id: string;
      name: string;
      discovered_location_position: string;
    };
    const position = JSON.parse(quest.discovered_location_position) as {
      x: number;
      y: number;
    };
    const details = await loadQuestPopupDetails(quest.id);
    expect(
      details?.objectives.find((objective) => objective.type === "discover"),
    ).toMatchObject({
      targetName: quest.name,
      position: [position.x, -position.y],
    });
  });

  test("includes known NPC sub-zones", async () => {
    const npc = db
      .prepare(
        `
      SELECT ns.npc_id, zt.name FROM npc_spawns ns
      JOIN zone_triggers zt ON zt.id = ns.sub_zone_id LIMIT 1
    `,
      )
      .get() as { npc_id: string; name: string };
    expect((await loadNpcPopupDetails(npc.npc_id)).subZones).toContain(
      npc.name,
    );
  });

  test("includes the primary yield range and single-item secondary yields", async () => {
    const resource = db
      .prepare(
        `
      SELECT id, item_reward_id, item_reward_amount FROM gathering_resources
      WHERE is_plant = 1 AND item_reward_amount > 1 LIMIT 1
    `,
      )
      .get() as {
      id: string;
      item_reward_id: string;
      item_reward_amount: number;
    };
    const details = await loadGatheringPopupDetails(resource.id);
    expect(
      details.drops.find((drop) => drop.itemId === resource.item_reward_id),
    ).toMatchObject({ amountMin: 1, amountMax: resource.item_reward_amount });
    for (const drop of details.drops.filter(
      (drop) => drop.itemId !== resource.item_reward_id,
    )) {
      expect(drop).toMatchObject({ amountMin: 1, amountMax: 1 });
    }
  });
});

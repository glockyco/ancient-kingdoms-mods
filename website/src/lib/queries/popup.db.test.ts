import Database from "better-sqlite3";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { query, queryScalar } from "$lib/db";
import {
  calculateBossLootChance,
  type BossLootDrop,
} from "$lib/calculation/boss-loot";
import {
  loadAltarPopupDetails,
  loadMonsterPopupDetails,
  loadChestPopupDetails,
  loadGatheringPopupDetails,
  loadItemPopupDetails,
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
  test("does not quest-gate ordinary items from non-bosses", async () => {
    const source = db
      .prepare(
        `
      SELECT m.id, m.level, ism.item_id
      FROM item_sources_monster ism
      JOIN monsters m ON m.id = ism.monster_id
      JOIN items i ON i.id = ism.item_id
      WHERE m.is_boss = 0 AND i.has_gather_quest = 1 AND i.is_quest_item = 0
      ORDER BY m.id, i.id LIMIT 1
    `,
      )
      .get() as { id: string; level: number; item_id: string };
    expect(source).toBeDefined();
    const monster = await loadMonsterPopupDetails(source.id, source.level);
    const item = await loadItemPopupDetails(source.item_id);
    expect(
      monster.drops.find((drop) => drop.itemId === source.item_id)
        ?.requiresQuest,
    ).toBe(false);
    expect(
      item?.droppers.find((drop) => drop.monsterId === source.id)
        ?.requiresQuest,
    ).toBe(false);
  });

  test("keeps RandomItem distribution rolls distinct from inventory awards", async () => {
    const sources = db
      .prepare(
        `
      SELECT DISTINCT m.id, m.level, ism.item_id, ism.drop_rate
      FROM monsters m, json_each(m.loot_inputs) roll
      JOIN item_sources_monster ism
        ON ism.monster_id = m.id AND ism.item_id = json_extract(roll.value, '$.item_id')
      WHERE json_type(roll.value, '$.random_items') = 'array'
        AND json_extract(roll.value, '$.requires_quest') = 0
        AND EXISTS (
          SELECT 1 FROM monster_spawns ms WHERE ms.monster_id = m.id
          AND ms.spawn_type IN ('regular', 'summon', 'placeholder')
        )
      ORDER BY m.id, ism.item_id LIMIT 3
    `,
      )
      .all() as Array<{
      id: string;
      level: number;
      item_id: string;
      drop_rate: number;
    }>;
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) {
      const monster = await loadMonsterPopupDetails(source.id, source.level);
      const item = await loadItemPopupDetails(source.item_id);
      expect(
        monster.drops.find((drop) => drop.itemId === source.item_id),
      ).toMatchObject({
        isDistributionRoll: true,
        dropRate: source.drop_rate,
      });
      expect(
        item?.droppers.find((drop) => drop.monsterId === source.id),
      ).toMatchObject({
        isDistributionRoll: true,
        dropRate: source.drop_rate,
      });
    }
  });

  test("matches boss per-kill probabilities across monster and item popups", async () => {
    const bosses = db
      .prepare(
        `
      SELECT m.id, m.level, m.loot_inputs,
        EXISTS (
          SELECT 1 FROM monster_spawns ms
          JOIN zones z ON z.id = ms.zone_id AND z.is_dungeon = 1 AND z.zone_id > 0
          JOIN items charm ON charm.luck_token_zone_id = ms.zone_id AND charm.luck_token_bonus > 0
          WHERE ms.monster_id = m.id
        ) AS has_fatecharm
      FROM monsters m
      WHERE m.is_boss = 1 AND EXISTS (
        SELECT 1 FROM monster_spawns ms WHERE ms.monster_id = m.id
        AND ms.spawn_type IN ('regular', 'summon', 'placeholder')
      )
      ORDER BY has_fatecharm DESC, m.id
    `,
      )
      .all() as Array<{
      id: string;
      level: number;
      loot_inputs: string;
      has_fatecharm: number;
    }>;
    let checked = 0;
    for (const boss of bosses) {
      const inputs = JSON.parse(boss.loot_inputs) as BossLootDrop[];
      const target = inputs.find(
        (drop) =>
          drop.counts_as_equipment &&
          !drop.requires_quest &&
          drop.probability > 0 &&
          drop.probability < 1,
      );
      if (!target) continue;
      const expected = calculateBossLootChance(inputs, target.item_id);
      if (Math.abs(expected - target.probability) < 0.000001) continue;
      const monster = await loadMonsterPopupDetails(boss.id, boss.level);
      const item = await loadItemPopupDetails(target.item_id);
      const drop = monster.drops.find((row) => row.itemId === target.item_id);
      const source = item?.droppers.find((row) => row.monsterId === boss.id);
      expect(drop?.dropRate).toBeCloseTo(expected);
      expect(source?.dropRate).toBeCloseTo(expected);
      if (boss.has_fatecharm) {
        const enhanced = calculateBossLootChance(inputs, target.item_id, {
          fatecharm: true,
        });
        expect(drop?.fatecharmDropRate).toBeCloseTo(enhanced);
        expect(source?.fatecharmDropRate).toBeCloseTo(enhanced);
      } else {
        expect(drop?.fatecharmDropRate).toBeUndefined();
        expect(source?.fatecharmDropRate).toBeUndefined();
      }
      if (++checked === 2) break;
    }
    expect(checked).toBeGreaterThan(0);
  });

  test("does not restore template loot for nonfinal-only altar monsters", async () => {
    const monsters = db
      .prepare(
        `
      SELECT m.id, m.level FROM monsters m
      WHERE json_array_length(m.loot_inputs) > 0
        AND EXISTS (
          SELECT 1 FROM altars a, json_each(a.waves) w, json_each(w.value, '$.monsters') member
          WHERE json_extract(member.value, '$.monster_id') = m.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM altars a, json_each(a.waves) w, json_each(w.value, '$.monsters') member
          WHERE json_extract(member.value, '$.monster_id') = m.id
            AND CAST(w.key AS INTEGER) = json_array_length(a.waves) - 1
        )
        AND NOT EXISTS (
          SELECT 1 FROM monster_spawns ms WHERE ms.monster_id = m.id AND ms.spawn_type != 'altar'
        )
        AND NOT EXISTS (
          SELECT 1 FROM skills s WHERE s.summoned_monster_id = m.id AND s.summon_count_per_cast != 0
        )
    `,
      )
      .all() as Array<{ id: string; level: number }>;
    expect(monsters.length).toBeGreaterThan(0);
    for (const monster of monsters) {
      expect(
        (await loadMonsterPopupDetails(monster.id, monster.level)).drops,
      ).toEqual([]);
    }
  });

  test("retains final-wave template sources separately from earned altar rewards", async () => {
    const sources = db
      .prepare(
        `
      SELECT DISTINCT a.id AS altar_id, m.id AS monster_id, ism.item_id
      FROM altars a, json_each(a.waves) w, json_each(w.value, '$.monsters') member
      JOIN monsters m ON m.id = json_extract(member.value, '$.monster_id')
      JOIN item_sources_monster ism ON ism.monster_id = m.id
      JOIN items i ON i.id = ism.item_id AND i.is_bestiary_drop = 1
      WHERE CAST(w.key AS INTEGER) = json_array_length(a.waves) - 1
        AND (m.is_boss = 1 OR m.is_elite = 1)
      ORDER BY a.id, m.id, ism.item_id LIMIT 3
    `,
      )
      .all() as Array<{
      altar_id: string;
      monster_id: string;
      item_id: string;
    }>;
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) {
      const item = await loadItemPopupDetails(source.item_id);
      expect(
        item?.altarSources.some(
          (row) => row.altarId === source.altar_id && row.tier === null,
        ),
      ).toBe(true);
      const altar = await loadAltarPopupDetails(source.altar_id);
      expect(altar.finalMonsterIds).toContain(source.monster_id);
      expect(
        altar.bossDrops
          .find((row) => row.monsterId === source.monster_id)
          ?.drops.some((drop) => drop.itemId === source.item_id),
      ).toBe(true);
    }
  });

  test("uses the same per-opening chest chance from either popup", async () => {
    const sources = db
      .prepare(
        `SELECT item_id, chest_id, drop_rate, actual_drop_chance
         FROM item_sources_chest`,
      )
      .all() as Array<{
      item_id: string;
      chest_id: string;
      drop_rate: number;
      actual_drop_chance: number | null;
    }>;
    expect(sources.length).toBeGreaterThan(0);
    expect(
      sources.filter(
        (source) =>
          source.actual_drop_chance != null &&
          source.actual_drop_chance !== source.drop_rate,
      ).length,
    ).toBeGreaterThan(0);
    for (const source of sources) {
      const item = await loadItemPopupDetails(source.item_id);
      const chest = await loadChestPopupDetails(source.chest_id);
      const chance = source.actual_drop_chance ?? source.drop_rate;
      expect(
        item?.chestSources.find((row) => row.chestId === source.chest_id)?.rate,
      ).toBe(chance);
      expect(
        chest.drops.find((row) => row.itemId === source.item_id)?.dropRate,
      ).toBe(chance);
    }
  });

  test("keeps real secondary inventory requirements and omits zero-amount records", async () => {
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
        if (item.amount > 0) {
          expect(details?.objectives).toContainEqual(
            expect.objectContaining({
              targetId: item.item_id,
              amount: item.amount,
            }),
          );
        } else {
          expect(
            details?.objectives.some(
              (objective) =>
                objective.targetId === item.item_id && objective.amount === 0,
            ),
          ).toBe(false);
        }
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

  test("uses the same per-cast fishing range as the item source", async () => {
    const source = db
      .prepare(
        `
      SELECT isg.item_id, isg.resource_id FROM item_sources_gather isg
      JOIN gathering_resources gr ON gr.id = isg.resource_id
      WHERE gr.is_fishing_spot = 1 AND isg.drop_rate != isg.actual_drop_chance
      ORDER BY isg.resource_id, isg.item_id LIMIT 1
    `,
      )
      .get() as { item_id: string; resource_id: string };
    const spot = await loadGatheringPopupDetails(source.resource_id);
    const item = await loadItemPopupDetails(source.item_id);
    const outcome = spot.fishingOutcomes?.find(
      (row) => row.itemId === source.item_id,
    );
    const gatherSource = item?.gatheringSources.find(
      (row) => row.resourceId === source.resource_id,
    );
    expect(outcome).toBeDefined();
    expect(gatherSource).toBeDefined();
    expect(outcome?.dropRateMin).toBeCloseTo(gatherSource!.fishingChanceMin!);
    expect(outcome?.dropRateMax).toBeCloseTo(gatherSource!.fishingChanceMax!);
  });
});

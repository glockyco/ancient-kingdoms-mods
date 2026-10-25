import Database from "better-sqlite3";
import { afterAll, describe, expect, test } from "vitest";
import { getSeasonalEvents } from "$lib/queries/seasonal-events.server";

const db = new Database("data/compendium.db", { readonly: true });
afterAll(() => db.close());

describe("Seasonal Events page data", () => {
  test("shares seasonal acquisition prices, chances, quest rewards and hunt levels", async () => {
    const data = await getSeasonalEvents(
      async (sql, params) =>
        db.prepare(sql).all(...params) as Record<string, unknown>[],
    );
    expect(data.seasons).toEqual([
      { id: "halloween", buff_skill_id: "halloween_event" },
      { id: "christmas", buff_skill_id: "winter_festival" },
    ]);
    expect(data.offers).toHaveLength(12);
    expect(data.offers.filter((o) => o.seasons.length === 2)).toHaveLength(4);
    expect(
      data.offers.find((o) => o.item_id === "pack_10_skyflares"),
    ).toMatchObject({
      amount: 10,
      received_id: "skyflare",
      price: 1,
      currency_id: "festival_token",
    });
    expect(data.currencyDrops).toEqual(
      expect.arrayContaining([
        { item_id: "spook_token", probability: 0.2 },
        { item_id: "festival_token", probability: 0.3 },
      ]),
    );
    expect(data.currencyDrops).toHaveLength(2);
    expect(data.huntZones).toHaveLength(6);
    expect(data.huntZones.map((z) => z.level_min)).toEqual(
      [...data.huntZones.map((z) => z.level_min)].sort((a, b) => a - b),
    );
    expect(
      data.huntZones.every(
        (z) => z.counts.pumpkin_head > 0 && z.counts.witch > 0,
      ),
    ).toBe(true);
    expect(data.npcs).toEqual([
      expect.objectContaining({ id: "santa_claus", zone_id: "everfrost" }),
    ]);
    expect(data.quests).toHaveLength(3);
    expect(
      data.quests.find((q) => q.id === "the_spirit_of_winter"),
    ).toMatchObject({
      objective: {
        verb: "Gather",
        amount: 10,
        href: "/items/primrose_flowers",
        name: "Primrose Flowers",
      },
      level_recommended: 20,
      xp: 50,
      zones: expect.arrayContaining([
        { id: "everfrost", name: "Everfrost" },
        { id: "northern_wastes", name: "Northern Wastes" },
      ]),
    });
    expect(
      data.quests.find((q) => q.id === "keeping_the_winter_peace"),
    ).toMatchObject({
      objective: {
        verb: "Kill",
        amount: 10,
        href: "/monsters/snow_giant",
        name: "Snow Giant",
      },
      level_recommended: 45,
      xp: 20000,
      zones: expect.arrayContaining([
        { id: "everfrost", name: "Everfrost" },
        { id: "northern_wastes", name: "Northern Wastes" },
      ]),
    });
    expect(
      data.quests.find((q) => q.id === "a_wish_for_the_winter_heart"),
    ).toMatchObject({
      objective: { text: "Find someone who needs a kind word" },
      completer_id: "grimnir_stonehammer",
      zones: [{ id: "urord_nog_fortress", name: "Urord Nog Fortress" }],
    });
    for (const quest of data.quests)
      expect(quest.rewards).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ item_id: "festival_token", amount: 3 }),
          expect.objectContaining({
            item_id: "winter_festival_coin",
            amount: 3,
          }),
        ]),
      );
    for (const quest of data.quests) expect(quest.rewards).toHaveLength(2);
  });
});

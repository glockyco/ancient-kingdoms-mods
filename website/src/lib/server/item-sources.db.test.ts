import Database from "better-sqlite3";
import { expect, test } from "vitest";
import { DB_SOURCE_PATH } from "$lib/constants/constants";
import { getItemSources } from "./item-sources";
import { getItemUsages } from "./item-usages";

test("seasonal sources carry drop, quest and containing-pack seasons", async () => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });
  try {
    const drops = (await getItemSources(db, "spook_token")).monsters;
    expect(drops.map((row) => row.monster_id).sort()).toEqual([
      "pumpkin_head",
      "witch",
    ]);
    expect(drops.every((row) => row.seasons.join(",") === "halloween")).toBe(
      true,
    );
    const quests = (await getItemSources(db, "pack_3_festival_token")).quests;
    expect(quests).toHaveLength(3);
    expect(quests.every((row) => row.seasons.join(",") === "christmas")).toBe(
      true,
    );
    expect(
      quests.some((row) => row.quest_id === "a_wish_for_the_winter_heart"),
    ).toBe(true);
    const packs = (await getItemSources(db, "winter_festival_coin")).packs;
    expect(packs).toMatchObject([
      {
        pack_item_id: "pack_3_winter_festival_coin",
        amount: 3,
        seasons: ["christmas"],
      },
    ]);
  } finally {
    db.close();
  }
});

test("drop rows name the zones whose placements carry the drop", async () => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });
  try {
    const templarRows = async (itemId: string) =>
      (await getItemSources(db, itemId)).monsters
        .filter((row) => row.monster_id === "fire_templar")
        .map((row) => ({
          zones: row.zones.map((zone) => zone.zone_name),
          rate: row.drop_rate,
        }));
    expect(await templarRows("black_pearl")).toEqual([
      { zones: ["Despair"], rate: expect.closeTo(0.1, 2) },
      { zones: ["Molten Sanctuary"], rate: expect.closeTo(0.01, 2) },
    ]);
    expect(await templarRows("ashen_key_shard")).toEqual([
      { zones: ["Molten Sanctuary"], rate: expect.closeTo(0.01, 2) },
    ]);
  } finally {
    db.close();
  }
});

test("gather rows name every zone that holds the resource", async () => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });
  try {
    const gathers = (await getItemSources(db, "black_pearl")).gathers;
    const zones = (resourceId: string) =>
      gathers
        .filter((row) => row.resource_id === resourceId)
        .map((row) => row.zones.map((zone) => zone.zone_name));
    expect(zones("beryllium_ore")).toEqual([
      [
        "Abandoned Mines",
        "Despair",
        "The Molten Summit",
        "Vault of the Vanished",
      ],
    ]);
    // A fishing row stands for one spot, so it names only that spot's zone.
    const fishing = (await getItemSources(db, "blue_dartfish")).gathers.filter(
      (row) => row.is_fishing_spot,
    );
    expect(fishing.length).toBeGreaterThan(1);
    expect(fishing.every((row) => row.zones.length === 1)).toBe(true);
  } finally {
    db.close();
  }
});

test("seasonal shop and currency uses share projected offer seasons", async () => {
  const db = new Database(DB_SOURCE_PATH, { readonly: true });
  try {
    const sources = await getItemSources(db, "pack_10_skyflares");
    expect(sources.vendors).toEqual([]);
    expect(sources.seasonal.map((row) => row.season)).toEqual([
      "halloween",
      "christmas",
    ]);
    const usages = await getItemUsages(db, "festival_token");
    const offers = usages.currency.filter(
      (row) => row.purchasable_item_id === "pack_10_skyflares",
    );
    expect([...new Set(offers.map((row) => row.season))].sort()).toEqual([
      "christmas",
      "halloween",
    ]);
  } finally {
    db.close();
  }
});

import { describe, expect, test } from "vitest";
import { getItemListPayload } from "./items.server";
import { pageItems, ITEMS_PAGE_SIZE } from "$lib/utils/item-list";

const payload = await getItemListPayload();

describe("seasonal item overview", () => {
  test("published item seasons label seasonal-only items without matching names", () => {
    expect(payload.itemSeasons.spook_token).toEqual(["halloween"]);
    expect(payload.itemSeasons.winter_festival_coin).toEqual(["christmas"]);
    expect(payload.itemSeasons.pack_10_skyflares).toEqual([
      "halloween",
      "christmas",
    ]);
    expect(payload.itemSeasons.christmas_deer_costume).toBeUndefined();
    expect(Object.keys(payload.itemSeasons)).toHaveLength(30);
  });

  test("seasonal shop locations stay in the zone facet", () => {
    const zones = payload.itemZones
      .filter((row) => row.item_id === "festive_cookie")
      .map((row) => row.zone_id);
    expect(zones).toEqual(
      expect.arrayContaining(["crescent_coast", "everfrost"]),
    );
  });

  test("the first page holds the highest item levels and only their season metadata", () => {
    const initial = pageItems(payload, 1);
    expect(initial.items).toHaveLength(ITEMS_PAGE_SIZE);
    const lowest = Math.min(...initial.items.map((item) => item.item_level));
    const initialIds = new Set(initial.items.map((item) => item.id));
    expect(initial.itemSeasons).toEqual(
      Object.fromEntries(
        Object.entries(payload.itemSeasons).filter(([id]) =>
          initialIds.has(id),
        ),
      ),
    );
    expect(
      payload.items.filter(
        (item) => !initialIds.has(item.id) && item.item_level > lowest,
      ),
    ).toEqual([]);
  });
});

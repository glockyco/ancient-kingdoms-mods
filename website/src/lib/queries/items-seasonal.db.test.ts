import { describe, expect, test } from "vitest";
import { getItemListPayload } from "./items.server";
import { firstPageCandidates, ITEMS_PAGE_SIZE } from "$lib/utils/item-list";

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

  test("the initial payload preserves first-page rows and only their season metadata", () => {
    const initial = firstPageCandidates(payload);
    const sort = (
      a: (typeof payload.items)[number],
      b: (typeof payload.items)[number],
    ) => b.item_level - a.item_level || a.name.localeCompare(b.name);
    expect([...initial.items].sort(sort).slice(0, ITEMS_PAGE_SIZE)).toEqual(
      [...payload.items].sort(sort).slice(0, ITEMS_PAGE_SIZE),
    );
    const initialIds = new Set(initial.items.map((item) => item.id));
    expect(initial.itemSeasons).toEqual(
      Object.fromEntries(
        Object.entries(payload.itemSeasons).filter(([id]) =>
          initialIds.has(id),
        ),
      ),
    );
    expect(initial.items.length).toBeLessThan(payload.items.length);
  });
});

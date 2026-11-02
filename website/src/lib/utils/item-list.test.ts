import { expect, test } from "vitest";
import type { ItemListViewClient } from "$lib/types/items";
import { pageItems, type ItemListPayload } from "./item-list";

function item(id: string, name: string, level: number): ItemListViewClient {
  return {
    id,
    name,
    item_level: level,
    visual_public_path: null,
    item_type: "weapon",
    quality: 0,
    level_required: 1,
    slot: null,
    backpack_slots: 0,
    backpack_is_unique: false,
    stat_count: 0,
    alchemy_recipe_level_required: null,
    mount_speed: 0,
    augment_is_defensive: null,
    augment_armor_set_name: null,
  };
}

// Five level 50 blades come first, then 25 level 10 notes whose numbers sort
// naturally, not as text ("Notes #2" before "Notes #10").
const blades = ["a", "b", "c", "d", "e"].map((letter) =>
  item(`blade-${letter}`, `Blade ${letter.toUpperCase()}`, 50),
);
const notes = Array.from({ length: 25 }, (_, index) =>
  item(`notes-${index + 1}`, `Notes #${index + 1}`, 10),
);
const items = [...notes, ...blades].reverse();

const payload: ItemListPayload = {
  items,
  itemStatKeys: Object.fromEntries(items.map(({ id }) => [id, ["health"]])),
  itemStatValues: Object.fromEntries(
    items.map(({ id }) => [id, { health: 1 }]),
  ),
  itemClassKeys: Object.fromEntries(items.map(({ id }) => [id, ["cleric"]])),
  itemZones: items.map(({ id }) => ({
    item_id: id,
    zone_id: "zone",
    zone_name: "Zone",
    is_dungeon: false,
  })),
  itemSeasons: { "notes-16": ["halloween"], "blade-a": ["halloween"] },
};

const ids = (page: number) =>
  pageItems(payload, page).items.map(({ id }) => id);

test("each page holds the items the full list shows there", () => {
  expect(ids(1)).toEqual([
    "blade-a",
    "blade-b",
    "blade-c",
    "blade-d",
    "blade-e",
    ...Array.from({ length: 15 }, (_, index) => `notes-${index + 1}`),
  ]);
  expect(ids(2)).toEqual(
    Array.from({ length: 10 }, (_, index) => `notes-${index + 16}`),
  );
  expect(ids(3)).toEqual([]);
});

test("a page carries only its own items' records", () => {
  const second = pageItems(payload, 2);
  const secondIds = second.items.map(({ id }) => id).sort();
  for (const record of [
    second.itemStatKeys,
    second.itemStatValues,
    second.itemClassKeys,
  ]) {
    expect(Object.keys(record).sort()).toEqual(secondIds);
  }
  expect(second.itemZones.map(({ item_id }) => item_id).sort()).toEqual(
    secondIds,
  );
  expect(second.itemSeasons).toEqual({ "notes-16": ["halloween"] });
});

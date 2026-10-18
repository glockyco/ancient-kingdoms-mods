import { expect, test } from "vitest";
import { load } from "./+page.server";
import type { ItemDetailPageData } from "$lib/types/items";

test("a chest key page retains its distinct physical targets and metadata quantities", async () => {
  const data = (await load({
    params: { id: "rusty_chest_key" },
  } as Parameters<typeof load>[0])) as ItemDetailPageData;
  const chests = data.usages.chests;
  expect(new Set(chests.map((chest) => chest.chest_id)).size).toBe(11);
  expect(new Set(chests.map((chest) => chest.zone_id)).size).toBe(7);
  expect(data.description.match(/\d+/g)).toEqual(["11", "7"]);
});

import { expect, test } from "vitest";
import { load } from "./+page.server";
import type { ItemDetailPageData } from "$lib/types/items";

test("a chest key page retains its distinct physical targets and metadata quantities", async () => {
  const data = (await load({
    params: { id: "rusty_chest_key" },
  } as Parameters<typeof load>[0])) as ItemDetailPageData;
  const providers = data.usages.flatMap((use) =>
    use.method?.kind === "world_chest" ? use.method.providers : [],
  );
  const chests = providers.filter((provider) => provider.ref.kind === "chests");

  expect(new Set(chests.map((provider) => provider.ref.id)).size).toBe(11);
  expect(
    new Set(chests.map((provider) => provider.location?.zoneId)).size,
  ).toBe(7);
  expect(data.description.match(/\d+/g)).toEqual(["11", "7"]);
});

import { render } from "svelte/server";
import { expect, test } from "vitest";
import Page from "./+page.svelte";
import type { PageData } from "./$types";

function createPageData(isFishingSpot: boolean): PageData {
  return {
    resource: {
      id: isFishingSpot ? "calm_fishing_spot" : "copper_ore",
      name: isFishingSpot ? "Calm Fishing Spot" : "Copper Ore",
      is_plant: false,
      is_fishing_spot: isFishingSpot,
      is_mineral: !isFishingSpot,
      is_radiant_spark: false,
      level: 0,
      tool_required_id: null,
      tool_required_name: null,
      respawn_time: 0,
      item_reward_id: null,
      item_reward_name: null,
      item_reward_amount: 1,
      gathering_exp: null,
      description: null,
    },
    drops: [],
    spawns: [],
    toolObtainabilityTree: null,
    description: isFishingSpot
      ? "Calm Fishing Spot fishing resource."
      : "Copper Ore gathering resource.",
    fishingSpotVariants: [],
    selectedFishingSpotVariantIndex: 0,
  } satisfies PageData;
}

test("fishing spot detail pages link to the Fishing profession", () => {
  const { body } = render(Page, {
    props: { data: createPageData(true) },
  });

  expect(body).toMatch(
    /<a[^>]+href="\/professions\/fishing"[^>]*>.*Fishing<\/a>/s,
  );
});

test("non-fishing gather detail pages do not link to the Fishing profession", () => {
  const { body } = render(Page, {
    props: { data: createPageData(false) },
  });

  expect(body).not.toContain('href="/professions/fishing"');
});

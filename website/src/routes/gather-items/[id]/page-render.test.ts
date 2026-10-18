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
      primaryRewards: [],
      gathering_exp: null,
      description: null,
      visual_public_path: null,
      visual_width: null,
      visual_height: null,
    },
    drops: [],
    spawns: [],
    rods: [],
    fishPoolsByQuality: {},
    description: isFishingSpot
      ? "Calm Fishing Spot fishing resource."
      : "Copper Ore gathering resource.",
    fishingSpotVariants: [],
    selectedFishingSpotVariantIndex: 0,
    acquisitionMethods: [],
    acquisitionItems: {},
    acquisitionNames: {},
    acquisitionRows: {
      methods: [],
      costGroups: [],
      inputs: [],
      outputs: [],
      effects: [],
      methodPools: [],
      pools: [],
      poolEntries: [],
      homeProviders: [],
      details: {
        kill: [],
        vendor: [],
        quest: [],
        recipe: [],
        resource: [],
        world_chest: [],
        item: [],
        treasure: [],
        service: [],
        creation: [],
        housing: [],
        cap_xp: [],
        altar: [],
      },
      entities: {},
      facts: {},
      request: { kind: "providers", providers: [] },
      providers: {
        monster_spawns: [],
        npcs: [],
        altars: [],
        resource_spawns: [],
        chests: [],
        crafting_stations: [],
        alchemy_tables: [],
        scribing_tables: [],
        items: [],
        classes: [],
        treasure_locations: [],
      },
    },
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

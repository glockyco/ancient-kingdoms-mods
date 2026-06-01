import { describe, expect, test } from "vitest";
import type { GatheringMapEntity, MapEntityData } from "$lib/types/map";
import {
  computeSelectionData,
  computeSelectionFromGroups,
  createEntityIndex,
} from "./selection";
import { resolvePhysicalSelection } from "./resolve-selection";

function fishingSpot(
  id: string,
  position: [number, number] | null,
): GatheringMapEntity {
  return {
    id,
    type: "gathering_fish",
    name: "Rough Fishing Spot",
    resourceName: "Rough Fishing Spot",
    selectionGroupId: "rough_fishing_spot",
    position,
    zoneId: "zone",
    zoneName: "Zone",
    level: 1,
    respawnTime: 0,
    toolRequiredId: "rusty_fishing_rod",
    toolRequiredName: "Rusty Fishing Rod",
    dropCount: 1,
  };
}

function mapData(gathering: GatheringMapEntity[]): MapEntityData {
  return {
    monsters: [],
    npcs: [],
    portals: [],
    chests: [],
    treasure: [],
    altars: [],
    gathering,
    crafting: [],
    houses: [],
    subZones: [],
    parentZones: [],
    levelRanges: {
      monsterMin: 0,
      monsterMax: 0,
      gatheringMin: 0,
      gatheringMax: 0,
    },
  };
}

describe("map selection", () => {
  test("direct fishing spot selection still highlights the shared spot group", () => {
    const index = createEntityIndex(
      mapData([
        fishingSpot("rough_fishing_spot_a", [1, 1]),
        fishingSpot("rough_fishing_spot_b", [2, 2]),
      ]),
    );

    expect(
      computeSelectionData(index, "resource", "rough_fishing_spot").map(
        (entity) => entity.id,
      ),
    ).toEqual(["rough_fishing_spot_a", "rough_fishing_spot_b"]);
  });

  test("item gather-source overrides highlight exact fishing spot variants", () => {
    const index = createEntityIndex(
      mapData([
        fishingSpot("rough_fishing_spot_a", [1, 1]),
        fishingSpot("rough_fishing_spot_b", [2, 2]),
      ]),
    );

    expect(
      computeSelectionFromGroups(index, [
        { category: "resource", ids: ["rough_fishing_spot_b"] },
      ]).map((entity) => entity.id),
    ).toEqual(["rough_fishing_spot_b"]);
  });

  test("excluded-zone fishing spots show a popup without a highlight", () => {
    const entity = fishingSpot("ancient_fishing_spot_temple", null);
    const resolved = resolvePhysicalSelection(
      "resource",
      entity.id,
      mapData([entity]),
    );

    expect(resolved.popup).toEqual({ type: "entity", entity });
    expect(resolved.highlight).toBeNull();
  });
});

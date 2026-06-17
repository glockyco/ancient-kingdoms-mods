import { describe, expect, test } from "vitest";

import { INITIAL_VIEW_STATE } from "./config";
import {
  boundsFromOverrideGroups,
  createInitialViewState,
} from "./initial-view";
import type { Bounds } from "./flyto";
import type { MapUrlState } from "./url-state";
import type { GatheringMapEntity, MapEntityData } from "$lib/types/map";
import { createEntityIndex } from "./selection";

const bounds: Bounds = {
  minX: 0,
  maxX: 100,
  minY: 0,
  maxY: 50,
};

const urlState: MapUrlState = {
  x: 12,
  y: -34,
  zoom: 1.5,
};

function gatheringSpot(
  id: string,
  position: [number, number] | null,
): GatheringMapEntity {
  return {
    id,
    type: "gathering_fish",
    name: "Fishing Spot",
    resourceName: "Fishing Spot",
    selectionGroupId: "fishing_spot",
    position,
    zoneId: "zone",
    zoneName: "Zone",
    level: 1,
    respawnTime: 0,
    toolRequiredId: "rod",
    toolRequiredName: "Rod",
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

describe("createInitialViewState", () => {
  test("uses explicit URL coordinates when present", () => {
    expect(
      createInitialViewState({
        urlState,
        hasPositionParams: true,
        bounds,
        width: 400,
        height: 200,
      }),
    ).toEqual({
      target: [12, -34, 0],
      zoom: 1.5,
      minZoom: INITIAL_VIEW_STATE.minZoom,
      maxZoom: INITIAL_VIEW_STATE.maxZoom,
    });
  });

  test("fits initial bounds with measured container dimensions", () => {
    expect(
      createInitialViewState({
        urlState: null,
        hasPositionParams: false,
        bounds,
        width: 400,
        height: 200,
        rightPadding: 200,
        maxZoom: 10,
        padding: 1,
      }),
    ).toEqual({
      target: [100, 25, 0],
      zoom: 1,
      minZoom: INITIAL_VIEW_STATE.minZoom,
      maxZoom: 10,
    });
  });

  test("falls back to default view when measured dimensions are invalid", () => {
    expect(
      createInitialViewState({
        urlState: null,
        hasPositionParams: false,
        bounds,
        width: 0,
        height: 200,
      }),
    ).toBe(INITIAL_VIEW_STATE);
  });
});

describe("boundsFromOverrideGroups", () => {
  test("computes bounds from resolved virtual selection override groups", () => {
    const entityIndex = createEntityIndex(
      mapData([
        gatheringSpot("spot-a", [10, -20]),
        gatheringSpot("spot-b", [30, -40]),
        gatheringSpot("spot-c", null),
      ]),
    );

    expect(
      boundsFromOverrideGroups(entityIndex, [
        { category: "resource", ids: ["spot-a", "spot-b", "spot-c"] },
      ]),
    ).toEqual({
      minX: 10,
      maxX: 30,
      minY: -40,
      maxY: -20,
    });
  });
});

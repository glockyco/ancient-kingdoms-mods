import { describe, expect, test } from "vitest";
import type {
  ChestMapEntity,
  MapEntityData,
  GatheringMapEntity,
  NpcMapEntity,
} from "$lib/types/map";
import { createFilteredData } from "./layers";
import { getDefaultLayerVisibility, getDefaultLevelFilter } from "./url-state";
import { markersInViewport, VIEWPORT_MARKER_LIMIT } from "./viewport-markers";

const chest = (id: string, x: number, zoneId = "zone"): ChestMapEntity => ({
  id,
  name: id,
  type: "chest",
  position: [x, 0],
  zoneId,
  zoneName: zoneId,
  keyRequiredId: null,
  keyRequiredName: null,
  respawnTime: 0,
  dropCount: 0,
  randomDropCount: 0,
});

function data(overrides: Partial<MapEntityData> = {}): MapEntityData {
  return {
    monsters: [],
    npcs: [],
    portals: [],
    chests: [],
    treasure: [],
    altars: [],
    traps: [],
    gathering: [],
    crafting: [],
    houses: [],
    subZones: [],
    parentZones: [],
    levelRanges: {
      monsterMin: 1,
      monsterMax: 50,
      gatheringMin: 1,
      gatheringMax: 5,
    },
    ...overrides,
  };
}

const viewport = { x: 0, y: 0, zoom: 0, width: 100, height: 100 };
const levels = getDefaultLevelFilter();
const visibility = { ...getDefaultLayerVisibility(), chests: true };

describe("accessible viewport markers", () => {
  test("orders individual placements by distance and caps the list", () => {
    const chests = Array.from(
      { length: VIEWPORT_MARKER_LIMIT + 5 },
      (_, index) => chest(String(index), index),
    );
    const result = markersInViewport(
      createFilteredData(data({ chests: chests.reverse() })),
      visibility,
      levels,
      null,
      viewport,
    );
    expect(result.total).toBe(VIEWPORT_MARKER_LIMIT + 5);
    expect(result.markers).toHaveLength(VIEWPORT_MARKER_LIMIT);
    expect(result.markers[0].entity.id).toBe("0");
    expect(result.markers.at(-1)?.entity.id).toBe(
      String(VIEWPORT_MARKER_LIMIT - 1),
    );
  });

  test("follows viewport bounds, layer controls and zone focus", () => {
    const filtered = createFilteredData(
      data({
        chests: [
          chest("near", 1),
          chest("outside", 51),
          chest("other", 2, "other"),
        ],
      }),
    );
    expect(
      markersInViewport(
        filtered,
        visibility,
        levels,
        "zone",
        viewport,
      ).markers.map((row) => row.entity.id),
    ).toEqual(["near"]);
    expect(
      markersInViewport(
        filtered,
        { ...visibility, chests: false },
        levels,
        null,
        viewport,
      ).total,
    ).toBe(0);
    expect(
      markersInViewport(filtered, visibility, levels, null, {
        ...viewport,
        x: 100,
      }).markers.map((row) => row.entity.id),
    ).toEqual(["outside"]);
  });

  test("applies tiers only to tier-filtered resources", () => {
    const plant: GatheringMapEntity = {
      id: "plant",
      name: "plant",
      resourceName: "plant",
      resourceId: "plant",
      type: "gathering_plant",
      position: [0, 0],
      zoneId: "zone",
      zoneName: "zone",
      selectionGroupId: "plant",
      level: 3,
      respawnTime: 0,
      toolRequiredId: null,
      toolRequiredName: null,
      dropCount: 0,
    };
    const spark: GatheringMapEntity = {
      ...plant,
      id: "spark",
      type: "gathering_spark",
    };
    const filtered = createFilteredData(data({ gathering: [plant, spark] }));
    const result = markersInViewport(
      filtered,
      { ...visibility, gatheringPlants: true, gatheringSparks: true },
      { ...levels, gatheringMin: 1, gatheringMax: 1 },
      null,
      viewport,
    );
    expect(result.markers.map((row) => row.entity.id)).toEqual(["spark"]);
  });

  test("includes ordinary NPCs only when one of their roles is enabled", () => {
    const npc: NpcMapEntity = {
      id: "npc",
      name: "npc",
      type: "npc",
      position: [0, 0],
      zoneId: "zone",
      zoneName: "zone",
      roleBitmask: 1,
      isNotable: false,
      renewalDungeonName: null,
      renewalDungeonZoneId: null,
      isWorldBossReset: false,
      isPatrolling: false,
      patrolWaypoints: null,
      moveDistance: 0,
      questCount: 0,
      itemsSoldCount: 0,
      hasTeleport: false,
      teleportDestName: null,
      teleportZoneId: null,
      teleportDestination: null,
      teleportPrice: 0,
    };
    const filtered = createFilteredData(data({ npcs: [npc] }));
    expect(
      markersInViewport(
        filtered,
        { ...visibility, npcVendors: true },
        levels,
        null,
        viewport,
      ).total,
    ).toBe(1);
    expect(
      markersInViewport(
        filtered,
        { ...visibility, npcVendors: false },
        levels,
        null,
        viewport,
      ).total,
    ).toBe(0);
  });
});

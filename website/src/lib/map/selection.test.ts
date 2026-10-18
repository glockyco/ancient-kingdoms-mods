import { describe, expect, test } from "vitest";
import type {
  GatheringMapEntity,
  MapEntityData,
  MonsterMapEntity,
} from "$lib/types/map";
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
    resourceId: "rough_fishing_spot",
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
    traps: [],
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
  test("item loot overrides highlight one eligible placement rather than every matching template", () => {
    const northern: MonsterMapEntity = {
      id: "northern",
      monsterId: "mummy",
      name: "Mummy",
      type: "monster",
      position: [1, 2],
      zoneId: "north",
      zoneName: "North",
      level: 1,
      isBoss: false,
      isWorldBoss: false,
      isElite: false,
      isFabled: false,
      isHunt: false,
      isPatrolling: false,
      patrolWaypoints: null,
      moveDistance: 0,
      respawnTime: 0,
      respawnProbability: 1,
      spawnTimeStart: 0,
      spawnTimeEnd: 0,
      baseExp: 0,
      dropCount: 0,
      bestiaryDropCount: 0,
      spawnType: "regular",
      sourceMonsterName: null,
      sourceMonsterId: null,
      sourceSpawnProbability: null,
      summonKillMonsterName: null,
      summonKillMonsterId: null,
      summonKillCount: null,
      blockerSpawnIds: null,
      sourceSpawnIds: null,
      altarIds: null,
      visualAssetLayout: null,
    };
    const dungeon: MonsterMapEntity = {
      ...northern,
      id: "dungeon",
      position: [3, 4],
      zoneId: "dungeon",
    };
    const suppressed: MonsterMapEntity = {
      ...northern,
      id: "suppressed",
      position: null,
    };
    const data = { ...mapData([]), monsters: [northern, dungeon, suppressed] };
    const index = createEntityIndex(data);
    expect(
      computeSelectionFromGroups(index, [
        {
          category: "monster",
          ids: ["dungeon", "suppressed"],
          exactPlacement: true,
        },
      ]).map((entity) => entity.id),
    ).toEqual(["dungeon"]);
    expect(
      computeSelectionData(index, "monster", "mummy").map(
        (entity) => entity.id,
      ),
    ).toEqual(["northern", "dungeon"]);
    const selected = resolvePhysicalSelection("monster", "dungeon", data);
    expect(selected.popup).toEqual({ type: "entity", entity: dungeon });
    expect(
      computeSelectionFromGroups(
        index,
        selected.highlight?.overrideGroups ?? [],
      ).map((entity) => entity.id),
    ).toEqual(["dungeon"]);
  });
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

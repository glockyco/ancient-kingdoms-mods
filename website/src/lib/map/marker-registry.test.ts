import { describe, expect, test } from "vitest";
import {
  MARKER_BORDER_CLASSES,
  MARKER_COLORS,
  MARKER_DEFAULT_VISIBILITY,
  MARKER_ICON_SIZES,
  MARKER_ICONS,
  MARKER_LABELS,
  MARKER_PLURAL_LABELS,
  MARKER_RADII,
  MARKER_Z_ORDER,
  markerRegistry,
  resolveMarker,
} from "./marker-registry";
import type {
  MonsterMapEntity,
  NpcMapEntity,
  PortalMapEntity,
} from "$lib/types/map";

const monster = (flags: Partial<MonsterMapEntity> = {}): MonsterMapEntity => ({
  id: "spawn",
  type: "monster",
  name: "Test Creature",
  position: [1, 2],
  zoneId: "zone",
  zoneName: "Zone",
  monsterId: "monster",
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
  ...flags,
});

describe("marker registry", () => {
  test("declares unique ids and paint order for every marker", () => {
    const markers = Object.values(markerRegistry);
    expect(new Set(markers.map((marker) => marker.id)).size).toBe(
      markers.length,
    );
    expect(new Set(markers.map((marker) => marker.z)).size).toBe(
      markers.length,
    );
    expect(markers.map((marker) => marker.id)).toEqual([
      "creatures",
      "hunts",
      "elites",
      "fabled",
      "bosses",
      "npc",
      "portals",
      "chests",
      "treasure",
      "altars",
      "traps",
      "houses",
      "gatheringPlants",
      "gatheringMinerals",
      "gatheringSparks",
      "gatheringFishing",
      "gatheringOther",
      "alchemyTables",
      "forges",
      "cookingOvens",
      "scribingTables",
    ]);
  });

  test("derives every presentation record from the same marker keys", () => {
    const markerIds = Object.keys(markerRegistry).sort();
    for (const record of [
      MARKER_COLORS,
      MARKER_ICONS,
      MARKER_ICON_SIZES,
      MARKER_RADII,
      MARKER_BORDER_CLASSES,
      MARKER_LABELS,
      MARKER_PLURAL_LABELS,
      MARKER_DEFAULT_VISIBILITY,
      MARKER_Z_ORDER,
    ]) {
      expect(Object.keys(record).sort()).toEqual(markerIds);
    }
    expect(MARKER_BORDER_CLASSES.chests).toBe("border-l-sky-500");
    expect(MARKER_RADII.gatheringFishing).toBe(3);
  });

  test("uses declared partition precedence for overlapping monster flags", () => {
    expect(resolveMarker(monster())).toBe("creatures");
    expect(resolveMarker(monster({ isHunt: true, isFabled: true }))).toBe(
      "fabled",
    );
    expect(resolveMarker(monster({ isElite: true, isFabled: true }))).toBe(
      "fabled",
    );
    expect(resolveMarker(monster({ isBoss: true, isFabled: true }))).toBe(
      "fabled",
    );
  });

  test("keeps NPC roles as facets over one marker layer", () => {
    const npc = markerRegistry.npc as typeof markerRegistry.npc;
    expect(npc.facets).toHaveLength(22);
    expect(new Set(npc.facets?.map((facet) => facet.mask)).size).toBe(22);

    const row = {
      roleBitmask: 1 << 18,
    } as NpcMapEntity;
    expect(
      npc.facets?.find((facet) => facet.id === "isTeleporter")?.matches(row),
    ).toBe(true);
  });

  test("prefixes every decoration id with its owning marker", () => {
    const row = monster({ isPatrolling: true, moveDistance: 12 });
    const decorations = markerRegistry.creatures.decorations?.({
      row,
      markerId: markerRegistry.creatures.id,
    });
    expect(decorations?.every(({ id }) => id.startsWith("creatures:"))).toBe(
      true,
    );
  });

  test("requires normalized portal sub-zone fields for display names", () => {
    const row = {
      id: "portal",
      type: "portal",
      name: "Portal",
      position: [1, 2],
      zoneId: "from-zone",
      zoneName: "From Zone",
      destination: [3, 4],
      destinationZoneId: "to-zone",
      destinationZoneName: "To Zone",
      isClosed: false,
      requiredItemId: null,
      requiredItemName: null,
      requiredLevel: 0,
      requiredItemLevel: 0,
      needMonsterDeadId: null,
      needMonsterDeadName: null,
      killRequirementSpawnIds: null,
      fromSubZoneName: "From Sub-zone",
      destinationSubZoneName: "To Sub-zone",
    } satisfies PortalMapEntity;

    expect(markerRegistry.portals.displayName?.(row)).toBe(
      "From Sub-zone → To Sub-zone",
    );
  });
});

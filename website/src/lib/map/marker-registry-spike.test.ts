import { describe, expect, test } from "vitest";
import {
  markerRegistrySpike,
  resolveMarker,
  type PortalSpikeRow,
} from "./marker-registry-spike";
import type { MonsterMapEntity, NpcMapEntity } from "$lib/types/map";

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

describe("marker registry spike", () => {
  test("declares unique ids and paint order for all three hard sources", () => {
    const markers = Object.values(markerRegistrySpike);
    expect(new Set(markers.map((marker) => marker.id)).size).toBe(
      markers.length,
    );
    expect(new Set(markers.map((marker) => marker.z)).size).toBe(
      markers.length,
    );
    expect(markers.map((marker) => marker.id)).toEqual([
      "creature",
      "hunt",
      "elite",
      "fabled",
      "boss",
      "npc",
      "portal",
    ]);
  });

  test("uses declared partition precedence for overlapping monster flags", () => {
    expect(resolveMarker(monster())).toBe("creature");
    expect(resolveMarker(monster({ isHunt: true, isFabled: true }))).toBe(
      "fabled",
    );
    expect(resolveMarker(monster({ isElite: true, isFabled: true }))).toBe(
      "fabled",
    );
    expect(resolveMarker(monster({ isBoss: true, isFabled: true }))).toBe(
      "boss",
    );
  });

  test("keeps NPC roles as facets over one marker layer", () => {
    const npc = markerRegistrySpike.npc as typeof markerRegistrySpike.npc;
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
    const decorations = markerRegistrySpike.creature.decorations?.({
      row,
      markerId: markerRegistrySpike.creature.id,
    });
    expect(decorations?.every(({ id }) => id.startsWith("creature:"))).toBe(
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
    } satisfies PortalSpikeRow;

    expect(markerRegistrySpike.portal.displayName?.(row)).toBe(
      "From Sub-zone → To Sub-zone",
    );
  });
});

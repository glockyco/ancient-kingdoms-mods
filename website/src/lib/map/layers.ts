import type {
  MapEntityData,
  FilteredMapData,
  LayerVisibility,
  LevelFilter,
  AnyMapEntity,
  MonsterMapEntity,
  NpcMapEntity,
  GatheringMapEntity,
  CraftingMapEntity,
  ZoneBoundary,
  PortalMapEntity,
  ChestMapEntity,
  AltarMapEntity,
} from "$lib/types/map";
import type { ZoneFocusedData } from "./zone-filter";
import { isAnyNpcTypeVisible } from "./visibility";
import {
  LAYER_COLORS,
  LAYER_RADII,
  BACKGROUND_COLOR,
  WORLD_BOUNDS,
  ZONE_COLORS,
  ARC_COLORS,
  HIGHLIGHT_COLORS,
  PATROL_COLORS,
} from "./config";
import {
  EMPTY_SELECTION,
  EMPTY_PATROL_DATA,
  type PatrolPathData,
} from "./selection";

// Type for deck.gl layer constructor (we use any since deck.gl types are complex)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LayerConstructor = new (props: any) => any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExtensionConstructor = new (props: any) => any;

interface DeckModules {
  ScatterplotLayer: LayerConstructor;
  PolygonLayer: LayerConstructor;
  LineLayer: LayerConstructor;
  DataFilterExtension: ExtensionConstructor;
}

/**
 * Pre-filter entity data once on load (expensive operation, do once)
 * Filters out entities without positions (they're kept in entityData for popups)
 */
export function createFilteredData(data: MapEntityData): FilteredMapData {
  // Only include entities with valid positions for rendering
  const renderableMonsters = data.monsters.filter((m) => m.position !== null);
  const renderableGathering = data.gathering.filter((g) => g.position !== null);
  const renderableCrafting = data.crafting.filter((c) => c.position !== null);
  const renderablePortals = data.portals.filter((p) => p.position !== null);

  return {
    // Creatures = regular monsters (not boss, not elite, not hunt)
    creatures: renderableMonsters.filter(
      (m) => !m.isBoss && !m.isElite && !m.isHunt,
    ),
    elites: renderableMonsters.filter((m) => m.isElite && !m.isBoss),
    bosses: renderableMonsters.filter((m) => m.isBoss),
    hunts: renderableMonsters.filter(
      (m) => m.isHunt && !m.isBoss && !m.isElite,
    ),
    plants: renderableGathering.filter((g) => g.type === "gathering_plant"),
    minerals: renderableGathering.filter((g) => g.type === "gathering_mineral"),
    sparks: renderableGathering.filter((g) => g.type === "gathering_spark"),
    alchemyTables: renderableCrafting.filter((c) => c.type === "alchemy_table"),
    forges: renderableCrafting.filter(
      (c) => c.type === "crafting_station" && !c.isCookingOven,
    ),
    cookingOvens: renderableCrafting.filter((c) => c.isCookingOven),
    portalsWithDestinations: renderablePortals.filter(
      (p) => p.destination !== null,
    ),
    parentZones: calculateParentZoneBounds(data),
  };
}

/**
 * Calculate parent zone boundaries from entity positions (cached, called once)
 */
function calculateParentZoneBounds(data: MapEntityData): ZoneBoundary[] {
  const allEntities: AnyMapEntity[] = [
    ...data.monsters,
    ...data.npcs,
    ...data.portals,
    ...data.chests,
    ...data.altars,
    ...data.gathering,
    ...data.crafting,
  ];

  const byZone = new Map<
    string,
    { zoneName: string; positions: [number, number][] }
  >();

  for (const entity of allEntities) {
    if (!entity.zoneName || !entity.position) continue;
    const existing = byZone.get(entity.zoneName);
    if (existing) {
      existing.positions.push(entity.position);
    } else {
      byZone.set(entity.zoneName, {
        zoneName: entity.zoneName,
        positions: [entity.position],
      });
    }
  }

  const padding = 20;
  return Array.from(byZone.entries()).map(([zoneName, { positions }]) => {
    const xs = positions.map((p) => p[0]);
    const ys = positions.map((p) => p[1]);
    return {
      id: `parent-${zoneName}`,
      name: zoneName,
      zoneId: zoneName,
      zoneName,
      polygon: [
        [Math.min(...xs) - padding, Math.min(...ys) - padding],
        [Math.max(...xs) + padding, Math.min(...ys) - padding],
        [Math.max(...xs) + padding, Math.max(...ys) + padding],
        [Math.min(...xs) - padding, Math.max(...ys) + padding],
      ] as [number, number][],
    };
  });
}

/**
 * Create patrol path layers from pre-computed data.
 * Data should be computed via $derived using computePatrolPathData().
 */
function createPatrolPathLayers(
  patrolData: PatrolPathData,
  ScatterplotLayer: LayerConstructor,
  LineLayer: LayerConstructor,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any[] {
  if (patrolData === EMPTY_PATROL_DATA || patrolData.segments.length === 0) {
    return [];
  }

  return [
    // Spawn-to-patrol connections (dimmer, rendered first/below)
    new LineLayer({
      id: "patrol-spawn-connections",
      data: patrolData.spawnConnections,
      visible: true,
      getSourcePosition: (d: PatrolPathData["spawnConnections"][0]) => d.source,
      getTargetPosition: (d: PatrolPathData["spawnConnections"][0]) => d.target,
      getColor: PATROL_COLORS.spawnConnection,
      getWidth: 2,
      widthUnits: "pixels",
      pickable: false,
    }),

    // Patrol path lines (closed loop)
    new LineLayer({
      id: "patrol-paths",
      data: patrolData.segments,
      visible: true,
      getSourcePosition: (d: PatrolPathData["segments"][0]) => d.source,
      getTargetPosition: (d: PatrolPathData["segments"][0]) => d.target,
      getColor: PATROL_COLORS.path,
      getWidth: 2,
      widthUnits: "pixels",
      pickable: false,
    }),

    // Patrol waypoint markers
    new ScatterplotLayer({
      id: "patrol-waypoints",
      data: patrolData.waypoints,
      visible: true,
      getPosition: (d: [number, number]) => d,
      getFillColor: PATROL_COLORS.waypoint,
      getRadius: 3,
      radiusUnits: "pixels",
      radiusMinPixels: 2,
      radiusMaxPixels: 6,
      pickable: false,
    }),
  ];
}

/**
 * Create all deck.gl layers (optimized: uses pre-filtered data, visible prop, updateTriggers)
 *
 * @param filtered - Combined filtered data (includes all entity arrays)
 * @param focusedZoneId - Zone ID to filter by (null = show all zones)
 * @param selectionData - Pre-computed array of entities to highlight (use EMPTY_SELECTION when none)
 * @param patrolPathData - Pre-computed patrol path data (use EMPTY_PATROL_DATA when none)
 */
export function createLayers(
  filtered: ZoneFocusedData,
  visibility: LayerVisibility,
  modules: DeckModules,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callbacks: { onHover: (info: any) => void; onClick: (info: any) => void },
  levelFilter: LevelFilter,
  selectedPortalId: string | null,
  focusedZoneId: string | null,
  selectionData: AnyMapEntity[] = EMPTY_SELECTION,
  patrolPathData: PatrolPathData = EMPTY_PATROL_DATA,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any[] {
  const { ScatterplotLayer, PolygonLayer, LineLayer, DataFilterExtension } =
    modules;

  // Shared extension instances for GPU filtering
  // filterSize: 1 for zone-only filtering
  const zoneFilterExt = new DataFilterExtension({ filterSize: 1 });
  // filterSize: 2 for level+zone filtering (monsters, gathering)
  const levelZoneFilterExt = new DataFilterExtension({ filterSize: 2 });

  // Helper to check if entity is in focused zone (or if no zone is focused)
  const isInZone = (zoneId: string): number =>
    !focusedZoneId || zoneId === focusedZoneId ? 1 : 0;

  // Background data (static, never changes)
  const backgroundData = [
    {
      polygon: [
        [WORLD_BOUNDS.minX, WORLD_BOUNDS.minY],
        [WORLD_BOUNDS.maxX, WORLD_BOUNDS.minY],
        [WORLD_BOUNDS.maxX, WORLD_BOUNDS.maxY],
        [WORLD_BOUNDS.minX, WORLD_BOUNDS.maxY],
      ],
    },
  ];

  // Create ALL layers always (use visible prop for toggling)
  return [
    // Background layer
    new PolygonLayer({
      id: "background",
      data: backgroundData,
      getPolygon: (d: { polygon: [number, number][] }) => d.polygon,
      getFillColor: BACKGROUND_COLOR,
      pickable: false,
    }),

    // Parent zone boundaries (pre-calculated)
    new PolygonLayer({
      id: "parent-zones",
      data: filtered.parentZones,
      visible: visibility.parentZones,
      getPolygon: (d: ZoneBoundary) => d.polygon,
      getFillColor: ZONE_COLORS.parentZone.fill,
      getLineColor: ZONE_COLORS.parentZone.stroke,
      getLineWidth: 2,
      lineWidthUnits: "pixels",
      stroked: true,
      filled: true,
      pickable: true,
      onHover: callbacks.onHover,
      extensions: [zoneFilterExt],
      getFilterValue: (d: ZoneBoundary) => isInZone(d.zoneId),
      filterRange: [1, 1],
      updateTriggers: {
        getFilterValue: focusedZoneId,
      },
    }),

    // Sub-zone boundaries
    new PolygonLayer({
      id: "sub-zones",
      data: filtered.subZones,
      visible: visibility.subZones,
      getPolygon: (d: ZoneBoundary) => d.polygon,
      getFillColor: ZONE_COLORS.subZone.fill,
      getLineColor: ZONE_COLORS.subZone.stroke,
      getLineWidth: 1,
      lineWidthUnits: "pixels",
      stroked: true,
      filled: true,
      pickable: true,
      onHover: callbacks.onHover,
      extensions: [zoneFilterExt],
      getFilterValue: (d: ZoneBoundary) => isInZone(d.zoneId),
      filterRange: [1, 1],
      updateTriggers: {
        getFilterValue: focusedZoneId,
      },
    }),

    // Gathering plants (GPU-filtered by tier and zone)
    new ScatterplotLayer({
      id: "gathering-plants",
      data: filtered.plants,
      visible: visibility.gatheringPlants,
      getPosition: (d: GatheringMapEntity) => d.position,
      getFillColor: LAYER_COLORS.gathering_plant,
      getRadius: LAYER_RADII.gathering,
      radiusUnits: "pixels",
      radiusMinPixels: 2,
      radiusMaxPixels: 8,
      pickable: true,
      onHover: callbacks.onHover,
      onClick: callbacks.onClick,
      extensions: [levelZoneFilterExt],
      getFilterValue: (d: GatheringMapEntity) => [d.level, isInZone(d.zoneId)],
      filterRange: [
        [levelFilter.gatheringMin, levelFilter.gatheringMax],
        [1, 1],
      ],
      updateTriggers: {
        getFilterValue: focusedZoneId,
        filterRange: [levelFilter.gatheringMin, levelFilter.gatheringMax],
      },
    }),

    // Gathering minerals
    new ScatterplotLayer({
      id: "gathering-minerals",
      data: filtered.minerals,
      visible: visibility.gatheringMinerals,
      getPosition: (d: GatheringMapEntity) => d.position,
      getFillColor: LAYER_COLORS.gathering_mineral,
      getRadius: LAYER_RADII.gathering,
      radiusUnits: "pixels",
      radiusMinPixels: 2,
      radiusMaxPixels: 8,
      pickable: true,
      onHover: callbacks.onHover,
      onClick: callbacks.onClick,
      extensions: [levelZoneFilterExt],
      getFilterValue: (d: GatheringMapEntity) => [d.level, isInZone(d.zoneId)],
      filterRange: [
        [levelFilter.gatheringMin, levelFilter.gatheringMax],
        [1, 1],
      ],
      updateTriggers: {
        getFilterValue: focusedZoneId,
        filterRange: [levelFilter.gatheringMin, levelFilter.gatheringMax],
      },
    }),

    // Gathering sparks
    new ScatterplotLayer({
      id: "gathering-sparks",
      data: filtered.sparks,
      visible: visibility.gatheringSparks,
      getPosition: (d: GatheringMapEntity) => d.position,
      getFillColor: LAYER_COLORS.gathering_spark,
      getRadius: LAYER_RADII.gathering,
      radiusUnits: "pixels",
      radiusMinPixels: 2,
      radiusMaxPixels: 8,
      pickable: true,
      onHover: callbacks.onHover,
      onClick: callbacks.onClick,
      extensions: [levelZoneFilterExt],
      getFilterValue: (d: GatheringMapEntity) => [d.level, isInZone(d.zoneId)],
      filterRange: [
        [levelFilter.gatheringMin, levelFilter.gatheringMax],
        [1, 1],
      ],
      updateTriggers: {
        getFilterValue: focusedZoneId,
        filterRange: [levelFilter.gatheringMin, levelFilter.gatheringMax],
      },
    }),

    // Alchemy Tables
    new ScatterplotLayer({
      id: "alchemy-tables",
      data: filtered.alchemyTables,
      visible: visibility.alchemyTables,
      getPosition: (d: CraftingMapEntity) => d.position,
      getFillColor: LAYER_COLORS.crafting,
      getRadius: LAYER_RADII.crafting,
      radiusUnits: "pixels",
      radiusMinPixels: 3,
      radiusMaxPixels: 10,
      pickable: true,
      onHover: callbacks.onHover,
      onClick: callbacks.onClick,
      extensions: [zoneFilterExt],
      getFilterValue: (d: CraftingMapEntity) => isInZone(d.zoneId),
      filterRange: [1, 1],
      updateTriggers: {
        getFilterValue: focusedZoneId,
      },
    }),

    // Forges (crafting stations that are not cooking ovens)
    new ScatterplotLayer({
      id: "forges",
      data: filtered.forges,
      visible: visibility.forges,
      getPosition: (d: CraftingMapEntity) => d.position,
      getFillColor: LAYER_COLORS.crafting,
      getRadius: LAYER_RADII.crafting,
      radiusUnits: "pixels",
      radiusMinPixels: 3,
      radiusMaxPixels: 10,
      pickable: true,
      onHover: callbacks.onHover,
      onClick: callbacks.onClick,
      extensions: [zoneFilterExt],
      getFilterValue: (d: CraftingMapEntity) => isInZone(d.zoneId),
      filterRange: [1, 1],
      updateTriggers: {
        getFilterValue: focusedZoneId,
      },
    }),

    // Cooking Ovens
    new ScatterplotLayer({
      id: "cooking-ovens",
      data: filtered.cookingOvens,
      visible: visibility.cookingOvens,
      getPosition: (d: CraftingMapEntity) => d.position,
      getFillColor: LAYER_COLORS.crafting,
      getRadius: LAYER_RADII.crafting,
      radiusUnits: "pixels",
      radiusMinPixels: 3,
      radiusMaxPixels: 10,
      pickable: true,
      onHover: callbacks.onHover,
      onClick: callbacks.onClick,
      extensions: [zoneFilterExt],
      getFilterValue: (d: CraftingMapEntity) => isInZone(d.zoneId),
      filterRange: [1, 1],
      updateTriggers: {
        getFilterValue: focusedZoneId,
      },
    }),

    // Chests
    new ScatterplotLayer({
      id: "chests",
      data: filtered.chests,
      visible: visibility.chests,
      getPosition: (d: ChestMapEntity) => d.position,
      getFillColor: LAYER_COLORS.chest,
      getRadius: LAYER_RADII.chest,
      radiusUnits: "pixels",
      radiusMinPixels: 3,
      radiusMaxPixels: 10,
      pickable: true,
      onHover: callbacks.onHover,
      onClick: callbacks.onClick,
      extensions: [zoneFilterExt],
      getFilterValue: (d: ChestMapEntity) => isInZone(d.zoneId),
      filterRange: [1, 1],
      updateTriggers: {
        getFilterValue: focusedZoneId,
      },
    }),

    // Altars
    new ScatterplotLayer({
      id: "altars",
      data: filtered.altars,
      visible: visibility.altars,
      getPosition: (d: AltarMapEntity) => d.position,
      getFillColor: LAYER_COLORS.altar,
      getRadius: LAYER_RADII.altar,
      radiusUnits: "pixels",
      radiusMinPixels: 4,
      radiusMaxPixels: 14,
      pickable: true,
      onHover: callbacks.onHover,
      onClick: callbacks.onClick,
      extensions: [zoneFilterExt],
      getFilterValue: (d: AltarMapEntity) => isInZone(d.zoneId),
      filterRange: [1, 1],
      updateTriggers: {
        getFilterValue: focusedZoneId,
      },
    }),

    // Portal connection lines (rendered first, below markers)
    // Show if EITHER source or destination is in focused zone
    new LineLayer({
      id: "portal-arcs",
      data: filtered.portalsWithDestinations,
      visible: visibility.portals,
      getSourcePosition: (d: PortalMapEntity) => d.position,
      getTargetPosition: (d: PortalMapEntity) => d.destination,
      getColor: (d: PortalMapEntity) =>
        d.id === selectedPortalId
          ? ARC_COLORS.portalHighlight.source
          : ARC_COLORS.portal.source,
      getWidth: (d: PortalMapEntity) => (d.id === selectedPortalId ? 4 : 2),
      widthUnits: "pixels",
      pickable: true,
      onHover: callbacks.onHover,
      onClick: callbacks.onClick,
      extensions: [zoneFilterExt],
      getFilterValue: (d: PortalMapEntity) =>
        !focusedZoneId ||
        d.zoneId === focusedZoneId ||
        d.destinationZoneId === focusedZoneId
          ? 1
          : 0,
      filterRange: [1, 1],
      updateTriggers: {
        getColor: selectedPortalId,
        getWidth: selectedPortalId,
        getFilterValue: focusedZoneId,
      },
    }),

    // Portal entry points - white fill with green stroke
    // Show if portal is IN zone OR leads TO zone
    new ScatterplotLayer({
      id: "portals",
      data: filtered.portals,
      visible: visibility.portals,
      getPosition: (d: PortalMapEntity) => d.position,
      filled: true,
      stroked: true,
      getFillColor: [255, 255, 255, 255] as [number, number, number, number],
      getLineColor: LAYER_COLORS.portal,
      getRadius: LAYER_RADII.portal,
      lineWidthUnits: "pixels",
      getLineWidth: 2,
      radiusUnits: "pixels",
      radiusMinPixels: 4,
      radiusMaxPixels: 12,
      pickable: true,
      onHover: callbacks.onHover,
      onClick: callbacks.onClick,
      extensions: [zoneFilterExt],
      getFilterValue: (d: PortalMapEntity) =>
        !focusedZoneId ||
        d.zoneId === focusedZoneId ||
        d.destinationZoneId === focusedZoneId
          ? 1
          : 0,
      filterRange: [1, 1],
      updateTriggers: {
        getFilterValue: focusedZoneId,
      },
    }),

    // Portal destination markers - dark gray fill with green stroke
    // Show if EITHER source or destination is in focused zone
    new ScatterplotLayer({
      id: "portal-destinations",
      data: filtered.portalsWithDestinations,
      visible: visibility.portals,
      getPosition: (d: PortalMapEntity) => d.destination,
      filled: true,
      stroked: true,
      getFillColor: [60, 60, 60, 255] as [number, number, number, number],
      getLineColor: (d: PortalMapEntity) =>
        d.id === selectedPortalId
          ? ARC_COLORS.portalHighlight.source
          : ARC_COLORS.portal.source,
      getRadius: (d: PortalMapEntity) => (d.id === selectedPortalId ? 6 : 4),
      lineWidthUnits: "pixels",
      getLineWidth: (d: PortalMapEntity) =>
        d.id === selectedPortalId ? 2 : 1.5,
      radiusUnits: "pixels",
      radiusMinPixels: 3,
      radiusMaxPixels: 10,
      pickable: true,
      onHover: callbacks.onHover,
      onClick: callbacks.onClick,
      extensions: [zoneFilterExt],
      getFilterValue: (d: PortalMapEntity) =>
        !focusedZoneId ||
        d.zoneId === focusedZoneId ||
        d.destinationZoneId === focusedZoneId
          ? 1
          : 0,
      filterRange: [1, 1],
      updateTriggers: {
        getLineColor: selectedPortalId,
        getRadius: selectedPortalId,
        getLineWidth: selectedPortalId,
        getFilterValue: focusedZoneId,
      },
    }),

    // Patrol path layers (rendered below monsters so paths don't obscure them)
    ...createPatrolPathLayers(patrolPathData, ScatterplotLayer, LineLayer),

    // Creatures (regular monsters, not boss/elite/hunt) - GPU-filtered by level and zone
    new ScatterplotLayer({
      id: "creatures",
      data: filtered.creatures,
      visible: visibility.creatures,
      getPosition: (d: MonsterMapEntity) => d.position,
      getFillColor: LAYER_COLORS.monster,
      getRadius: LAYER_RADII.monster,
      radiusUnits: "pixels",
      radiusMinPixels: 2,
      radiusMaxPixels: 10,
      pickable: true,
      onHover: callbacks.onHover,
      onClick: callbacks.onClick,
      extensions: [levelZoneFilterExt],
      getFilterValue: (d: MonsterMapEntity) => [d.level, isInZone(d.zoneId)],
      filterRange: [
        [levelFilter.monsterMin, levelFilter.monsterMax],
        [1, 1],
      ],
      updateTriggers: {
        getFilterValue: focusedZoneId,
        filterRange: [levelFilter.monsterMin, levelFilter.monsterMax],
      },
    }),

    // Hunts (huntable animals) - GPU-filtered by level and zone
    new ScatterplotLayer({
      id: "hunts",
      data: filtered.hunts,
      visible: visibility.hunts,
      getPosition: (d: MonsterMapEntity) => d.position,
      getFillColor: LAYER_COLORS.hunt,
      getRadius: LAYER_RADII.monster,
      radiusUnits: "pixels",
      radiusMinPixels: 2,
      radiusMaxPixels: 10,
      pickable: true,
      onHover: callbacks.onHover,
      onClick: callbacks.onClick,
      extensions: [levelZoneFilterExt],
      getFilterValue: (d: MonsterMapEntity) => [d.level, isInZone(d.zoneId)],
      filterRange: [
        [levelFilter.monsterMin, levelFilter.monsterMax],
        [1, 1],
      ],
      updateTriggers: {
        getFilterValue: focusedZoneId,
        filterRange: [levelFilter.monsterMin, levelFilter.monsterMax],
      },
    }),

    // Elite monsters - background (black ring)
    new ScatterplotLayer({
      id: "elites-bg",
      data: filtered.elites,
      visible: visibility.elites,
      getPosition: (d: MonsterMapEntity) => d.position,
      getFillColor: [0, 0, 0, 255] as [number, number, number, number],
      getRadius: LAYER_RADII.elite + 2,
      radiusUnits: "pixels",
      radiusMinPixels: 5,
      radiusMaxPixels: 14,
      pickable: false,
      extensions: [levelZoneFilterExt],
      getFilterValue: (d: MonsterMapEntity) => [d.level, isInZone(d.zoneId)],
      filterRange: [
        [levelFilter.monsterMin, levelFilter.monsterMax],
        [1, 1],
      ],
      updateTriggers: {
        getFilterValue: focusedZoneId,
        filterRange: [levelFilter.monsterMin, levelFilter.monsterMax],
      },
    }),

    // Elite monsters - fill (purple center)
    new ScatterplotLayer({
      id: "elites",
      data: filtered.elites,
      visible: visibility.elites,
      getPosition: (d: MonsterMapEntity) => d.position,
      getFillColor: LAYER_COLORS.elite,
      getRadius: LAYER_RADII.elite,
      radiusUnits: "pixels",
      radiusMinPixels: 3,
      radiusMaxPixels: 12,
      pickable: true,
      onHover: callbacks.onHover,
      onClick: callbacks.onClick,
      extensions: [levelZoneFilterExt],
      getFilterValue: (d: MonsterMapEntity) => [d.level, isInZone(d.zoneId)],
      filterRange: [
        [levelFilter.monsterMin, levelFilter.monsterMax],
        [1, 1],
      ],
      updateTriggers: {
        getFilterValue: focusedZoneId,
        filterRange: [levelFilter.monsterMin, levelFilter.monsterMax],
      },
    }),

    // Boss monsters - background (black ring)
    new ScatterplotLayer({
      id: "bosses-bg",
      data: filtered.bosses,
      visible: visibility.bosses,
      getPosition: (d: MonsterMapEntity) => d.position,
      getFillColor: [0, 0, 0, 255] as [number, number, number, number],
      getRadius: LAYER_RADII.boss + 3,
      radiusUnits: "pixels",
      radiusMinPixels: 7,
      radiusMaxPixels: 19,
      pickable: false,
      extensions: [levelZoneFilterExt],
      getFilterValue: (d: MonsterMapEntity) => [d.level, isInZone(d.zoneId)],
      filterRange: [
        [levelFilter.monsterMin, levelFilter.monsterMax],
        [1, 1],
      ],
      updateTriggers: {
        getFilterValue: focusedZoneId,
        filterRange: [levelFilter.monsterMin, levelFilter.monsterMax],
      },
    }),

    // Boss monsters - fill (cyan center)
    new ScatterplotLayer({
      id: "bosses",
      data: filtered.bosses,
      visible: visibility.bosses,
      getPosition: (d: MonsterMapEntity) => d.position,
      getFillColor: LAYER_COLORS.boss,
      getRadius: LAYER_RADII.boss,
      radiusUnits: "pixels",
      radiusMinPixels: 5,
      radiusMaxPixels: 16,
      pickable: true,
      onHover: callbacks.onHover,
      onClick: callbacks.onClick,
      extensions: [levelZoneFilterExt],
      getFilterValue: (d: MonsterMapEntity) => [d.level, isInZone(d.zoneId)],
      filterRange: [
        [levelFilter.monsterMin, levelFilter.monsterMax],
        [1, 1],
      ],
      updateTriggers: {
        getFilterValue: focusedZoneId,
        filterRange: [levelFilter.monsterMin, levelFilter.monsterMax],
      },
    }),

    // NPCs (single layer, filtered by visible role types and zone using OR logic)
    // An NPC is visible if ANY of its roles match an enabled role toggle AND it's in the focused zone
    new ScatterplotLayer({
      id: "npcs",
      data: filtered.npcs,
      visible: isAnyNpcTypeVisible(visibility),
      getPosition: (d: NpcMapEntity) => d.position,
      getFillColor: LAYER_COLORS.npc,
      getRadius: LAYER_RADII.npc,
      radiusUnits: "pixels",
      radiusMinPixels: 3,
      radiusMaxPixels: 10,
      pickable: true,
      onHover: callbacks.onHover,
      onClick: callbacks.onClick,
      // GPU-based filtering: [roleMatch, zoneMatch]
      extensions: [levelZoneFilterExt],
      getFilterValue: (d: NpcMapEntity) => {
        // Check each role against visibility toggles
        let roleMatch = 0;
        if (visibility.npcVendors && d.isVendor) roleMatch = 1;
        else if (visibility.npcQuestGivers && d.isQuestGiver) roleMatch = 1;
        else if (visibility.npcRepair && d.canRepair) roleMatch = 1;
        else if (visibility.npcBanks && d.isBank) roleMatch = 1;
        else if (visibility.npcInnkeepers && d.isInnkeeper) roleMatch = 1;
        else if (visibility.npcSoulBinders && d.isSoulBinder) roleMatch = 1;
        else if (visibility.npcSkillTrainers && d.isSkillTrainer) roleMatch = 1;
        else if (visibility.npcVeteranTrainers && d.isVeteranTrainer)
          roleMatch = 1;
        else if (visibility.npcAttributeReset && d.isAttributeReset)
          roleMatch = 1;
        else if (visibility.npcFactionVendors && d.isFactionVendor)
          roleMatch = 1;
        else if (visibility.npcEssenceTraders && d.isEssenceTrader)
          roleMatch = 1;
        else if (visibility.npcAugmenters && d.isAugmenter) roleMatch = 1;
        else if (visibility.npcPriestesses && d.isPriestess) roleMatch = 1;
        else if (visibility.npcRenewalSages && d.isRenewalSage) roleMatch = 1;
        else if (visibility.npcAdventurerTasks && d.isAdventurerTaskgiver)
          roleMatch = 1;
        else if (visibility.npcAdventurerVendors && d.isAdventurerVendor)
          roleMatch = 1;
        else if (visibility.npcMercenaryRecruiters && d.isMercenaryRecruiter)
          roleMatch = 1;
        else if (visibility.npcGuards && d.isGuard) roleMatch = 1;
        return [roleMatch, isInZone(d.zoneId)];
      },
      filterRange: [
        [1, 1],
        [1, 1],
      ],
      updateTriggers: {
        getFilterValue: [
          visibility.npcVendors,
          visibility.npcQuestGivers,
          visibility.npcRepair,
          visibility.npcBanks,
          visibility.npcInnkeepers,
          visibility.npcSoulBinders,
          visibility.npcSkillTrainers,
          visibility.npcVeteranTrainers,
          visibility.npcAttributeReset,
          visibility.npcFactionVendors,
          visibility.npcEssenceTraders,
          visibility.npcAugmenters,
          visibility.npcPriestesses,
          visibility.npcRenewalSages,
          visibility.npcAdventurerTasks,
          visibility.npcAdventurerVendors,
          visibility.npcMercenaryRecruiters,
          visibility.npcGuards,
          focusedZoneId,
        ],
      },
    }),

    // Selection highlight layer (on top of everything)
    // Data is pre-computed by caller and passed in - no filtering here!
    new ScatterplotLayer({
      id: "selection-highlight",
      data: selectionData,
      visible: selectionData.length > 0,
      getPosition: (d: AnyMapEntity) => d.position,
      getFillColor: HIGHLIGHT_COLORS.fill,
      getLineColor: HIGHLIGHT_COLORS.ring,
      getRadius: 12,
      radiusUnits: "pixels",
      radiusMinPixels: 8,
      radiusMaxPixels: 20,
      lineWidthMinPixels: 2,
      lineWidthMaxPixels: 3,
      stroked: true,
      pickable: false,
    }),
  ];
}

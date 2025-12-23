import type {
  MapEntityData,
  FilteredMapData,
  LayerVisibility,
  LevelFilter,
  AnyMapEntity,
  MonsterMapEntity,
  GatheringMapEntity,
  ZoneBoundary,
  PortalMapEntity,
} from "$lib/types/map";
import {
  LAYER_COLORS,
  LAYER_RADII,
  BACKGROUND_COLOR,
  WORLD_BOUNDS,
  ZONE_COLORS,
  ARC_COLORS,
  HIGHLIGHT_COLORS,
} from "./config";
import { EMPTY_SELECTION } from "./selection";

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
 */
export function createFilteredData(data: MapEntityData): FilteredMapData {
  return {
    regularMonsters: data.monsters.filter((m) => !m.isBoss && !m.isElite),
    elites: data.monsters.filter((m) => m.isElite && !m.isBoss),
    bosses: data.monsters.filter((m) => m.isBoss),
    plants: data.gathering.filter((g) => g.type === "gathering_plant"),
    minerals: data.gathering.filter((g) => g.type === "gathering_mineral"),
    sparks: data.gathering.filter((g) => g.type === "gathering_spark"),
    portalsWithDestinations: data.portals.filter((p) => p.destination !== null),
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
    if (!entity.zoneName) continue;
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
 * Create all deck.gl layers (optimized: uses pre-filtered data, visible prop, updateTriggers)
 *
 * @param selectionData - Pre-computed array of entities to highlight (use EMPTY_SELECTION when none)
 */
export function createLayers(
  data: MapEntityData,
  filtered: FilteredMapData,
  visibility: LayerVisibility,
  modules: DeckModules,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callbacks: { onHover: (info: any) => void; onClick: (info: any) => void },
  levelFilter: LevelFilter,
  selectedPortalId: string | null,
  selectionData: AnyMapEntity[] = EMPTY_SELECTION,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any[] {
  const { ScatterplotLayer, PolygonLayer, LineLayer, DataFilterExtension } =
    modules;

  // Shared extension instance for level filtering
  const dataFilterExt = new DataFilterExtension({ filterSize: 1 });

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
    }),

    // Sub-zone boundaries
    new PolygonLayer({
      id: "sub-zones",
      data: data.subZones,
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
    }),

    // Gathering plants (GPU-filtered by tier)
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
      extensions: [dataFilterExt],
      getFilterValue: (d: GatheringMapEntity) => d.level,
      filterRange: [levelFilter.gatheringMin, levelFilter.gatheringMax],
      updateTriggers: {
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
      extensions: [dataFilterExt],
      getFilterValue: (d: GatheringMapEntity) => d.level,
      filterRange: [levelFilter.gatheringMin, levelFilter.gatheringMax],
      updateTriggers: {
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
      extensions: [dataFilterExt],
      getFilterValue: (d: GatheringMapEntity) => d.level,
      filterRange: [levelFilter.gatheringMin, levelFilter.gatheringMax],
      updateTriggers: {
        filterRange: [levelFilter.gatheringMin, levelFilter.gatheringMax],
      },
    }),

    // Crafting stations
    new ScatterplotLayer({
      id: "crafting-stations",
      data: data.crafting,
      visible: visibility.crafting,
      getPosition: (d: AnyMapEntity) => d.position,
      getFillColor: LAYER_COLORS.crafting,
      getRadius: LAYER_RADII.crafting,
      radiusUnits: "pixels",
      radiusMinPixels: 3,
      radiusMaxPixels: 10,
      pickable: true,
      onHover: callbacks.onHover,
      onClick: callbacks.onClick,
    }),

    // Chests
    new ScatterplotLayer({
      id: "chests",
      data: data.chests,
      visible: visibility.chests,
      getPosition: (d: AnyMapEntity) => d.position,
      getFillColor: LAYER_COLORS.chest,
      getRadius: LAYER_RADII.chest,
      radiusUnits: "pixels",
      radiusMinPixels: 3,
      radiusMaxPixels: 10,
      pickable: true,
      onHover: callbacks.onHover,
      onClick: callbacks.onClick,
    }),

    // Altars
    new ScatterplotLayer({
      id: "altars",
      data: data.altars,
      visible: visibility.altars,
      getPosition: (d: AnyMapEntity) => d.position,
      getFillColor: LAYER_COLORS.altar,
      getRadius: LAYER_RADII.altar,
      radiusUnits: "pixels",
      radiusMinPixels: 4,
      radiusMaxPixels: 14,
      pickable: true,
      onHover: callbacks.onHover,
      onClick: callbacks.onClick,
    }),

    // Portal connection lines (rendered first, below markers)
    new LineLayer({
      id: "portal-arcs",
      data: filtered.portalsWithDestinations,
      visible: visibility.portalArcs,
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
      updateTriggers: {
        getColor: selectedPortalId,
        getWidth: selectedPortalId,
      },
    }),

    // Portal entry points - white fill with green stroke
    new ScatterplotLayer({
      id: "portals",
      data: data.portals,
      visible: visibility.portals,
      getPosition: (d: AnyMapEntity) => d.position,
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
    }),

    // Portal destination markers - dark gray fill with green stroke
    new ScatterplotLayer({
      id: "portal-destinations",
      data: filtered.portalsWithDestinations,
      visible: visibility.portalArcs,
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
      updateTriggers: {
        getLineColor: selectedPortalId,
        getRadius: selectedPortalId,
        getLineWidth: selectedPortalId,
      },
    }),

    // Regular monsters (GPU-filtered by level)
    new ScatterplotLayer({
      id: "monsters",
      data: filtered.regularMonsters,
      visible: visibility.monsters,
      getPosition: (d: MonsterMapEntity) => d.position,
      getFillColor: LAYER_COLORS.monster,
      getRadius: LAYER_RADII.monster,
      radiusUnits: "pixels",
      radiusMinPixels: 2,
      radiusMaxPixels: 10,
      pickable: true,
      onHover: callbacks.onHover,
      onClick: callbacks.onClick,
      extensions: [dataFilterExt],
      getFilterValue: (d: MonsterMapEntity) => d.level,
      filterRange: [levelFilter.monsterMin, levelFilter.monsterMax],
      updateTriggers: {
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
      extensions: [dataFilterExt],
      getFilterValue: (d: MonsterMapEntity) => d.level,
      filterRange: [levelFilter.monsterMin, levelFilter.monsterMax],
      updateTriggers: {
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
      extensions: [dataFilterExt],
      getFilterValue: (d: MonsterMapEntity) => d.level,
      filterRange: [levelFilter.monsterMin, levelFilter.monsterMax],
      updateTriggers: {
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
      extensions: [dataFilterExt],
      getFilterValue: (d: MonsterMapEntity) => d.level,
      filterRange: [levelFilter.monsterMin, levelFilter.monsterMax],
      updateTriggers: {
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
      extensions: [dataFilterExt],
      getFilterValue: (d: MonsterMapEntity) => d.level,
      filterRange: [levelFilter.monsterMin, levelFilter.monsterMax],
      updateTriggers: {
        filterRange: [levelFilter.monsterMin, levelFilter.monsterMax],
      },
    }),

    // NPCs (on top for visibility)
    new ScatterplotLayer({
      id: "npcs",
      data: data.npcs,
      visible: visibility.npcs,
      getPosition: (d: AnyMapEntity) => d.position,
      getFillColor: LAYER_COLORS.npc,
      getRadius: LAYER_RADII.npc,
      radiusUnits: "pixels",
      radiusMinPixels: 3,
      radiusMaxPixels: 10,
      pickable: true,
      onHover: callbacks.onHover,
      onClick: callbacks.onClick,
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

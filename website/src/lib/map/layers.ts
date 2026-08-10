import {
  NPC_ROLE_BITS,
  type MapEntityData,
  type FilteredMapData,
  type LayerVisibility,
  type LevelFilter,
  type AnyMapEntity,
  type MonsterMapEntity,
  type NpcMapEntity,
  type GatheringMapEntity,
  type CraftingMapEntity,
  type ZoneBoundary,
  type ParentZoneBoundary,
  type PortalMapEntity,
  type ChestMapEntity,
  type TreasureMapEntity,
  type AltarMapEntity,
  type TrapMapEntity,
  type HouseMapEntity,
} from "$lib/types/map";
import type { ZoneFocusedData } from "./zone-filter";
import { isAnyNpcTypeVisible } from "./visibility";
import {
  MARKER_COLORS,
  MARKER_ICON_SIZES,
  MARKER_ICON_TYPES,
  MARKER_RADII,
  resolveMarker,
  type MarkerId,
} from "./marker-registry";
import {
  LAYER_COLORS,
  BACKGROUND_COLOR,
  WORLD_BOUNDS,
  ZONE_COLORS,
  ARC_COLORS,
  PATROL_COLORS,
  HIGHLIGHT_COLORS,
  RELATION_ARC_COLORS,
  MOVEMENT_COLORS,
  ALTAR_RADIUS_COLORS,
  TRAP_AREA_COLORS,
  TILE_CONFIG,
} from "./config";
import {
  EMPTY_SELECTION,
  EMPTY_PATROL_DATA,
  EMPTY_RELATION_ARCS,
  type PatrolPathData,
  type RelationArcData,
} from "./selection";

// Type for deck.gl layer constructor (we use any since deck.gl types are complex)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LayerConstructor = new (props: any) => any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExtensionConstructor = new (props: any) => any;

interface DeckModules {
  ScatterplotLayer: LayerConstructor;
  IconLayer: LayerConstructor;
  PolygonLayer: LayerConstructor;
  LineLayer: LayerConstructor;
  TileLayer: LayerConstructor;
  BitmapLayer: LayerConstructor;
  DataFilterExtension: ExtensionConstructor;
}

export interface IconAtlasData {
  atlas: HTMLCanvasElement;
  mapping: Record<
    string,
    { x: number; y: number; width: number; height: number; mask: boolean }
  >;
}

/**
 * Pre-filter entity data once on load (expensive operation, do once)
 * Filters out entities without positions (they're kept in entityData for popups)
 */
export function createFilteredData(data: MapEntityData): FilteredMapData {
  // Only include entities with valid positions for rendering. Partitioning uses
  // the registry's match and precedence rules; it must not grow a second switch.
  const renderableMonsters = data.monsters.filter((m) => m.position !== null);
  const renderableGathering = data.gathering.filter((g) => g.position !== null);
  const renderableCrafting = data.crafting.filter((c) => c.position !== null);
  const renderablePortals = data.portals.filter((p) => p.position !== null);
  const renderableNpcs = data.npcs.filter((n) => n.position !== null);
  const renderableHouses = data.houses.filter((h) => h.position !== null);

  const creatures: MonsterMapEntity[] = [];
  const elites: MonsterMapEntity[] = [];
  const fabled: MonsterMapEntity[] = [];
  const bosses: MonsterMapEntity[] = [];
  const hunts: MonsterMapEntity[] = [];
  for (const monster of renderableMonsters) {
    switch (resolveMarker(monster)) {
      case "creatures":
        creatures.push(monster);
        break;
      case "elites":
        elites.push(monster);
        break;
      case "fabled":
        fabled.push(monster);
        break;
      case "bosses":
        bosses.push(monster);
        break;
      case "hunts":
        hunts.push(monster);
        break;
    }
  }

  const plants: GatheringMapEntity[] = [];
  const minerals: GatheringMapEntity[] = [];
  const sparks: GatheringMapEntity[] = [];
  const fishingSpots: GatheringMapEntity[] = [];
  const otherGathering: GatheringMapEntity[] = [];
  for (const resource of renderableGathering) {
    switch (resolveMarker(resource)) {
      case "gatheringPlants":
        plants.push(resource);
        break;
      case "gatheringMinerals":
        minerals.push(resource);
        break;
      case "gatheringSparks":
        sparks.push(resource);
        break;
      case "gatheringFishing":
        fishingSpots.push(resource);
        break;
      case "gatheringOther":
        otherGathering.push(resource);
        break;
    }
  }

  const alchemyTables: CraftingMapEntity[] = [];
  const forges: CraftingMapEntity[] = [];
  const cookingOvens: CraftingMapEntity[] = [];
  const scribingTables: CraftingMapEntity[] = [];
  for (const station of renderableCrafting) {
    switch (resolveMarker(station)) {
      case "alchemyTables":
        alchemyTables.push(station);
        break;
      case "forges":
        forges.push(station);
        break;
      case "cookingOvens":
        cookingOvens.push(station);
        break;
      case "scribingTables":
        scribingTables.push(station);
        break;
    }
  }

  return {
    creatures,
    elites,
    fabled,
    bosses,
    hunts,
    plants,
    minerals,
    sparks,
    fishingSpots,
    otherGathering,
    alchemyTables,
    forges,
    cookingOvens,
    scribingTables,
    houses: renderableHouses,
    portalsWithDestinations: renderablePortals.filter(
      (p) => p.destination !== null && !p.isClosed,
    ),
    teleportersWithDestinations: renderableNpcs.filter(
      (n) => n.hasTeleport && n.teleportDestination !== null,
    ),
    parentZones: data.parentZones,
  };
}

/**
 * Create visibility bitmask from current layer visibility state.
 * Each bit position corresponds to an NPC role (must match NPC_ROLE_BITS).
 */
function createNpcVisibilityBitmask(visibility: LayerVisibility): number {
  let mask = 0;
  if (visibility.npcVendors) mask |= 1 << NPC_ROLE_BITS.isVendor;
  if (visibility.npcQuestGivers) mask |= 1 << NPC_ROLE_BITS.isQuestGiver;
  if (visibility.npcRepair) mask |= 1 << NPC_ROLE_BITS.canRepair;
  if (visibility.npcBanks) mask |= 1 << NPC_ROLE_BITS.isBank;
  if (visibility.npcInnkeepers) mask |= 1 << NPC_ROLE_BITS.isInnkeeper;
  if (visibility.npcSoulBinders) mask |= 1 << NPC_ROLE_BITS.isSoulBinder;
  if (visibility.npcSkillTrainers) mask |= 1 << NPC_ROLE_BITS.isSkillTrainer;
  if (visibility.npcVeteranTrainers)
    mask |= 1 << NPC_ROLE_BITS.isVeteranTrainer;
  if (visibility.npcAttributeReset) mask |= 1 << NPC_ROLE_BITS.isAttributeReset;
  if (visibility.npcFactionVendors) mask |= 1 << NPC_ROLE_BITS.isFactionVendor;
  if (visibility.npcEssenceTraders) mask |= 1 << NPC_ROLE_BITS.isEssenceTrader;
  if (visibility.npcAugmenters) mask |= 1 << NPC_ROLE_BITS.isAugmenter;
  if (visibility.npcPriestesses) mask |= 1 << NPC_ROLE_BITS.isPriestess;
  if (visibility.npcRenewalSages) mask |= 1 << NPC_ROLE_BITS.isRenewalSage;
  if (visibility.npcAdventurerTasks)
    mask |= 1 << NPC_ROLE_BITS.isAdventurerTaskgiver;
  if (visibility.npcAdventurerVendors)
    mask |= 1 << NPC_ROLE_BITS.isAdventurerVendor;
  if (visibility.npcMercenaryRecruiters)
    mask |= 1 << NPC_ROLE_BITS.isMercenaryRecruiter;
  if (visibility.npcGuards) mask |= 1 << NPC_ROLE_BITS.isGuard;
  if (visibility.npcTeleporters) mask |= 1 << NPC_ROLE_BITS.isTeleporter;
  if (visibility.npcVillagers) mask |= 1 << NPC_ROLE_BITS.isVillager;
  if (visibility.npcGuildManagers) mask |= 1 << NPC_ROLE_BITS.isGuildManagement;
  if (visibility.npcBarbers) mask |= 1 << NPC_ROLE_BITS.isBarber;
  return mask;
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
 * @param selectedEntity - The actual clicked entity (for primary highlight)
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
  relatedEntities: AnyMapEntity[] = EMPTY_SELECTION,
  relationArcData: RelationArcData = EMPTY_RELATION_ARCS,
  selectedEntity: AnyMapEntity | null = null,
  selectedZone: ParentZoneBoundary | null = null,
  hoverSelectionData: AnyMapEntity[] = EMPTY_SELECTION,
  hoverZone: ParentZoneBoundary | null = null,
  iconAtlas?: IconAtlasData,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any[] {
  const {
    ScatterplotLayer,
    IconLayer,
    PolygonLayer,
    LineLayer,
    TileLayer,
    BitmapLayer,
    DataFilterExtension,
  } = modules;

  // Helper to create entity point layer (IconLayer if atlas provided, else ScatterplotLayer)
  function createEntityLayer<T extends AnyMapEntity>(config: {
    id: string;
    markerId: MarkerId;
    data: T[];
    visible: boolean;
    color:
      | readonly [number, number, number]
      | readonly [number, number, number, number];
    radius: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extensions?: any[];

    getFilterValue?: (d: T) => number | number[];

    filterRange?: [number, number] | [number, number][];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateTriggers?: Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }): any {
    const iconType = MARKER_ICON_TYPES[config.markerId];
    const baseProps = {
      id: config.id,
      data: config.data,
      visible: config.visible,
      getPosition: (d: T) => d.position,
      pickable: true,
      onHover: callbacks.onHover,
      onClick: callbacks.onClick,
      extensions: config.extensions,
      getFilterValue: config.getFilterValue,
      filterRange: config.filterRange,
      updateTriggers: config.updateTriggers,
    };

    // Ensure color has alpha channel
    const colorWithAlpha: [number, number, number, number] =
      config.color.length === 4
        ? (config.color as [number, number, number, number])
        : ([...config.color, 255] as [number, number, number, number]);

    const sizeConfig = MARKER_ICON_SIZES[config.markerId];

    if (iconAtlas) {
      if (!iconAtlas.mapping[iconType]) {
        throw new Error(
          `Unknown icon type "${iconType}" - not found in icon atlas`,
        );
      }
      return new IconLayer({
        ...baseProps,
        iconAtlas: iconAtlas.atlas,
        iconMapping: iconAtlas.mapping,
        getIcon: () => iconType,
        getSize: sizeConfig.base,
        sizeUnits: "pixels",
        sizeMinPixels: sizeConfig.min,
        sizeMaxPixels: sizeConfig.max,
      });
    } else {
      return new ScatterplotLayer({
        ...baseProps,
        getFillColor: colorWithAlpha,
        getRadius: config.radius,
        radiusUnits: "pixels",
        radiusMinPixels: 2,
        radiusMaxPixels: 8,
      });
    }
  }

  // Shared extension instances for GPU filtering
  // filterSize: 1 for zone-only filtering
  const zoneFilterExt = new DataFilterExtension({ filterSize: 1 });
  // filterSize: 2 for level+zone filtering (monsters, gathering)
  const levelZoneFilterExt = new DataFilterExtension({ filterSize: 2 });

  // Helper to check if entity is in focused zone (or if no zone is focused)
  // Returns 0 for entities without a zone (they won't be rendered anyway due to null position)
  const isInZone = (zoneId: string | null): number =>
    !focusedZoneId || zoneId === focusedZoneId ? 1 : 0;

  // Pre-compute NPC visibility bitmask for GPU filtering
  const npcVisibilityMask = createNpcVisibilityBitmask(visibility);

  // === LAYER DEFINITIONS ===
  // Define all layers as variables, then compose render order at the end

  // Tile extent: [minX, minY, maxX, maxY] for deck.gl TileLayer
  const tileExtent: [number, number, number, number] = [
    WORLD_BOUNDS.minX,
    WORLD_BOUNDS.minY,
    WORLD_BOUNDS.maxX,
    WORLD_BOUNDS.maxY,
  ];

  // Map tiles layer - displays terrain imagery
  // Tiles are generated with deck.gl's coordinate system (tile 0,0 at world origin)
  const tileLayer = new TileLayer({
    id: "map-tiles",
    data: TILE_CONFIG.url,
    visible: visibility.tiles,
    minZoom: TILE_CONFIG.minZoom,
    maxZoom: TILE_CONFIG.maxZoom,
    tileSize: TILE_CONFIG.tileSize,
    extent: tileExtent,
    renderSubLayers: (
      props: {
        id: string;
        data: ImageBitmap | null;
        tile: {
          boundingBox: [[number, number], [number, number]];
        };
      } & Record<string, unknown>,
    ) => {
      if (!props.data) return null;

      const {
        boundingBox: [[west, south], [east, north]],
      } = props.tile;

      return new BitmapLayer({
        ...props,
        data: undefined,
        image: props.data,
        bounds: [west, south, east, north],
      });
    },
  });

  // Fallback background (solid color, renders behind tiles when they're loading)
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

  const backgroundLayer = new PolygonLayer({
    id: "background",
    data: backgroundData,
    getPolygon: (d: { polygon: [number, number][] }) => d.polygon,
    getFillColor: BACKGROUND_COLOR,
    pickable: false,
  });

  // Filter out zones without polygons (excluded zones like Temple of Valaark)
  const renderableParentZones = filtered.parentZones.filter(
    (z) => z.polygon !== null,
  );
  const parentZonesLayer = new PolygonLayer({
    id: "parent-zones",
    data: renderableParentZones,
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
    onClick: callbacks.onClick,
    extensions: [zoneFilterExt],
    getFilterValue: (d: ZoneBoundary) => isInZone(d.zoneId),
    filterRange: [1, 1],
    updateTriggers: {
      getFilterValue: focusedZoneId,
    },
  });

  const subZonesLayer = new PolygonLayer({
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
  });

  const gatheringPlantsLayer = createEntityLayer<GatheringMapEntity>({
    id: "gathering-plants",
    markerId: "gatheringPlants",
    data: filtered.plants,
    visible: visibility.gatheringPlants,
    color: MARKER_COLORS.gatheringPlants,
    radius: MARKER_RADII.gatheringPlants,
    extensions: [levelZoneFilterExt],
    getFilterValue: (d) => [d.level, isInZone(d.zoneId)],
    filterRange: [
      [levelFilter.gatheringMin, levelFilter.gatheringMax],
      [1, 1],
    ],
    updateTriggers: {
      getFilterValue: focusedZoneId,
      filterRange: [levelFilter.gatheringMin, levelFilter.gatheringMax],
    },
  });

  const gatheringMineralsLayer = createEntityLayer<GatheringMapEntity>({
    id: "gathering-minerals",
    markerId: "gatheringMinerals",
    data: filtered.minerals,
    visible: visibility.gatheringMinerals,
    color: MARKER_COLORS.gatheringMinerals,
    radius: MARKER_RADII.gatheringMinerals,
    extensions: [levelZoneFilterExt],
    getFilterValue: (d) => [d.level, isInZone(d.zoneId)],
    filterRange: [
      [levelFilter.gatheringMin, levelFilter.gatheringMax],
      [1, 1],
    ],
    updateTriggers: {
      getFilterValue: focusedZoneId,
      filterRange: [levelFilter.gatheringMin, levelFilter.gatheringMax],
    },
  });

  const gatheringFishingLayer = createEntityLayer<GatheringMapEntity>({
    id: "gathering-fishing",
    markerId: "gatheringFishing",
    data: filtered.fishingSpots,
    visible: visibility.gatheringFishing,
    color: MARKER_COLORS.gatheringFishing,
    radius: MARKER_RADII.gatheringFishing,
    extensions: [levelZoneFilterExt],
    getFilterValue: (d) => [d.level, isInZone(d.zoneId)],
    filterRange: [
      [levelFilter.gatheringMin, levelFilter.gatheringMax],
      [1, 1],
    ],
    updateTriggers: {
      getFilterValue: focusedZoneId,
      filterRange: [levelFilter.gatheringMin, levelFilter.gatheringMax],
    },
  });
  // Radiant sparks use zone-only filtering (excluded from tier filter)
  const gatheringSparksLayer = createEntityLayer<GatheringMapEntity>({
    id: "gathering-sparks",
    markerId: "gatheringSparks",
    data: filtered.sparks,
    visible: visibility.gatheringSparks,
    color: MARKER_COLORS.gatheringSparks,
    radius: MARKER_RADII.gatheringSparks,
    extensions: [zoneFilterExt],
    getFilterValue: (d) => isInZone(d.zoneId),
    filterRange: [1, 1],
    updateTriggers: {
      getFilterValue: focusedZoneId,
    },
  });

  // Other gathering resources use zone-only filtering (excluded from tier filter)
  const gatheringOtherLayer = createEntityLayer<GatheringMapEntity>({
    id: "gathering-other",
    markerId: "gatheringOther",
    data: filtered.otherGathering,
    visible: visibility.gatheringOther,
    color: MARKER_COLORS.gatheringOther,
    radius: MARKER_RADII.gatheringOther,
    extensions: [zoneFilterExt],
    getFilterValue: (d) => isInZone(d.zoneId),
    filterRange: [1, 1],
    updateTriggers: {
      getFilterValue: focusedZoneId,
    },
  });

  const alchemyTablesLayer = createEntityLayer<CraftingMapEntity>({
    id: "alchemy-tables",
    markerId: "alchemyTables",
    data: filtered.alchemyTables,
    visible: visibility.alchemyTables,
    color: MARKER_COLORS.alchemyTables,
    radius: MARKER_RADII.alchemyTables,
    extensions: [zoneFilterExt],
    getFilterValue: (d) => isInZone(d.zoneId),
    filterRange: [1, 1],
    updateTriggers: {
      getFilterValue: focusedZoneId,
    },
  });

  const forgesLayer = createEntityLayer<CraftingMapEntity>({
    id: "forges",
    markerId: "forges",
    data: filtered.forges,
    visible: visibility.forges,
    color: MARKER_COLORS.forges,
    radius: MARKER_RADII.forges,
    extensions: [zoneFilterExt],
    getFilterValue: (d) => isInZone(d.zoneId),
    filterRange: [1, 1],
    updateTriggers: {
      getFilterValue: focusedZoneId,
    },
  });

  const cookingOvensLayer = createEntityLayer<CraftingMapEntity>({
    id: "cooking-ovens",
    markerId: "cookingOvens",
    data: filtered.cookingOvens,
    visible: visibility.cookingOvens,
    color: MARKER_COLORS.cookingOvens,
    radius: MARKER_RADII.cookingOvens,
    extensions: [zoneFilterExt],
    getFilterValue: (d) => isInZone(d.zoneId),
    filterRange: [1, 1],
    updateTriggers: {
      getFilterValue: focusedZoneId,
    },
  });

  const scribingTablesLayer = createEntityLayer<CraftingMapEntity>({
    id: "scribing-tables",
    markerId: "scribingTables",
    data: filtered.scribingTables,
    visible: visibility.scribingTables,
    color: MARKER_COLORS.scribingTables,
    radius: MARKER_RADII.scribingTables,
    extensions: [zoneFilterExt],
    getFilterValue: (d) => isInZone(d.zoneId),
    filterRange: [1, 1],
    updateTriggers: {
      getFilterValue: focusedZoneId,
    },
  });

  const chestsLayer = createEntityLayer<ChestMapEntity>({
    id: "chests",
    markerId: "chests",
    data: filtered.chests,
    visible: visibility.chests,
    color: MARKER_COLORS.chests,
    radius: MARKER_RADII.chests,
    extensions: [zoneFilterExt],
    getFilterValue: (d) => isInZone(d.zoneId),
    filterRange: [1, 1],
    updateTriggers: {
      getFilterValue: focusedZoneId,
    },
  });

  const housesLayer = createEntityLayer<HouseMapEntity>({
    id: "houses",
    markerId: "houses",
    data: filtered.houses,
    visible: visibility.houses,
    color: MARKER_COLORS.houses,
    radius: MARKER_RADII.houses,
    extensions: [zoneFilterExt],
    getFilterValue: (d) => isInZone(d.zoneId),
    filterRange: [1, 1],
    updateTriggers: {
      getFilterValue: focusedZoneId,
    },
  });

  const treasureLayer = createEntityLayer<TreasureMapEntity>({
    id: "treasure",
    markerId: "treasure",
    data: filtered.treasure,
    visible: visibility.treasure,
    color: MARKER_COLORS.treasure,
    radius: MARKER_RADII.treasure,
    extensions: [zoneFilterExt],
    getFilterValue: (d) => isInZone(d.zoneId),
    filterRange: [1, 1],
    updateTriggers: {
      getFilterValue: focusedZoneId,
    },
  });

  const altarsLayer = createEntityLayer<AltarMapEntity>({
    id: "altars",
    markerId: "altars",
    data: filtered.altars,
    visible: visibility.altars,
    color: MARKER_COLORS.altars,
    radius: MARKER_RADII.altars,
    extensions: [zoneFilterExt],
    getFilterValue: (d) => isInZone(d.zoneId),
    filterRange: [1, 1],
    updateTriggers: {
      getFilterValue: focusedZoneId,
    },
  });

  const trapsLayer = createEntityLayer<TrapMapEntity>({
    id: "traps",
    markerId: "traps",
    data: filtered.traps,
    visible: visibility.traps,
    color: MARKER_COLORS.traps,
    radius: MARKER_RADII.traps,
    extensions: [zoneFilterExt],
    getFilterValue: (d) => isInZone(d.zoneId),
    filterRange: [1, 1],
    updateTriggers: {
      getFilterValue: focusedZoneId,
    },
  });

  const selectedTrapId =
    selectedEntity?.type === "trap" ? selectedEntity.id : null;

  const trapTeleportArcsLayer = new LineLayer({
    id: "trap-teleport-arcs",
    data: filtered.trapsWithDestinations,
    visible: visibility.traps,
    getSourcePosition: (d: TrapMapEntity) => d.position,
    getTargetPosition: (d: TrapMapEntity) => d.teleportPosition,
    getColor: (d: TrapMapEntity) =>
      d.id === selectedTrapId
        ? ARC_COLORS.trapHighlight.source
        : ARC_COLORS.trap.source,
    getWidth: (d: TrapMapEntity) => (d.id === selectedTrapId ? 4 : 2),
    widthUnits: "pixels",
    pickable: true,
    onHover: callbacks.onHover,
    onClick: callbacks.onClick,
    extensions: [zoneFilterExt],
    getFilterValue: (d: TrapMapEntity) =>
      !focusedZoneId ||
      d.zoneId === focusedZoneId ||
      d.teleportZoneId === focusedZoneId
        ? 1
        : 0,
    filterRange: [1, 1],
    updateTriggers: {
      getColor: selectedTrapId,
      getWidth: selectedTrapId,
      getFilterValue: focusedZoneId,
    },
  });

  const trapTeleportDestinationsLayer = new ScatterplotLayer({
    id: "trap-teleport-destinations",
    data: filtered.trapsWithDestinations,
    visible: visibility.traps,
    getPosition: (d: TrapMapEntity) => d.teleportPosition,
    getFillColor: LAYER_COLORS.trap,
    getRadius: 3,
    radiusUnits: "pixels",
    radiusMinPixels: 2,
    radiusMaxPixels: 6,
    pickable: false,
    extensions: [zoneFilterExt],
    getFilterValue: (d: TrapMapEntity) =>
      !focusedZoneId ||
      d.zoneId === focusedZoneId ||
      d.teleportZoneId === focusedZoneId
        ? 1
        : 0,
    filterRange: [1, 1],
    updateTriggers: {
      getFilterValue: focusedZoneId,
    },
  });

  const portalArcsLayer = new LineLayer({
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
  });

  const portalsLayer = createEntityLayer<PortalMapEntity>({
    id: "portals",
    markerId: "portals",
    data: filtered.portals,
    visible: visibility.portals,
    color: MARKER_COLORS.portals,
    radius: MARKER_RADII.portals,
    extensions: [zoneFilterExt],
    getFilterValue: (d) =>
      !focusedZoneId ||
      d.zoneId === focusedZoneId ||
      // Don't show closed portals based on destination (spoils where they lead)
      (!d.isClosed && d.destinationZoneId === focusedZoneId)
        ? 1
        : 0,
    filterRange: [1, 1],
    updateTriggers: {
      getFilterValue: focusedZoneId,
    },
  });

  // Portal destination markers - small dots (like patrol waypoints)
  const portalDestinationsLayer = new ScatterplotLayer({
    id: "portal-destinations",
    data: filtered.portalsWithDestinations,
    visible: visibility.portals,
    getPosition: (d: PortalMapEntity) => d.destination,
    getFillColor: LAYER_COLORS.portal,
    getRadius: 3,
    radiusUnits: "pixels",
    radiusMinPixels: 2,
    radiusMaxPixels: 6,
    pickable: false,
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
  });

  // Teleporter NPC arcs - connect NPC to teleport destination
  const teleporterArcsLayer = new LineLayer({
    id: "teleporter-arcs",
    data: filtered.teleportersWithDestinations,
    visible: visibility.npcTeleporters,
    getSourcePosition: (d: NpcMapEntity) => d.position,
    getTargetPosition: (d: NpcMapEntity) => d.teleportDestination,
    getColor: ARC_COLORS.teleporter.source,
    getWidth: 2,
    widthUnits: "pixels",
    pickable: false,
    extensions: [zoneFilterExt],
    getFilterValue: (d: NpcMapEntity) =>
      !focusedZoneId ||
      d.zoneId === focusedZoneId ||
      d.teleportZoneId === focusedZoneId
        ? 1
        : 0,
    filterRange: [1, 1],
    updateTriggers: {
      getFilterValue: focusedZoneId,
    },
  });

  // Teleporter destination markers - small dots at destination
  const teleporterDestinationsLayer = new ScatterplotLayer({
    id: "teleporter-destinations",
    data: filtered.teleportersWithDestinations,
    visible: visibility.npcTeleporters,
    getPosition: (d: NpcMapEntity) => d.teleportDestination,
    getFillColor: ARC_COLORS.teleporter.source.slice(0, 3) as [
      number,
      number,
      number,
    ],
    getRadius: 3,
    radiusUnits: "pixels",
    radiusMinPixels: 2,
    radiusMaxPixels: 6,
    pickable: false,
    extensions: [zoneFilterExt],
    getFilterValue: (d: NpcMapEntity) =>
      !focusedZoneId ||
      d.zoneId === focusedZoneId ||
      d.teleportZoneId === focusedZoneId
        ? 1
        : 0,
    filterRange: [1, 1],
    updateTriggers: {
      getFilterValue: focusedZoneId,
    },
  });

  const patrolPathLayers = createPatrolPathLayers(
    patrolPathData,
    ScatterplotLayer,
    LineLayer,
  );

  // Wander range layer - shows movement radius around selected entity
  // Only visible when selectedEntity has moveDistance > 0 AND is not patrolling
  // (patrolling entities use waypoints instead of random wandering)
  const hasWanderRange =
    selectedEntity &&
    selectedEntity.position !== null &&
    "moveDistance" in selectedEntity &&
    !(selectedEntity as MonsterMapEntity | NpcMapEntity).isPatrolling &&
    (selectedEntity as MonsterMapEntity | NpcMapEntity).moveDistance > 0;
  const wanderRangeData = hasWanderRange
    ? [
        {
          position: selectedEntity.position,
          radius: (selectedEntity as MonsterMapEntity | NpcMapEntity)
            .moveDistance,
        },
      ]
    : [];
  const wanderRangeLayer = new ScatterplotLayer({
    id: "wander-range",
    data: wanderRangeData,
    visible: wanderRangeData.length > 0,
    getPosition: (d: { position: [number, number]; radius: number }) =>
      d.position,
    getRadius: (d: { position: [number, number]; radius: number }) => d.radius,
    radiusUnits: "common",
    getFillColor: MOVEMENT_COLORS.wanderFill,
    getLineColor: MOVEMENT_COLORS.wanderStroke,
    stroked: true,
    lineWidthUnits: "pixels",
    lineWidthMinPixels: 1,
    lineWidthMaxPixels: 2,
    pickable: false,
  });

  // Altar event radius layer - shows the area for altar events when an altar is selected
  const hasAltarRadius =
    selectedEntity &&
    selectedEntity.type === "altar" &&
    selectedEntity.position !== null &&
    (selectedEntity as AltarMapEntity).radiusEvent > 0;
  const altarRadiusData = hasAltarRadius
    ? [
        {
          position: selectedEntity.position,
          radius: (selectedEntity as AltarMapEntity).radiusEvent,
        },
      ]
    : [];
  const altarEventRadiusLayer = new ScatterplotLayer({
    id: "altar-event-radius",
    data: altarRadiusData,
    visible: altarRadiusData.length > 0,
    getPosition: (d: { position: [number, number]; radius: number }) =>
      d.position,
    getRadius: (d: { position: [number, number]; radius: number }) => d.radius,
    radiusUnits: "common",
    getFillColor: ALTAR_RADIUS_COLORS.fill,
    getLineColor: ALTAR_RADIUS_COLORS.stroke,
    stroked: true,
    lineWidthUnits: "pixels",
    lineWidthMinPixels: 1,
    lineWidthMaxPixels: 2,
    pickable: false,
  });

  const trapAreaData =
    selectedEntity?.type === "trap"
      ? ((selectedEntity as TrapMapEntity).areaPaths ?? []).map((ring) => ({
          polygon: ring,
        }))
      : [];
  // Two passes: a dark halo carries the shape over bright terrain, the light
  // stroke on top carries it over dark terrain.
  const trapAreaHaloLayer = new PolygonLayer({
    id: "trap-area-halo",
    data: trapAreaData,
    visible: trapAreaData.length > 0,
    getPolygon: (d: { polygon: [number, number][] }) => d.polygon,
    getFillColor: TRAP_AREA_COLORS.fill,
    getLineColor: TRAP_AREA_COLORS.halo,
    filled: true,
    stroked: true,
    lineWidthUnits: "pixels",
    lineWidthMinPixels: 6,
    lineWidthMaxPixels: 8,
    pickable: false,
  });

  const trapAreaLayer = new PolygonLayer({
    id: "trap-area",
    data: trapAreaData,
    visible: trapAreaData.length > 0,
    getPolygon: (d: { polygon: [number, number][] }) => d.polygon,
    getLineColor: TRAP_AREA_COLORS.stroke,
    filled: false,
    stroked: true,
    lineWidthUnits: "pixels",
    lineWidthMinPixels: 2,
    lineWidthMaxPixels: 3,
    pickable: false,
  });

  const creaturesLayer = createEntityLayer<MonsterMapEntity>({
    id: "creatures",
    markerId: "creatures",
    data: filtered.creatures,
    visible: visibility.creatures,
    color: MARKER_COLORS.creatures,
    radius: MARKER_RADII.creatures,
    extensions: [levelZoneFilterExt],
    getFilterValue: (d) => [d.level, isInZone(d.zoneId)],
    filterRange: [
      [levelFilter.monsterMin, levelFilter.monsterMax],
      [1, 1],
    ],
    updateTriggers: {
      getFilterValue: focusedZoneId,
      filterRange: [levelFilter.monsterMin, levelFilter.monsterMax],
    },
  });

  const huntsLayer = createEntityLayer<MonsterMapEntity>({
    id: "hunts",
    markerId: "hunts",
    data: filtered.hunts,
    visible: visibility.hunts,
    color: MARKER_COLORS.hunts,
    radius: MARKER_RADII.hunts,
    extensions: [levelZoneFilterExt],
    getFilterValue: (d) => [d.level, isInZone(d.zoneId)],
    filterRange: [
      [levelFilter.monsterMin, levelFilter.monsterMax],
      [1, 1],
    ],
    updateTriggers: {
      getFilterValue: focusedZoneId,
      filterRange: [levelFilter.monsterMin, levelFilter.monsterMax],
    },
  });

  const elitesLayer = createEntityLayer<MonsterMapEntity>({
    id: "elites",
    markerId: "elites",
    data: filtered.elites,
    visible: visibility.elites,
    color: MARKER_COLORS.elites,
    radius: MARKER_RADII.elites,
    extensions: [levelZoneFilterExt],
    getFilterValue: (d) => [d.level, isInZone(d.zoneId)],
    filterRange: [
      [levelFilter.monsterMin, levelFilter.monsterMax],
      [1, 1],
    ],
    updateTriggers: {
      getFilterValue: focusedZoneId,
      filterRange: [levelFilter.monsterMin, levelFilter.monsterMax],
    },
  });

  const fabledLayer = createEntityLayer<MonsterMapEntity>({
    id: "fabled",
    markerId: "fabled",
    data: filtered.fabled,
    visible: visibility.fabled,
    color: MARKER_COLORS.fabled,
    radius: MARKER_RADII.fabled,
    extensions: [levelZoneFilterExt],
    getFilterValue: (d) => [d.level, isInZone(d.zoneId)],
    filterRange: [
      [levelFilter.monsterMin, levelFilter.monsterMax],
      [1, 1],
    ],
    updateTriggers: {
      getFilterValue: focusedZoneId,
      filterRange: [levelFilter.monsterMin, levelFilter.monsterMax],
    },
  });

  const bossesLayer = createEntityLayer<MonsterMapEntity>({
    id: "bosses",
    markerId: "bosses",
    data: filtered.bosses,
    visible: visibility.bosses,
    color: MARKER_COLORS.bosses,
    radius: MARKER_RADII.bosses,
    extensions: [levelZoneFilterExt],
    getFilterValue: (d) => [d.level, isInZone(d.zoneId)],
    filterRange: [
      [levelFilter.monsterMin, levelFilter.monsterMax],
      [1, 1],
    ],
    updateTriggers: {
      getFilterValue: focusedZoneId,
      filterRange: [levelFilter.monsterMin, levelFilter.monsterMax],
    },
  });

  const npcsLayer = createEntityLayer<NpcMapEntity>({
    id: "npcs",
    markerId: "npc",
    data: filtered.npcs,
    visible: isAnyNpcTypeVisible(visibility),
    color: MARKER_COLORS.npc,
    radius: MARKER_RADII.npc,
    extensions: [levelZoneFilterExt],
    getFilterValue: (d) => [
      // Bitwise AND: if any visible role matches the NPC's roles, result > 0
      (d.roleBitmask & npcVisibilityMask) > 0 ? 1 : 0,
      isInZone(d.zoneId),
    ],
    filterRange: [
      [1, 1],
      [1, 1],
    ],
    updateTriggers: {
      getFilterValue: [npcVisibilityMask, focusedZoneId],
    },
  });

  // Ring radius = half the icon diameter (so ring matches icon circle size)
  const getRingRadius = (d: AnyMapEntity): number => {
    const markerId =
      resolveMarker(d) ?? (d.type === "portal" ? "portals" : null);
    if (!markerId) return MARKER_ICON_SIZES.creatures.base / 2;
    return MARKER_ICON_SIZES[markerId].base / 2;
  };

  // Outline layer for selection highlight (dark shadow for visibility on bright backgrounds)
  const selectionHighlightOutlineLayer = new ScatterplotLayer({
    id: "selection-highlight-outline",
    data: selectionData,
    visible: selectionData.length > 0,
    getPosition: (d: AnyMapEntity) => d.position,
    getFillColor: [0, 0, 0, 0],
    getLineColor: HIGHLIGHT_COLORS.ringOutline,
    getRadius: getRingRadius,
    radiusUnits: "pixels",
    radiusMinPixels: 7,
    radiusMaxPixels: 48,
    stroked: true,
    lineWidthUnits: "pixels",
    getLineWidth: 5.5,
    pickable: false,
    updateTriggers: {
      getRadius: selectionData,
    },
  });

  const selectionHighlightLayer = new ScatterplotLayer({
    id: "selection-highlight",
    data: selectionData,
    visible: selectionData.length > 0,
    getPosition: (d: AnyMapEntity) => d.position,
    getFillColor: HIGHLIGHT_COLORS.fill,
    getLineColor: HIGHLIGHT_COLORS.ring,
    getRadius: getRingRadius,
    radiusUnits: "pixels",
    radiusMinPixels: 7,
    radiusMaxPixels: 48,
    stroked: true,
    lineWidthUnits: "pixels",
    getLineWidth: 3,
    pickable: false,
    updateTriggers: {
      getRadius: selectionData,
    },
  });

  // Primary selection highlight - the actual clicked entity (distinct from group)
  const primarySelectionData =
    selectedEntity?.position !== null && selectedEntity?.position !== undefined
      ? [selectedEntity]
      : [];

  // Outline layer for primary selection highlight
  const primarySelectionHighlightOutlineLayer = new ScatterplotLayer({
    id: "primary-selection-highlight-outline",
    data: primarySelectionData,
    visible: primarySelectionData.length > 0,
    getPosition: (d: AnyMapEntity) => d.position,
    getFillColor: [0, 0, 0, 0],
    getLineColor: HIGHLIGHT_COLORS.ringOutline,
    getRadius: (d: AnyMapEntity) => getRingRadius(d) + 4,
    radiusUnits: "pixels",
    radiusMinPixels: 11,
    radiusMaxPixels: 52,
    stroked: true,
    lineWidthUnits: "pixels",
    getLineWidth: 5.5,
    pickable: false,
    updateTriggers: {
      getRadius: selectedEntity,
    },
  });

  const primarySelectionHighlightLayer = new ScatterplotLayer({
    id: "primary-selection-highlight",
    data: primarySelectionData,
    visible: primarySelectionData.length > 0,
    getPosition: (d: AnyMapEntity) => d.position,
    getFillColor: HIGHLIGHT_COLORS.primaryFill,
    getLineColor: HIGHLIGHT_COLORS.primaryRing,
    getRadius: (d: AnyMapEntity) => getRingRadius(d) + 4,
    radiusUnits: "pixels",
    radiusMinPixels: 11,
    radiusMaxPixels: 52,
    stroked: true,
    lineWidthUnits: "pixels",
    getLineWidth: 3,
    pickable: false,
    updateTriggers: {
      getRadius: selectedEntity,
    },
  });

  // Relation arcs layer (connects summon spawns to blocker spawns)
  const relationArcsLayer = new LineLayer({
    id: "relation-arcs",
    data: relationArcData.arcs,
    visible: relationArcData.arcs.length > 0,
    getSourcePosition: (d: RelationArcData["arcs"][0]) => d.source,
    getTargetPosition: (d: RelationArcData["arcs"][0]) => d.target,
    getColor: RELATION_ARC_COLORS.arc,
    getWidth: 2,
    widthUnits: "pixels",
    pickable: false,
  });

  // Relation arc endpoint markers (small dots at target positions)
  const relationArcEndpointsLayer = new ScatterplotLayer({
    id: "relation-arc-endpoints",
    data: relationArcData.endpoints,
    visible: relationArcData.endpoints.length > 0,
    getPosition: (d: [number, number]) => d,
    getFillColor: RELATION_ARC_COLORS.endpoint,
    getRadius: 3,
    radiusUnits: "pixels",
    radiusMinPixels: 2,
    radiusMaxPixels: 6,
    pickable: false,
  });

  // Related entities highlight layer (orange color for blocker spawns)
  // Data is pre-computed via $derived in the page component

  // Outline layer for related highlight
  const relatedHighlightOutlineLayer = new ScatterplotLayer({
    id: "related-highlight-outline",
    data: relatedEntities,
    visible: relatedEntities.length > 0,
    getPosition: (d: AnyMapEntity) => d.position,
    getFillColor: [0, 0, 0, 0],
    getLineColor: HIGHLIGHT_COLORS.ringOutline,
    getRadius: getRingRadius,
    radiusUnits: "pixels",
    radiusMinPixels: 7,
    radiusMaxPixels: 48,
    stroked: true,
    lineWidthUnits: "pixels",
    getLineWidth: 5.5,
    pickable: false,
    updateTriggers: {
      getRadius: relatedEntities,
    },
  });

  const relatedHighlightLayer = new ScatterplotLayer({
    id: "related-highlight",
    data: relatedEntities,
    visible: relatedEntities.length > 0,
    getPosition: (d: AnyMapEntity) => d.position,
    getFillColor: HIGHLIGHT_COLORS.relatedFill,
    getLineColor: HIGHLIGHT_COLORS.relatedRing,
    getRadius: getRingRadius,
    radiusUnits: "pixels",
    radiusMinPixels: 7,
    radiusMaxPixels: 48,
    stroked: true,
    lineWidthUnits: "pixels",
    getLineWidth: 3,
    pickable: false,
    updateTriggers: {
      getRadius: relatedEntities,
    },
  });

  // Zone selection highlight layer (separate from zone layers so it shows even when zones hidden)
  // Only highlight zones with polygons (excluded zones have polygon: null)
  const zoneHighlightData = selectedZone?.polygon ? [selectedZone] : [];
  const zoneHighlightLayer = new PolygonLayer({
    id: "zone-highlight",
    data: zoneHighlightData,
    visible: zoneHighlightData.length > 0,
    getPolygon: (d: ParentZoneBoundary) => d.polygon,
    getFillColor: ZONE_COLORS.selectedZone.fill,
    getLineColor: ZONE_COLORS.selectedZone.stroke,
    getLineWidth: 3,
    lineWidthUnits: "pixels",
    stroked: true,
    filled: true,
    pickable: false,
  });

  // Hover preview highlight layer (dimmer than selection, renders below)

  // Outline layer for hover highlight
  const hoverHighlightOutlineLayer = new ScatterplotLayer({
    id: "hover-highlight-outline",
    data: hoverSelectionData,
    visible: hoverSelectionData.length > 0,
    getPosition: (d: AnyMapEntity) => d.position,
    getFillColor: [0, 0, 0, 0],
    getLineColor: HIGHLIGHT_COLORS.ringOutline,
    getRadius: getRingRadius,
    radiusUnits: "pixels",
    radiusMinPixels: 7,
    radiusMaxPixels: 48,
    stroked: true,
    lineWidthUnits: "pixels",
    getLineWidth: 5.5,
    pickable: false,
    updateTriggers: {
      getRadius: hoverSelectionData,
    },
  });

  const hoverHighlightLayer = new ScatterplotLayer({
    id: "hover-highlight",
    data: hoverSelectionData,
    visible: hoverSelectionData.length > 0,
    getPosition: (d: AnyMapEntity) => d.position,
    getFillColor: HIGHLIGHT_COLORS.hoverFill,
    getLineColor: HIGHLIGHT_COLORS.hoverRing,
    getRadius: getRingRadius,
    radiusUnits: "pixels",
    radiusMinPixels: 7,
    radiusMaxPixels: 48,
    stroked: true,
    lineWidthUnits: "pixels",
    getLineWidth: 3,
    pickable: false,
    updateTriggers: {
      getRadius: hoverSelectionData,
    },
  });

  // Zone hover highlight layer (excluded zones have polygon: null)
  const zoneHoverHighlightData = hoverZone?.polygon ? [hoverZone] : [];
  const zoneHoverHighlightLayer = new PolygonLayer({
    id: "zone-hover-highlight",
    data: zoneHoverHighlightData,
    visible: zoneHoverHighlightData.length > 0,
    getPolygon: (d: ParentZoneBoundary) => d.polygon,
    getFillColor: ZONE_COLORS.selectedZone.fill,
    getLineColor: HIGHLIGHT_COLORS.hoverRing,
    getLineWidth: 2,
    lineWidthUnits: "pixels",
    stroked: true,
    filled: true,
    pickable: false,
  });

  // Later in array = rendered on top (higher priority)
  // Order: background (fallback) → tiles → zones → paths/arcs → movement → entities → highlights
  return [
    backgroundLayer,
    tileLayer,
    parentZonesLayer,
    subZonesLayer,
    zoneHighlightLayer,
    ...patrolPathLayers,
    wanderRangeLayer,
    altarEventRadiusLayer,
    trapAreaHaloLayer,
    trapAreaLayer,
    relationArcsLayer,
    relationArcEndpointsLayer,
    portalArcsLayer,
    trapTeleportArcsLayer,
    teleporterArcsLayer,
    creaturesLayer,
    gatheringPlantsLayer,
    gatheringMineralsLayer,
    gatheringFishingLayer,
    gatheringSparksLayer,
    gatheringOtherLayer,
    alchemyTablesLayer,
    forgesLayer,
    cookingOvensLayer,
    scribingTablesLayer,
    huntsLayer,
    chestsLayer,
    housesLayer,
    treasureLayer,
    portalsLayer,
    portalDestinationsLayer,
    trapTeleportDestinationsLayer,
    teleporterDestinationsLayer,
    npcsLayer,
    altarsLayer,
    trapsLayer,
    elitesLayer,
    fabledLayer,
    bossesLayer,
    relatedHighlightOutlineLayer,
    relatedHighlightLayer,
    selectionHighlightOutlineLayer,
    selectionHighlightLayer,
    primarySelectionHighlightOutlineLayer,
    primarySelectionHighlightLayer,
    hoverHighlightOutlineLayer,
    hoverHighlightLayer,
    zoneHoverHighlightLayer,
  ];
}

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
  type PortalMapEntity,
  type ChestMapEntity,
  type AltarMapEntity,
} from "$lib/types/map";
import type { ZoneFocusedData } from "./zone-filter";
import { isAnyNpcTypeVisible } from "./visibility";
import {
  LAYER_COLORS,
  LAYER_RADII,
  ICON_SIZES,
  BACKGROUND_COLOR,
  WORLD_BOUNDS,
  ZONE_COLORS,
  ARC_COLORS,
  PATROL_COLORS,
  HIGHLIGHT_COLORS,
  RELATION_ARC_COLORS,
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
    otherGathering: renderableGathering.filter(
      (g) => g.type === "gathering_other",
    ),
    alchemyTables: renderableCrafting.filter((c) => c.type === "alchemy_table"),
    forges: renderableCrafting.filter(
      (c) => c.type === "crafting_station" && !c.isCookingOven,
    ),
    cookingOvens: renderableCrafting.filter((c) => c.isCookingOven),
    portalsWithDestinations: renderablePortals.filter(
      (p) => p.destination !== null && !p.isClosed,
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
    data: T[];
    visible: boolean;
    iconType: string;
    color: [number, number, number] | [number, number, number, number];
    radius: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extensions?: any[];

    getFilterValue?: (d: T) => number | number[];

    filterRange?: [number, number] | [number, number][];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateTriggers?: Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }): any {
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

    const sizeConfig = ICON_SIZES[config.iconType as keyof typeof ICON_SIZES];
    if (!sizeConfig) {
      throw new Error(
        `Unknown icon type "${config.iconType}" - not found in ICON_SIZES`,
      );
    }

    if (iconAtlas) {
      if (!iconAtlas.mapping[config.iconType]) {
        throw new Error(
          `Unknown icon type "${config.iconType}" - not found in icon atlas`,
        );
      }
      return new IconLayer({
        ...baseProps,
        iconAtlas: iconAtlas.atlas,
        iconMapping: iconAtlas.mapping,
        getIcon: () => config.iconType,
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

  const parentZonesLayer = new PolygonLayer({
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
    data: filtered.plants,
    visible: visibility.gatheringPlants,
    iconType: "gathering_plant",
    color: LAYER_COLORS.gathering_plant,
    radius: LAYER_RADII.gathering,
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
    data: filtered.minerals,
    visible: visibility.gatheringMinerals,
    iconType: "gathering_mineral",
    color: LAYER_COLORS.gathering_mineral,
    radius: LAYER_RADII.gathering,
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
    data: filtered.sparks,
    visible: visibility.gatheringSparks,
    iconType: "gathering_spark",
    color: LAYER_COLORS.gathering_spark,
    radius: LAYER_RADII.gathering,
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
    data: filtered.otherGathering,
    visible: visibility.gatheringOther,
    iconType: "gathering_other",
    color: LAYER_COLORS.gathering_other,
    radius: LAYER_RADII.gathering,
    extensions: [zoneFilterExt],
    getFilterValue: (d) => isInZone(d.zoneId),
    filterRange: [1, 1],
    updateTriggers: {
      getFilterValue: focusedZoneId,
    },
  });

  const alchemyTablesLayer = createEntityLayer<CraftingMapEntity>({
    id: "alchemy-tables",
    data: filtered.alchemyTables,
    visible: visibility.alchemyTables,
    iconType: "alchemy_table",
    color: LAYER_COLORS.crafting,
    radius: LAYER_RADII.crafting,
    extensions: [zoneFilterExt],
    getFilterValue: (d) => isInZone(d.zoneId),
    filterRange: [1, 1],
    updateTriggers: {
      getFilterValue: focusedZoneId,
    },
  });

  const forgesLayer = createEntityLayer<CraftingMapEntity>({
    id: "forges",
    data: filtered.forges,
    visible: visibility.forges,
    iconType: "crafting_station",
    color: LAYER_COLORS.crafting,
    radius: LAYER_RADII.crafting,
    extensions: [zoneFilterExt],
    getFilterValue: (d) => isInZone(d.zoneId),
    filterRange: [1, 1],
    updateTriggers: {
      getFilterValue: focusedZoneId,
    },
  });

  const cookingOvensLayer = createEntityLayer<CraftingMapEntity>({
    id: "cooking-ovens",
    data: filtered.cookingOvens,
    visible: visibility.cookingOvens,
    iconType: "cooking_oven",
    color: LAYER_COLORS.crafting,
    radius: LAYER_RADII.crafting,
    extensions: [zoneFilterExt],
    getFilterValue: (d) => isInZone(d.zoneId),
    filterRange: [1, 1],
    updateTriggers: {
      getFilterValue: focusedZoneId,
    },
  });

  const chestsLayer = createEntityLayer<ChestMapEntity>({
    id: "chests",
    data: filtered.chests,
    visible: visibility.chests,
    iconType: "chest",
    color: LAYER_COLORS.chest,
    radius: LAYER_RADII.chest,
    extensions: [zoneFilterExt],
    getFilterValue: (d) => isInZone(d.zoneId),
    filterRange: [1, 1],
    updateTriggers: {
      getFilterValue: focusedZoneId,
    },
  });

  const altarsLayer = createEntityLayer<AltarMapEntity>({
    id: "altars",
    data: filtered.altars,
    visible: visibility.altars,
    iconType: "altar",
    color: LAYER_COLORS.altar,
    radius: LAYER_RADII.altar,
    extensions: [zoneFilterExt],
    getFilterValue: (d) => isInZone(d.zoneId),
    filterRange: [1, 1],
    updateTriggers: {
      getFilterValue: focusedZoneId,
    },
  });

  const portalArcsLayer = new LineLayer({
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
  });

  const portalsLayer = createEntityLayer<PortalMapEntity>({
    id: "portals",
    data: filtered.portals,
    visible: visibility.portals,
    iconType: "portal",
    color: LAYER_COLORS.portal,
    radius: LAYER_RADII.portal,
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

  const patrolPathLayers = createPatrolPathLayers(
    patrolPathData,
    ScatterplotLayer,
    LineLayer,
  );

  const creaturesLayer = createEntityLayer<MonsterMapEntity>({
    id: "creatures",
    data: filtered.creatures,
    visible: visibility.creatures,
    iconType: "monster",
    color: LAYER_COLORS.monster,
    radius: LAYER_RADII.monster,
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
    data: filtered.hunts,
    visible: visibility.hunts,
    iconType: "hunt",
    color: LAYER_COLORS.hunt,
    radius: LAYER_RADII.monster,
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
    data: filtered.elites,
    visible: visibility.elites,
    iconType: "elite",
    color: LAYER_COLORS.elite,
    radius: LAYER_RADII.elite,
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
    data: filtered.bosses,
    visible: visibility.bosses,
    iconType: "boss",
    color: LAYER_COLORS.boss,
    radius: LAYER_RADII.boss,
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
    data: filtered.npcs,
    visible: isAnyNpcTypeVisible(visibility),
    iconType: "npc",
    color: LAYER_COLORS.npc,
    radius: LAYER_RADII.npc,
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

  // Get the icon type key for an entity (matches ICON_SIZES keys)
  const getIconTypeKey = (d: AnyMapEntity): keyof typeof ICON_SIZES => {
    switch (d.type) {
      case "boss":
        return "boss";
      case "elite":
        return "elite";
      case "hunt":
        return "hunt";
      case "monster":
        if ("isBoss" in d && d.isBoss) return "boss";
        if ("isElite" in d && d.isElite) return "elite";
        if ("isHunt" in d && d.isHunt) return "hunt";
        return "monster";
      case "npc":
        return "npc";
      case "portal":
        return "portal";
      case "chest":
        return "chest";
      case "altar":
        return "altar";
      case "gathering_plant":
        return "gathering_plant";
      case "gathering_mineral":
        return "gathering_mineral";
      case "gathering_spark":
        return "gathering_spark";
      case "alchemy_table":
        return "alchemy_table";
      case "crafting_station":
        if ("isCookingOven" in d && d.isCookingOven) return "cooking_oven";
        return "crafting_station";
      default:
        return "monster";
    }
  };

  // Ring radius = half the icon diameter (so ring matches icon circle size)
  const getRingRadius = (d: AnyMapEntity): number => {
    const iconType = getIconTypeKey(d);
    const iconSize = ICON_SIZES[iconType]?.base ?? 18;
    return iconSize / 2;
  };

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

  // Later in array = rendered on top (higher priority)
  // Order: background (fallback) → tiles → zones → paths/arcs → entities → highlights
  return [
    backgroundLayer,
    tileLayer,
    parentZonesLayer,
    subZonesLayer,
    ...patrolPathLayers,
    relationArcsLayer,
    relationArcEndpointsLayer,
    portalArcsLayer,
    creaturesLayer,
    gatheringPlantsLayer,
    gatheringMineralsLayer,
    gatheringSparksLayer,
    gatheringOtherLayer,
    alchemyTablesLayer,
    forgesLayer,
    cookingOvensLayer,
    huntsLayer,
    chestsLayer,
    portalsLayer,
    portalDestinationsLayer,
    npcsLayer,
    altarsLayer,
    elitesLayer,
    bossesLayer,
    relatedHighlightLayer,
    selectionHighlightLayer,
  ];
}

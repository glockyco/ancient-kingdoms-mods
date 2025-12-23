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
} from "$lib/types/map";
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
 */
export function createFilteredData(data: MapEntityData): FilteredMapData {
  return {
    // Creatures = regular monsters (not boss, not elite, not hunt)
    creatures: data.monsters.filter(
      (m) => !m.isBoss && !m.isElite && !m.isHunt,
    ),
    elites: data.monsters.filter((m) => m.isElite && !m.isBoss),
    bosses: data.monsters.filter((m) => m.isBoss),
    hunts: data.monsters.filter((m) => m.isHunt && !m.isBoss && !m.isElite),
    plants: data.gathering.filter((g) => g.type === "gathering_plant"),
    minerals: data.gathering.filter((g) => g.type === "gathering_mineral"),
    sparks: data.gathering.filter((g) => g.type === "gathering_spark"),
    alchemyTables: data.crafting.filter((c) => c.type === "alchemy_table"),
    forges: data.crafting.filter(
      (c) => c.type === "crafting_station" && !c.isCookingOven,
    ),
    cookingOvens: data.crafting.filter((c) => c.isCookingOven),
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
 * @param selectionData - Pre-computed array of entities to highlight (use EMPTY_SELECTION when none)
 * @param patrolPathData - Pre-computed patrol path data (use EMPTY_PATROL_DATA when none)
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
  patrolPathData: PatrolPathData = EMPTY_PATROL_DATA,
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

    // Patrol path layers (rendered below monsters so paths don't obscure them)
    ...createPatrolPathLayers(patrolPathData, ScatterplotLayer, LineLayer),

    // Creatures (regular monsters, not boss/elite/hunt) - GPU-filtered by level
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
      extensions: [dataFilterExt],
      getFilterValue: (d: MonsterMapEntity) => d.level,
      filterRange: [levelFilter.monsterMin, levelFilter.monsterMax],
      updateTriggers: {
        filterRange: [levelFilter.monsterMin, levelFilter.monsterMax],
      },
    }),

    // Hunts (huntable animals) - GPU-filtered by level
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

    // NPCs (single layer, filtered by visible role types using OR logic)
    // An NPC is visible if ANY of its roles match an enabled role toggle
    new ScatterplotLayer({
      id: "npcs",
      data: data.npcs,
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
      // GPU-based filtering: return 1 if NPC matches any enabled role, 0 otherwise
      extensions: [dataFilterExt],
      getFilterValue: (d: NpcMapEntity) => {
        // Check each role against visibility toggles
        if (visibility.npcVendors && d.isVendor) return 1;
        if (visibility.npcQuestGivers && d.isQuestGiver) return 1;
        if (visibility.npcRepair && d.canRepair) return 1;
        if (visibility.npcBanks && d.isBank) return 1;
        if (visibility.npcInnkeepers && d.isInnkeeper) return 1;
        if (visibility.npcSoulBinders && d.isSoulBinder) return 1;
        if (visibility.npcSkillTrainers && d.isSkillTrainer) return 1;
        if (visibility.npcVeteranTrainers && d.isVeteranTrainer) return 1;
        if (visibility.npcAttributeReset && d.isAttributeReset) return 1;
        if (visibility.npcFactionVendors && d.isFactionVendor) return 1;
        if (visibility.npcEssenceTraders && d.isEssenceTrader) return 1;
        if (visibility.npcAugmenters && d.isAugmenter) return 1;
        if (visibility.npcPriestesses && d.isPriestess) return 1;
        if (visibility.npcRenewalSages && d.isRenewalSage) return 1;
        if (visibility.npcAdventurerTasks && d.isAdventurerTaskgiver) return 1;
        if (visibility.npcAdventurerVendors && d.isAdventurerVendor) return 1;
        if (visibility.npcMercenaryRecruiters && d.isMercenaryRecruiter)
          return 1;
        if (visibility.npcGuards && d.isGuard) return 1;
        return 0;
      },
      filterRange: [1, 1], // Only show NPCs with filter value = 1
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

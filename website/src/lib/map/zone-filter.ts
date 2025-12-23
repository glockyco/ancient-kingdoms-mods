import type {
  FilteredMapData,
  MapEntityData,
  PortalMapEntity,
  NpcMapEntity,
  ChestMapEntity,
  AltarMapEntity,
  ZoneBoundary,
} from "$lib/types/map";

/**
 * Combined data type including all entity arrays needed for rendering.
 * Zone filtering happens on GPU via DataFilterExtension for performance.
 */
export interface ZoneFocusedData extends FilteredMapData {
  npcs: NpcMapEntity[];
  portals: PortalMapEntity[];
  chests: ChestMapEntity[];
  altars: AltarMapEntity[];
  subZones: ZoneBoundary[];
}

/**
 * Combine pre-filtered data with raw entity arrays.
 * Returns STABLE array references - zone filtering is done on GPU, not here.
 * This prevents freezes when switching zones by keeping data arrays constant.
 */
export function createZoneFocusedData(
  filtered: FilteredMapData,
  rawData: MapEntityData,
): ZoneFocusedData {
  return {
    ...filtered,
    npcs: rawData.npcs,
    portals: rawData.portals,
    chests: rawData.chests,
    altars: rawData.altars,
    subZones: rawData.subZones,
  };
}

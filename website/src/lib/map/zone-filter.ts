import type {
  FilteredMapData,
  MapEntityData,
  PortalMapEntity,
  NpcMapEntity,
  ChestMapEntity,
  TreasureMapEntity,
  AltarMapEntity,
  ZoneBoundary,
} from "$lib/types/map";
import { EXCLUDED_ZONE_IDS } from "$lib/constants/constants";

/**
 * Calculate polygon area using the shoelace formula.
 * Returns absolute value (always positive).
 */
function calculatePolygonArea(polygon: [number, number][]): number {
  let area = 0;
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += polygon[i][0] * polygon[j][1];
    area -= polygon[j][0] * polygon[i][1];
  }
  return Math.abs(area / 2);
}

/**
 * Combined data type including all entity arrays needed for rendering.
 * Zone filtering happens on GPU via DataFilterExtension for performance.
 */
export interface ZoneFocusedData extends FilteredMapData {
  npcs: NpcMapEntity[];
  portals: PortalMapEntity[];
  chests: ChestMapEntity[];
  treasure: TreasureMapEntity[];
  altars: AltarMapEntity[];
  subZones: ZoneBoundary[];
}

/**
 * Combine pre-filtered data with raw entity arrays.
 * Returns STABLE array references - zone filtering is done on GPU, not here.
 * This prevents freezes when switching zones by keeping data arrays constant.
 * Filters out entities without positions (they're kept in entityData for popups).
 */
export function createZoneFocusedData(
  filtered: FilteredMapData,
  rawData: MapEntityData,
): ZoneFocusedData {
  return {
    ...filtered,
    npcs: rawData.npcs.filter((n) => n.position !== null),
    portals: rawData.portals.filter((p) => p.position !== null),
    chests: rawData.chests.filter((c) => c.position !== null),
    treasure: rawData.treasure.filter((t) => t.position !== null),
    altars: rawData.altars.filter((a) => a.position !== null),
    // Sort by area descending so smaller/enclosed zones render on top and remain hoverable
    subZones: rawData.subZones
      .filter((z) => !EXCLUDED_ZONE_IDS.has(z.zoneId))
      .sort(
        (a, b) =>
          calculatePolygonArea(b.polygon) - calculatePolygonArea(a.polygon),
      ),
  };
}

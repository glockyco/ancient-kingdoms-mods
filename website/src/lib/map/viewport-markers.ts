import type {
  AnyMapEntity,
  FilteredMapData,
  LayerVisibility,
  LevelFilter,
} from "$lib/types/map";
import { NPC_FACETS, markerRegistry, type MarkerDef } from "./marker-registry";

export interface MarkerViewport {
  x: number;
  y: number;
  zoom: number;
  width: number;
  height: number;
}

export interface ViewportMarker {
  key: string;
  entity: AnyMapEntity;
  /** The registry marker that the map draws for this entity. */
  marker: MarkerDef;
  name: string;
  distanceSquared: number;
}

export interface ViewportMarkerList {
  markers: ViewportMarker[];
  total: number;
}

export const VIEWPORT_MARKER_LIMIT = 40;

/** Match the registry point layers, including their zone, level and NPC facets. */
export function markersInViewport(
  filtered: FilteredMapData,
  visibility: LayerVisibility,
  levels: LevelFilter,
  focusedZoneId: string | null,
  viewport: MarkerViewport,
): ViewportMarkerList {
  const halfWidth = viewport.width / 2 ** viewport.zoom / 2;
  const halfHeight = viewport.height / 2 ** viewport.zoom / 2;
  const markers: ViewportMarker[] = [];
  for (const marker of Object.values(markerRegistry) as MarkerDef[]) {
    const { visibilityKey, filter } = marker.layer;
    if (visibilityKey !== null && !visibility[visibilityKey]) continue;
    for (const entity of filtered[marker.filteredDataKey] as AnyMapEntity[]) {
      const position = entity.position;
      if (!position) continue;
      const dx = position[0] - viewport.x;
      const dy = position[1] - viewport.y;
      if (Math.abs(dx) > halfWidth || Math.abs(dy) > halfHeight) continue;
      if (
        focusedZoneId &&
        entity.zoneId !== focusedZoneId &&
        !(
          filter === "portal" &&
          entity.type === "portal" &&
          !entity.isClosed &&
          entity.destinationZoneId === focusedZoneId
        )
      )
        continue;
      if (
        filter === "monster-level" &&
        "level" in entity &&
        (entity.level < levels.monsterMin || entity.level > levels.monsterMax)
      )
        continue;
      if (
        filter === "gathering-level" &&
        "level" in entity &&
        (entity.level < levels.gatheringMin ||
          entity.level > levels.gatheringMax)
      )
        continue;
      if (
        filter === "npc" &&
        (entity.type !== "npc" ||
          !NPC_FACETS.some(
            (facet) => visibility[facet.visibilityKey] && facet.matches(entity),
          ))
      )
        continue;
      markers.push({
        key: `${marker.id}:${entity.id}:${position[0]}:${position[1]}`,
        entity,
        marker,
        name: marker.displayName?.(entity) ?? entity.name,
        distanceSquared: dx * dx + dy * dy,
      });
    }
  }
  markers.sort(
    (a, b) =>
      a.distanceSquared - b.distanceSquared || a.key.localeCompare(b.key),
  );
  return {
    markers: markers.slice(0, VIEWPORT_MARKER_LIMIT),
    total: markers.length,
  };
}

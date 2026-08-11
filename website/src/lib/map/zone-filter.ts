import type { FilteredMapData } from "$lib/types/map";

/**
 * Combined data passed to deck.gl layers. Entity rows are pre-filtered and
 * partitioned by the marker registry; focused-zone filtering happens on the
 * GPU through DataFilterExtension.
 */
export type ZoneFocusedData = FilteredMapData;

/**
 * Keep the historical call signature while returning stable, registry-derived
 * arrays. The raw entity data remains available to popups and selection but is
 * never re-filtered for rendering.
 */
export function createZoneFocusedData(
  filtered: FilteredMapData,
): ZoneFocusedData {
  return filtered;
}

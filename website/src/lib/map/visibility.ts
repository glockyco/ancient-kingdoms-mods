import type { LayerVisibility } from "$lib/types/map";

/**
 * Toggle a layer's visibility, handling any synced layers.
 * Currently syncs portalArcs with portals.
 */
export function toggleLayerVisibility(
  visibility: LayerVisibility,
  key: keyof LayerVisibility,
): LayerVisibility {
  const newValue = !visibility[key];
  const updates: Partial<LayerVisibility> = { [key]: newValue };

  // Sync portal arcs with portals
  if (key === "portals") {
    updates.portalArcs = newValue;
  }

  return {
    ...visibility,
    ...updates,
  };
}

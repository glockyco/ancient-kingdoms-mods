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

/**
 * All NPC type visibility keys
 */
export const NPC_TYPE_KEYS: (keyof LayerVisibility)[] = [
  "npcVendors",
  "npcQuestGivers",
  "npcRepair",
  "npcBanks",
  "npcInnkeepers",
  "npcSoulBinders",
  "npcSkillTrainers",
  "npcVeteranTrainers",
  "npcAttributeReset",
  "npcFactionVendors",
  "npcEssenceTraders",
  "npcAugmenters",
  "npcPriestesses",
  "npcRenewalSages",
  "npcAdventurerTasks",
  "npcAdventurerVendors",
  "npcMercenaryRecruiters",
  "npcGuards",
  "npcTeleporters",
  "npcVillagers",
];

/**
 * All crafting type visibility keys
 */
export const CRAFTING_TYPE_KEYS: (keyof LayerVisibility)[] = [
  "alchemyTables",
  "forges",
  "cookingOvens",
  "scribingTables",
];

/**
 * Check if any NPC type is visible
 */
export function isAnyNpcTypeVisible(visibility: LayerVisibility): boolean {
  return NPC_TYPE_KEYS.some((key) => visibility[key]);
}

/**
 * Check if any crafting type is visible
 */
export function isAnyCraftingTypeVisible(visibility: LayerVisibility): boolean {
  return CRAFTING_TYPE_KEYS.some((key) => visibility[key]);
}

/**
 * Toggle all NPC types on or off
 */
export function toggleAllNpcTypes(
  visibility: LayerVisibility,
): LayerVisibility {
  const anyVisible = isAnyNpcTypeVisible(visibility);
  const newValue = !anyVisible;

  const updates: Partial<LayerVisibility> = {};
  for (const key of NPC_TYPE_KEYS) {
    updates[key] = newValue;
  }

  return {
    ...visibility,
    ...updates,
  };
}

/**
 * Toggle all crafting types on or off
 */
export function toggleAllCraftingTypes(
  visibility: LayerVisibility,
): LayerVisibility {
  const anyVisible = isAnyCraftingTypeVisible(visibility);
  const newValue = !anyVisible;

  const updates: Partial<LayerVisibility> = {};
  for (const key of CRAFTING_TYPE_KEYS) {
    updates[key] = newValue;
  }

  return {
    ...visibility,
    ...updates,
  };
}

/**
 * Set all NPC types to a specific value
 */
export function setAllNpcTypes(
  visibility: LayerVisibility,
  value: boolean,
): LayerVisibility {
  const updates: Partial<LayerVisibility> = {};
  for (const key of NPC_TYPE_KEYS) {
    updates[key] = value;
  }

  return {
    ...visibility,
    ...updates,
  };
}

/**
 * Set all crafting types to a specific value
 */
export function setAllCraftingTypes(
  visibility: LayerVisibility,
  value: boolean,
): LayerVisibility {
  const updates: Partial<LayerVisibility> = {};
  for (const key of CRAFTING_TYPE_KEYS) {
    updates[key] = value;
  }

  return {
    ...visibility,
    ...updates,
  };
}

/**
 * Check if all layers in a list are visible
 */
export function areAllLayersVisible(
  visibility: LayerVisibility,
  keys: (keyof LayerVisibility)[],
): boolean {
  return keys.every((key) => visibility[key]);
}

/**
 * Check if any layer in a list is visible
 */
export function isAnyLayerVisible(
  visibility: LayerVisibility,
  keys: (keyof LayerVisibility)[],
): boolean {
  return keys.some((key) => visibility[key]);
}

/**
 * Get toggle state for a list of layers
 */
export function getToggleState(
  visibility: LayerVisibility,
  keys: (keyof LayerVisibility)[],
): "all" | "some" | "none" {
  const allVisible = areAllLayersVisible(visibility, keys);
  if (allVisible) return "all";
  const anyVisible = isAnyLayerVisible(visibility, keys);
  if (anyVisible) return "some";
  return "none";
}

/**
 * Set all layers in a list to a specific value
 */
export function setAllLayers(
  visibility: LayerVisibility,
  keys: (keyof LayerVisibility)[],
  value: boolean,
): LayerVisibility {
  const updates: Partial<LayerVisibility> = {};
  for (const key of keys) {
    updates[key] = value;
  }

  return {
    ...visibility,
    ...updates,
  };
}

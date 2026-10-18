import { browserAcquisitionQuery } from "$lib/acquisition/browser";
import { queryAcquisitionRows } from "$lib/acquisition/queries";
import { assembleAcquisitionModel } from "$lib/acquisition/assemble";
import {
  projectDirectGeometry,
  projectDefinitionInspection,
  projectItemUsages,
} from "$lib/acquisition/projections";
import type {
  AcquisitionQuery,
  AcquisitionRequest,
  AcquisitionModel,
  DirectLocation,
  MethodView,
} from "$lib/acquisition/types";

export const MAP_PROVIDER_CATEGORY = {
  monster_spawns: "monster",
  npcs: "npc",
  altars: "altar",
  resource_spawns: "resource",
  chests: "chest",
  crafting_stations: "crafting",
  alchemy_tables: "crafting",
  scribing_tables: "crafting",
  items: "item",
  classes: null,
  treasure_locations: "treasure",
  portals: "portal",
} as const;

export async function loadBrowserAcquisition(
  request: AcquisitionRequest,
  execute: AcquisitionQuery = browserAcquisitionQuery,
): Promise<AcquisitionModel> {
  return assembleAcquisitionModel(await queryAcquisitionRows(execute, request));
}
/** Seasonal vendor offers are outside the map's source presentation. */
export function mapMethodIsVisible(method: MethodView): boolean {
  return method.kind !== "vendor" || method.detail.season === "none";
}

/** Award, offer and use locations stay distinct, but all can be selected on the map. */
export function itemMapLocations(
  model: AcquisitionModel,
  itemId: string,
): readonly DirectLocation[] {
  const locations = [
    ...projectDirectGeometry(model, itemId),
    ...projectDefinitionInspection(model, itemId).offerLocations,
    ...projectItemUsages(model, itemId).flatMap((use) => use.useLocations),
  ];
  const seen = new Set<string>();
  return locations.filter((location) => {
    if (location.geometryVisibility !== "visible" || !location.position)
      return false;
    if (
      location.methodIds.length &&
      !location.methodIds.some((id) => {
        const method = model.methodViews.get(id);
        return method && mapMethodIsVisible(method);
      })
    )
      return false;
    const key = `${location.purpose}:${location.provider.kind}:${location.provider.id}:${location.position.x}:${location.position.y}:${location.position.z}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

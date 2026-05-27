import Database from "better-sqlite3";
import { error } from "@sveltejs/kit";
import {
  getFishingSpotVariantDetails,
  getGatheringResourceByIdFromDb,
  getGatheringResourceDropsFromDb,
  getGatheringResourceSpawnsFromDb,
} from "$lib/queries/gather-items.server";
import { DB_STATIC_PATH } from "$lib/constants/constants";
import { buildObtainabilityTree } from "$lib/server/obtainability";
import type { PageServerLoad, EntryGenerator } from "./$types";
import type { ObtainabilityNode } from "$lib/types/recipes";
import { gatheringResourceDescription } from "$lib/server/meta-description";

export const prerender = true;

export const entries: EntryGenerator = () => {
  const db = new Database(DB_STATIC_PATH, { readonly: true });
  const resources = db
    .prepare("SELECT id, is_fishing_spot FROM gathering_resources")
    .all() as { id: string; is_fishing_spot: number }[];
  db.close();

  const ids = new Set<string>();
  for (const resource of resources) {
    ids.add(resource.id);
    if (resource.is_fishing_spot) {
      ids.add(resource.id.replace(/_[0-9a-f]{8}$/u, ""));
    }
  }

  return Array.from(ids).map((id) => ({ id }));
};

export const load: PageServerLoad = ({ params }) => {
  const db = new Database(DB_STATIC_PATH, { readonly: true });
  const resource = getGatheringResourceByIdFromDb(db, params.id);

  if (!resource) {
    db.close();
    throw error(404, "Gathering resource not found");
  }

  const fishingSpotVariants = resource.is_fishing_spot
    ? getFishingSpotVariantDetails(db, resource)
    : [];
  const selectedFishingSpotVariantIndex = Math.max(
    0,
    fishingSpotVariants.findIndex(
      (variant) => variant.resource.id === resource.id,
    ),
  );
  const selectedVariant =
    fishingSpotVariants[selectedFishingSpotVariantIndex] ?? null;
  const selectedResource = selectedVariant?.resource ?? resource;
  const drops =
    selectedVariant?.drops ?? getGatheringResourceDropsFromDb(db, resource.id);
  const spawns =
    selectedVariant?.spawns ??
    getGatheringResourceSpawnsFromDb(db, resource.id);
  // Build obtainability tree for tool if one is required
  let toolObtainabilityTree: ObtainabilityNode | null = null;
  if (selectedResource.tool_required_id) {
    const visited = new Set<string>();
    toolObtainabilityTree = buildObtainabilityTree(
      db,
      selectedResource.tool_required_id,
      1,
      0,
      visited,
      true,
    );
  }

  const zoneNames = spawns.map((s) => s.zone_name);
  const description = gatheringResourceDescription(
    {
      name: selectedResource.name,
      is_plant: selectedResource.is_plant,
      is_mineral: selectedResource.is_mineral,
      is_fishing_spot: selectedResource.is_fishing_spot,
      is_radiant_spark: selectedResource.is_radiant_spark,
      level: selectedResource.level,
      tool_required_name: selectedResource.tool_required_name,
      gathering_exp: selectedResource.gathering_exp,
      item_reward_name: selectedResource.item_reward_name,
      item_reward_amount: selectedResource.item_reward_amount,
    },
    zoneNames,
  );
  db.close();

  return {
    resource: selectedResource,
    drops,
    spawns,
    toolObtainabilityTree,
    description,
    fishingSpotVariants,
    selectedFishingSpotVariantIndex,
  };
};

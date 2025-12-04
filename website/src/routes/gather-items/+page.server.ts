import {
  getGatherItems,
  getResourceZones,
  getAllResourceDrops,
} from "$lib/queries/gather-items.server";
import type { PageServerLoad } from "./$types";

export const prerender = true;

export const load: PageServerLoad = () => {
  const gatherItems = getGatherItems();
  const resources = gatherItems.filter((item) => item.type !== "Chest");
  const resourceZones = getResourceZones();
  const resourceDrops = getAllResourceDrops();
  return { resources, resourceZones, resourceDrops };
};

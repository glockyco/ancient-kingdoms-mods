import {
  getGatherItems,
  getResourceZones,
} from "$lib/queries/gather-items.server";
import type { PageServerLoad } from "./$types";

export const prerender = true;

export const load: PageServerLoad = () => {
  const gatherItems = getGatherItems();
  const resources = gatherItems.filter((item) => item.type !== "Chest");
  const resourceZones = getResourceZones();
  return { resources, resourceZones };
};

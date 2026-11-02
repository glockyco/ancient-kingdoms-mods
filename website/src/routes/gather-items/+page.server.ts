import { createListPagination } from "$lib/server/list-pagination";
import {
  getGatherItems,
  getResourceZones,
  getAllResourceDrops,
} from "$lib/queries/gather-items.server";
import type { PageServerLoad } from "./$types";

export const prerender = true;

const loadData = async () => {
  const gatherItems = await getGatherItems();
  const resources = gatherItems.filter((item) => item.type !== "Chest");
  const resourceZones = getResourceZones();
  const resourceDrops = getAllResourceDrops();
  return { resources, resourceZones, resourceDrops };
};

export const _pagination = createListPagination(
  "/gather-items",
  20,
  loadData,
  (data) => data.resources.length,
);
export const load = _pagination.load satisfies PageServerLoad;

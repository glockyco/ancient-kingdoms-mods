import { createListPagination } from "$lib/server/list-pagination";
import {
  getChestsList,
  getAllChestDrops,
} from "$lib/queries/gather-items.server";
import type { PageServerLoad } from "./$types";

export const prerender = true;

const loadData = async () => {
  const chests = await getChestsList();
  const chestDrops = getAllChestDrops();
  return { chests, chestDrops };
};

export const _pagination = createListPagination(
  "/chests",
  20,
  loadData,
  (data) => data.chests.length,
);
export const load = _pagination.load satisfies PageServerLoad;

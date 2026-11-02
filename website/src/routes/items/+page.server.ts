import { createListPagination } from "$lib/server/list-pagination";
import { getItemListPayload } from "$lib/queries/items.server";
import { pageItems, ITEMS_PAGE_SIZE } from "$lib/utils/item-list";
import type { PageServerLoad } from "./$types";

export const prerender = true;

// Ship the requested page's rows. list.json supplies the rest after first paint.
const loadData = async (page: number) => {
  const payload = await getItemListPayload();
  const allClasses = Array.from(
    new Set(Object.values(payload.itemClassKeys).flat()),
  )
    .filter((name) => name !== "all")
    .sort();
  return {
    initial: pageItems(payload, page),
    total: payload.items.length,
    allClasses,
    seasons: [...new Set(Object.values(payload.itemSeasons).flat())],
    // Only the first page describes the whole list in JSON-LD.
    collection:
      page === 1
        ? payload.items.map((item) => ({ id: item.id, name: item.name }))
        : [],
  };
};

export const _pagination = createListPagination(
  "/items",
  ITEMS_PAGE_SIZE,
  loadData,
  (data) => data.total,
);
export const load = _pagination.load satisfies PageServerLoad;

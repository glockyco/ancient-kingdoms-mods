import { getItemListPayload } from "$lib/queries/items.server";
import { firstPageCandidates } from "$lib/utils/item-list";
import type { PageServerLoad } from "./$types";

export const prerender = true;

// The page carries only the first page's rows; list.json supplies the rest after first paint.
export const load: PageServerLoad = async () => {
  const payload = await getItemListPayload();
  const allClasses = Array.from(
    new Set(Object.values(payload.itemClassKeys).flat()),
  )
    .filter((name) => name !== "all")
    .sort();
  return {
    initial: firstPageCandidates(payload),
    total: payload.items.length,
    allClasses,
    seasons: [...new Set(Object.values(payload.itemSeasons).flat())],
    collection: payload.items.map((item) => ({ id: item.id, name: item.name })),
  };
};

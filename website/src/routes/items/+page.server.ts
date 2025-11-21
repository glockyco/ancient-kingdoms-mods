import { getItems } from "$lib/queries/items.server";
import type { PageServerLoad } from "./$types";

export const prerender = true;

export const load: PageServerLoad = () => {
  const items = getItems();
  return { items };
};

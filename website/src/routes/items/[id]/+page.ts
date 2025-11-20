import { getItemById } from "$lib/queries/items";
import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params }) => {
  const item = await getItemById(params.id);

  if (!item) {
    throw error(404, `Item not found: ${params.id}`);
  }

  return {
    item,
  };
};

import {
  getChestsList,
  getAllChestDrops,
} from "$lib/queries/gather-items.server";
import type { PageServerLoad } from "./$types";

export const prerender = true;

export const load: PageServerLoad = async () => {
  const chests = await getChestsList();
  const chestDrops = getAllChestDrops();
  return { chests, chestDrops };
};

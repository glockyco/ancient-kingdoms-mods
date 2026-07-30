import { getFactionsList } from "$lib/queries/factions.server";
import type { PageServerLoad } from "./$types";

export const prerender = true;

export const load: PageServerLoad = () => {
  const factions = getFactionsList();
  return { factions };
};

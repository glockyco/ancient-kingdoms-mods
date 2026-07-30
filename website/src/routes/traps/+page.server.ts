import { getTrapsList } from "$lib/queries/traps.server";
import type { PageServerLoad } from "./$types";

export const prerender = true;

export const load: PageServerLoad = () => {
  const traps = getTrapsList();
  return { traps };
};

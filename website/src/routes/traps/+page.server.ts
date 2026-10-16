import {
  getTrapsList,
  groupPositionlessTraps,
} from "$lib/queries/traps.server";
import type { PageServerLoad } from "./$types";

export const prerender = true;

export const load: PageServerLoad = () => {
  return { traps: groupPositionlessTraps(getTrapsList()) };
};

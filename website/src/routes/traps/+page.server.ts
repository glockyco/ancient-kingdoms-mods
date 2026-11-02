import { createListPagination } from "$lib/server/list-pagination";
import {
  getTrapsList,
  groupPositionlessTraps,
} from "$lib/queries/traps.server";
import type { PageServerLoad } from "./$types";

export const prerender = true;

const loadData = () => {
  return { traps: groupPositionlessTraps(getTrapsList()) };
};

export const _pagination = createListPagination(
  "/traps",
  20,
  loadData,
  (data) => data.traps.length,
);
export const load = _pagination.load satisfies PageServerLoad;

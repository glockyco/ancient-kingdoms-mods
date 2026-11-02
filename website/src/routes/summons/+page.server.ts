import { createListPagination } from "$lib/server/list-pagination";
import { getAllSummons, getWhistlePets } from "$lib/queries/pets.server";
import { getPetHealthPassives } from "$lib/queries/pet-passives.server";
import type { PageServerLoad } from "./$types";

export const prerender = true;

const loadData = () => {
  return {
    summons: [...getAllSummons(), ...getWhistlePets()],
    healthPassives: getPetHealthPassives(),
  };
};

export const _pagination = createListPagination(
  "/summons",
  20,
  loadData,
  (data) => data.summons.length,
);
export const load = _pagination.load satisfies PageServerLoad;

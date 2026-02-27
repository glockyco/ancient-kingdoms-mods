import { getAllPets } from "$lib/queries/pets.server";
import type { PageServerLoad } from "./$types";

export const prerender = true;

export const load: PageServerLoad = () => {
  return {
    pets: getAllPets(),
  };
};

import { getSummonIds } from "$lib/queries/pets.server";
import { loadPetPage } from "$lib/server/pet-page";
import type { PageServerLoad, EntryGenerator } from "./$types";

export const prerender = true;

export const entries: EntryGenerator = () => {
  return getSummonIds().map((id) => ({ id }));
};

export const load: PageServerLoad = ({ params }) =>
  loadPetPage(params.id, false);

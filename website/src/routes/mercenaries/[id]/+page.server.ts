import { getMercenaryIds } from "$lib/queries/pets.server";
import { loadMercenaryPage } from "$lib/server/pet-page";
import type { PageServerLoad, EntryGenerator } from "./$types";

export const prerender = true;

export const entries: EntryGenerator = () => {
  return getMercenaryIds().map((id) => ({ id }));
};

export const load: PageServerLoad = ({ params }) =>
  loadMercenaryPage(params.id);

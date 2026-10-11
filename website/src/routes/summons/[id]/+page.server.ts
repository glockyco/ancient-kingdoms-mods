import { getSummonIds } from "$lib/queries/pets.server";
import { loadSummonPage } from "$lib/server/pet-page";
import { getPetHealthPassives } from "$lib/queries/pet-passives.server";
import type { PageServerLoad, EntryGenerator } from "./$types";

export const prerender = true;

export const entries: EntryGenerator = () => {
  return getSummonIds().map((id) => ({ id }));
};

export const load: PageServerLoad = ({ params }) => {
  const data = loadSummonPage(params.id);
  return {
    ...data,
    pet: { ...data.pet, healthPassives: getPetHealthPassives(params.id) },
  };
};

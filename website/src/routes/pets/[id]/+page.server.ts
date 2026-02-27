import { getAllPetIds, getPetById } from "$lib/queries/pets.server";
import { error } from "@sveltejs/kit";
import type { PageServerLoad, EntryGenerator } from "./$types";

export const prerender = true;

export const entries: EntryGenerator = () => {
  return getAllPetIds().map((id) => ({ id }));
};

export const load: PageServerLoad = ({ params }) => {
  const pet = getPetById(params.id);

  if (!pet) {
    throw error(404, `Pet not found: ${params.id}`);
  }

  return { pet };
};

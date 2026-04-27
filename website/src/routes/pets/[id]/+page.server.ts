import { getAllPetIds, getPetById } from "$lib/queries/pets.server";
import { error } from "@sveltejs/kit";
import { petDescription } from "$lib/server/meta-description";
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

  // Compute has_buffs and has_heals from pet.skills
  const has_heals = pet.skills.some(
    (s) => s.skill_type === "target_heal" || s.skill_type === "area_heal",
  );
  const has_buffs = pet.skills.some(
    (s) =>
      s.skill_type === "target_buff" ||
      s.skill_type === "area_buff" ||
      s.skill_type === "passive",
  );

  // Extract summoning skill and class info
  const summoning_skill_name = pet.classLink.skill_name ?? null;
  const summoning_class_id =
    pet.kind === "Mercenary" ? null : (pet.classLink.class_id ?? null);

  // Generate description
  const description = petDescription({
    name: pet.name,
    kind: pet.kind,
    type_monster: pet.type_monster,
    has_buffs,
    has_heals,
    summoning_skill_name,
    summoning_class_id,
  });

  return { pet, description };
};

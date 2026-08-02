import { getPetById, getPetVisualAsset } from "$lib/queries/pets.server";
import { error } from "@sveltejs/kit";
import { petDescription } from "$lib/server/meta-description";
import type { PetDetailView } from "$lib/types/pets";
import type { EntityVisualAsset } from "$lib/types/visual-assets";

export interface PetPageData {
  pet: PetDetailView;
  description: string;
  visualAsset: EntityVisualAsset | null;
}

/**
 * Load a pet detail page.
 *
 * `isMercenary` is the section the request came in through. A pet that belongs
 * to the other section 404s rather than rendering under two URLs, which would
 * split its search ranking and let stale links look valid.
 */
export function loadPetPage(id: string, isMercenary: boolean): PetPageData {
  const pet = getPetById(id);

  if (!pet || (pet.kind === "Mercenary") !== isMercenary) {
    throw error(404, `Pet not found: ${id}`);
  }

  const has_heals = pet.skills.some(
    (s) => s.skill_type === "target_heal" || s.skill_type === "area_heal",
  );
  const has_buffs = pet.skills.some(
    (s) =>
      s.skill_type === "target_buff" ||
      s.skill_type === "area_buff" ||
      s.skill_type === "passive",
  );

  const summoning_skill_name = pet.classLink.skill_name ?? null;
  const summoning_class_id = isMercenary
    ? null
    : (pet.classLink.class_id ?? null);

  const description = petDescription({
    name: pet.name,
    kind: pet.kind,
    type_monster: pet.type_monster,
    has_buffs,
    has_heals,
    summoning_skill_name,
    summoning_class_id,
  });

  return {
    pet,
    description,
    // A mercenary's look is assembled per character from race, gender, hair, and
    // gear, so there is no single portrait that is true for the reader.
    visualAsset: isMercenary ? null : getPetVisualAsset(id),
  };
}

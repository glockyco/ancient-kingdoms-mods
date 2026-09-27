import {
  getMercenaryDetail,
  getPetById,
  getPetVisualAsset,
} from "$lib/queries/pets.server";
import { error } from "@sveltejs/kit";
import {
  petDescription,
  petRolePhrase,
  type PetDescriptionInput,
} from "$lib/server/meta-description";
import type { MercenaryDetailView, PetDetailView } from "$lib/types/pets";
import type { EntityVisualAsset } from "$lib/types/visual-assets";

export interface PetPageData {
  pet: PetDetailView;
  description: string;
  visualAsset: EntityVisualAsset | null;
}

export interface MercenaryPageData {
  pet: MercenaryDetailView;
  description: string;
  /** One sentence about what the mercenary does, shown below the title. */
  role: string;
}

/**
 * Load a pet and reject it when it belongs to the other section. A pet that
 * renders under two URLs splits its search ranking and lets stale links look
 * valid, so it 404s instead.
 */
function loadPet(
  id: string,
  isMercenary: boolean,
): { pet: PetDetailView; input: PetDescriptionInput } {
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

  return {
    pet,
    input: {
      name: pet.name,
      kind: pet.kind,
      type_monster: pet.type_monster,
      has_buffs,
      has_heals,
      summoning_skill_name: pet.classLink.skill_name ?? null,
      summoning_class_id: isMercenary ? null : (pet.classLink.class_id ?? null),
    },
  };
}

/** Load a summon (companion or familiar) detail page. */
export function loadSummonPage(id: string): PetPageData {
  const { pet, input } = loadPet(id, false);
  return {
    pet,
    description: petDescription(input),
    visualAsset: getPetVisualAsset(id),
  };
}

/**
 * Load a mercenary detail page. Mercenaries have no single portrait, because
 * their appearance varies by character.
 */
export function loadMercenaryPage(id: string): MercenaryPageData {
  const { pet, input } = loadPet(id, true);
  return {
    pet: getMercenaryDetail(pet),
    description: petDescription(input),
    role: petRolePhrase(input),
  };
}

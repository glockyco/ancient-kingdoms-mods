import {
  getMercenaryDetail,
  getPetById,
  getPetVisualAsset,
} from "$lib/queries/pets.server";
import { error } from "@sveltejs/kit";
import {
  petDescription,
  type PetDescriptionInput,
} from "$lib/server/meta-description";
import { getMercenaryLinks } from "$lib/queries/mercenaries.server";
import type {
  MercenaryDetailView,
  MercenaryLink,
  PetDetailView,
} from "$lib/types/pets";
import type { EntityVisualAsset } from "$lib/types/visual-assets";

export interface PetPageData {
  pet: PetDetailView;
  description: string;
  visualAsset: EntityVisualAsset | null;
}

export interface MercenaryPageData {
  pet: MercenaryDetailView;
  description: string;
  /** Every mercenary, for the navigation between the mercenary pages. */
  links: MercenaryLink[];
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

  return {
    pet,
    input: {
      name: pet.name,
      kind: pet.kind,
      type_monster: pet.type_monster,
      has_heals: pet.has_heals,
      has_buffs: pet.has_buffs,
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
    links: getMercenaryLinks(),
  };
}

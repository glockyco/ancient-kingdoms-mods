import type { ClassSkill } from "$lib/queries/classes.server";

export type PetKind = "Mercenary" | "Companion" | "Familiar";

/**
 * Pet list view for the overview page.
 */
export interface PetListView {
  id: string;
  name: string;
  kind: PetKind;
  type_monster: string;
  level: number;
  summoning_class_id: string | null;
  summoning_skill_id: string | null;
  summoning_skill_name: string | null;
  recruiters: PetRecruiter[];
}

/**
 * Class link info for a pet (which class summons/recruits it and via which skill).
 */
export interface PetClassLink {
  class_id: string;
  skill_id: string | null;
  skill_name: string | null;
}

/**
 * An NPC that can recruit mercenaries, with their zone location.
 */
export interface PetRecruiter {
  npc_id: string;
  npc_name: string;
  zone_id: string;
  zone_name: string;
}

/**
 * Full pet detail page data.
 */
export interface PetDetailView {
  id: string;
  name: string;
  kind: PetKind;
  type_monster: string;
  level: number;
  /** For familiars: the summoning skill's max_level (= actual max familiar level). For others: same as level. */
  effective_max_level: number;
  classLink: PetClassLink;
  skills: ClassSkill[];
  recruiters: PetRecruiter[];
}

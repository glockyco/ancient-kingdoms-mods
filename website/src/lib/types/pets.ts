import type { ClassSkill } from "$lib/queries/classes.server";
import type { Curves } from "$lib/utils/merc-stats";
import type { EntityVisualAsset } from "$lib/types/visual-assets";

export type PetKind = "Mercenary" | "Companion" | "Familiar";

/** The kinds listed on the /summons overview: skill summons and whistle pets. */
export type SummonKind = Exclude<PetKind, "Mercenary"> | "Pet";

/**
 * One mercenary class on the /mercenaries hub. Mercenaries are hired from
 * recruiter NPCs rather than summoned. Every recruiter hires every class.
 */
export interface MercenarySummary {
  id: string;
  name: string;
  type_monster: string;
  /** Pet.hasHeals: the pet AI checks for allies to heal. */
  has_heals: boolean;
  /** Pet.hasBuffs: the pet AI checks for allies to buff. */
  has_buffs: boolean;
  /** Public path of the class icon, when exported. */
  class_icon: string | null;
  /** Warrior and Rogue mercenaries survive a lethal hit with a death save. */
  hasDeathSave: boolean;
  skillCount: number;
}

/**
 * Summon list view for the /summons overview. Companions and familiars are
 * summoned by a class skill and cannot be recruited.
 */
export interface SummonListView {
  id: string;
  name: string;
  kind: SummonKind;
  type_monster: string;
  level: number;
  /** Primary artwork exported for summons; absent when unavailable. */
  visualAsset: EntityVisualAsset | null;
  summoning_class_id: string | null;
  summoning_skill_id: string | null;
  summoning_skill_name: string | null;
  /** Whistle item that summons a pet; null for skill summons. */
  summoning_item: { id: string; name: string } | null;
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
 * An NPC that can recruit mercenaries, with their zone location and the race
 * they hire.
 */
export interface PetRecruiter {
  npc_id: string;
  npc_name: string;
  /** Race this recruiter always hires; empty when it states no preference. */
  preferred_race: string;
  visual_public_path: string | null;
  visual_width: number | null;
  visual_height: number | null;
  visual_source_field: string | null;
  visual_source_type: string | null;
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
  /** Pet.hasHeals: the pet AI checks for allies to heal. */
  has_heals: boolean;
  /** Pet.hasBuffs: the pet AI checks for allies to buff. */
  has_buffs: boolean;
  /** For familiars: the summoning skill's max_level (= actual max familiar level). For others: same as level. */
  effective_max_level: number;
  classLink: PetClassLink;
  skills: ClassSkill[];
  recruiters: PetRecruiter[];
}

/** A resistance that grows linearly with the mercenary level. */
export interface MercenaryResistance {
  name: string;
  base: number;
  per_level: number;
}

/** One equipment slot and the item category it accepts. */
export interface MercenaryEquipmentSlot {
  slot_index: number;
  accepted_category: string;
}

/** A mercenary archetype, for links between the mercenary pages. */
export interface MercenaryLink {
  id: string;
  type_monster: string;
}

/** Class-specific data that only the mercenary detail page shows. */
export interface MercenaryProfile {
  /** Base Health and Mana curves of every mercenary class, for stat ranges. */
  curves: Curves;
  resistances: MercenaryResistance[];
  equipmentSlots: MercenaryEquipmentSlot[];
}

export interface MercenaryDetailView extends PetDetailView {
  kind: "Mercenary";
  profile: MercenaryProfile;
}

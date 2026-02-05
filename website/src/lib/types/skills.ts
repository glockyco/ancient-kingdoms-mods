import type { Skill } from "$lib/queries/skills";

/**
 * Linear scaling value (base + bonus_per_level * (level - 1))
 */
export interface LinearValue {
  base_value: number;
  bonus_per_level: number;
}

/**
 * Raw SQL query result for overview page.
 * CC/heal base_values are pre-extracted via json_extract() in the query.
 * This type is NOT sent to the client -- it is the server-side query shape.
 */
export interface SkillListViewRaw {
  id: string;
  name: string;
  skill_type: string;
  max_level: number;
  level_required: number;
  player_classes: string; // JSON array string
  is_spell: number;
  is_veteran: number;
  is_pet_skill: number;
  is_mercenary_skill: number;
  is_resurrect_skill: number;
  is_invisibility: number;
  is_cleanse: number;
  is_dispel: number;
  is_stance: number;
  is_mana_shield: number;
  is_enrage: number;
  stun_chance_base: number | null;
  fear_chance_base: number | null;
  knockback_chance_base: number | null;
  heals_health_base: number | null;
}

/**
 * Wire type sent to the client after server-side processing.
 * Only scalar display fields -- no JSON blobs, no raw boolean flags.
 */
export interface SkillListViewClient {
  id: string;
  name: string;
  skill_type: string;
  max_level: number;
  level_required: number;
  tags: string[];
  category: string;
}

/**
 * Full detail page data shape returned by the detail page loader.
 */
export interface SkillDetailPageData {
  skill: Skill;
  description: string;
  prerequisiteName: string | null;
  prerequisite2Name: string | null;
  summonedMonsterName: string | null;
  grantedByItems: SkillItemSource[];
  playerClasses: string[];
  parsedFields: SkillParsedFields;
}

/**
 * All JSON fields parsed server-side into typed objects.
 */
export interface SkillParsedFields {
  mana_cost: LinearValue | null;
  energy_cost: LinearValue | null;
  cooldown: LinearValue | null;
  cast_time: LinearValue | null;
  cast_range: LinearValue | null;
  damage: LinearValue | null;
  damage_percent: LinearValue | null;
  lifetap_percent: LinearValue | null;
  aggro: LinearValue | null;
  heals_health: LinearValue | null;
  heals_mana: LinearValue | null;
  stun_chance: LinearValue | null;
  stun_time: LinearValue | null;
  fear_chance: LinearValue | null;
  fear_time: LinearValue | null;
  knockback_chance: LinearValue | null;
  ward_bonus: LinearValue | null;
  fear_resist_chance_bonus: LinearValue | null;
  health_max_bonus: LinearValue | null;
  health_max_percent_bonus: LinearValue | null;
  mana_max_bonus: LinearValue | null;
  mana_max_percent_bonus: LinearValue | null;
  energy_max_bonus: LinearValue | null;
  damage_bonus: LinearValue | null;
  damage_percent_bonus: LinearValue | null;
  magic_damage_bonus: LinearValue | null;
  magic_damage_percent_bonus: LinearValue | null;
  defense_bonus: LinearValue | null;
  magic_resist_bonus: LinearValue | null;
  poison_resist_bonus: LinearValue | null;
  fire_resist_bonus: LinearValue | null;
  cold_resist_bonus: LinearValue | null;
  disease_resist_bonus: LinearValue | null;
  block_chance_bonus: LinearValue | null;
  accuracy_bonus: LinearValue | null;
  critical_chance_bonus: LinearValue | null;
  haste_bonus: LinearValue | null;
  spell_haste_bonus: LinearValue | null;
  health_percent_per_second_bonus: LinearValue | null;
  healing_per_second_bonus: LinearValue | null;
  mana_percent_per_second_bonus: LinearValue | null;
  mana_per_second_bonus: LinearValue | null;
  energy_percent_per_second_bonus: LinearValue | null;
  energy_per_second_bonus: LinearValue | null;
  speed_bonus: LinearValue | null;
  damage_shield: LinearValue | null;
  cooldown_reduction_percent: LinearValue | null;
  heal_on_hit_percent: LinearValue | null;
  strength_bonus: LinearValue | null;
  intelligence_bonus: LinearValue | null;
  dexterity_bonus: LinearValue | null;
  charisma_bonus: LinearValue | null;
  wisdom_bonus: LinearValue | null;
  constitution_bonus: LinearValue | null;
}

/**
 * Item that grants/triggers this skill.
 */
export interface SkillItemSource {
  item_id: string;
  item_name: string;
  type: string;
  probability?: number;
}

/**
 * Linear scaling value (base + bonus_per_level * (level - 1))
 */
export interface LinearValue {
  base_value: number;
  bonus_per_level: number;
}

/**
 * Skill data for list view
 */
export interface SkillListView {
  id: string;
  name: string;
  skill_type: string;
  tier: number;
  max_level: number;
  level_required: number;
  player_classes: string[];
  is_spell: boolean;
  is_veteran: boolean;
  is_pet_skill: boolean;
  is_mercenary_skill: boolean;
}

/**
 * Full skill data for detail page
 */
export interface SkillDetailView {
  id: string;
  name: string;
  skill_type: string;
  tier: number;
  max_level: number;
  level_required: number;
  required_skill_points: number;
  required_spent_points: number;
  player_classes: string[];
  tooltip_template: string | null;

  // Prerequisite
  prerequisite_skill_id: string | null;
  prerequisite_skill_name: string | null;
  prerequisite_level: number;

  // Weapon requirements
  required_weapon_category: string | null;
  required_weapon_category2: string | null;

  // Flags
  is_spell: boolean;
  is_veteran: boolean;
  is_pet_skill: boolean;
  is_mercenary_skill: boolean;
  base_skill: boolean;
  learn_default: boolean;
  allow_dungeon: boolean;

  // Costs and timing
  mana_cost: LinearValue | null;
  energy_cost: LinearValue | null;
  cooldown: LinearValue | null;
  cast_time: LinearValue | null;
  cast_range: LinearValue | null;

  // Damage
  damage: LinearValue | null;
  damage_percent: LinearValue | null;
  damage_type: string | null;
  lifetap_percent: number;
  aggro: LinearValue | null;

  // Healing
  heals_health: LinearValue | null;
  heals_mana: LinearValue | null;
  can_heal_self: boolean;
  can_heal_others: boolean;

  // Crowd control
  stun_chance: number;
  stun_time: number;
  fear_chance: number;
  fear_time: number;
  knockback_chance: number;

  // Buff duration
  duration_base: number;
  duration_per_level: number;

  // Buff stat bonuses
  health_max_bonus: LinearValue | null;
  health_max_percent_bonus: LinearValue | null;
  mana_max_bonus: LinearValue | null;
  mana_max_percent_bonus: LinearValue | null;
  energy_max_bonus: LinearValue | null;
  defense_bonus: LinearValue | null;
  magic_resist_bonus: LinearValue | null;
  damage_bonus: LinearValue | null;
  damage_percent_bonus: LinearValue | null;
  magic_damage_bonus: LinearValue | null;
  magic_damage_percent_bonus: LinearValue | null;
  haste_bonus: LinearValue | null;
  spell_haste_bonus: LinearValue | null;
  speed_bonus: LinearValue | null;
  critical_chance_bonus: LinearValue | null;
  accuracy_bonus: LinearValue | null;
  block_chance_bonus: LinearValue | null;
  damage_shield: LinearValue | null;
  cooldown_reduction_percent: LinearValue | null;
  heal_on_hit_percent: LinearValue | null;

  // Regen bonuses
  healing_per_second_bonus: LinearValue | null;
  health_percent_per_second_bonus: LinearValue | null;
  mana_per_second_bonus: LinearValue | null;
  mana_percent_per_second_bonus: LinearValue | null;
  energy_per_second_bonus: LinearValue | null;
  energy_percent_per_second_bonus: LinearValue | null;

  // Resist bonuses
  poison_resist_bonus: LinearValue | null;
  fire_resist_bonus: LinearValue | null;
  cold_resist_bonus: LinearValue | null;
  disease_resist_bonus: LinearValue | null;

  // Attribute bonuses
  strength_bonus: LinearValue | null;
  intelligence_bonus: LinearValue | null;
  dexterity_bonus: LinearValue | null;
  constitution_bonus: LinearValue | null;
  wisdom_bonus: LinearValue | null;
  charisma_bonus: LinearValue | null;

  // Special flags
  is_resurrect_skill: boolean;
  is_balance_health: boolean;
  is_invisibility: boolean;
  is_cleanse: boolean;
  is_dispel: boolean;
}

/**
 * Item that grants/triggers this skill
 */
export interface SkillItemSource {
  item_id: string;
  item_name: string;
  type: string;
  probability?: number;
}

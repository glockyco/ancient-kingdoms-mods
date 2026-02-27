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

  // Prerequisites
  prerequisite_skill_id: string | null;
  prerequisite_skill_name: string | null;
  prerequisite_level: number;
  prerequisite2_skill_id: string | null;
  prerequisite2_skill_name: string | null;
  prerequisite2_level: number;

  // Weapon requirements
  required_weapon_category: string | null;
  required_weapon_category2: string | null;

  // Flags
  is_spell: boolean;
  is_veteran: boolean;
  is_pet_skill: boolean;
  is_mercenary_skill: boolean;
  is_scroll: boolean;
  base_skill: boolean;
  learn_default: boolean;
  allow_dungeon: boolean;
  followup_default_attack: boolean;

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
  lifetap_percent: LinearValue | null;
  aggro: LinearValue | null;
  break_armor_prob: number;
  is_assassination_skill: boolean;
  is_manaburn_skill: boolean;

  // Healing
  heals_health: LinearValue | null;
  heals_mana: LinearValue | null;
  can_heal_self: boolean;
  can_heal_others: boolean;

  // Crowd control (LinearValue — stored as JSON TEXT in DB)
  stun_chance: LinearValue | null;
  stun_time: LinearValue | null;
  fear_chance: LinearValue | null;
  fear_time: LinearValue | null;
  knockback_chance: LinearValue | null;

  // Buff duration
  duration_base: number;
  duration_per_level: number;

  // Buff targeting
  can_buff_self: boolean;
  can_buff_others: boolean;
  buff_category: string | null;

  // Buff stat bonuses
  health_max_bonus: LinearValue | null;
  health_max_percent_bonus: LinearValue | null;
  mana_max_bonus: LinearValue | null;
  mana_max_percent_bonus: LinearValue | null;
  energy_max_bonus: LinearValue | null;
  defense_bonus: LinearValue | null;
  ward_bonus: LinearValue | null;
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
  fear_resist_chance_bonus: LinearValue | null;
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
  is_mana_shield: boolean;
  is_cleanse: boolean;
  is_dispel: boolean;
  is_blindness: boolean;
  is_enrage: boolean;
  is_permanent: boolean;
  is_only_for_magic_classes: boolean;
  remain_after_death: boolean;
  is_decrease_resists_skill: boolean;

  // Debuff type flags
  is_poison_debuff: boolean;
  is_fire_debuff: boolean;
  is_cold_debuff: boolean;
  is_disease_debuff: boolean;
  is_melee_debuff: boolean;
  is_magic_debuff: boolean;
  prob_ignore_cleanse: number;

  // Summon fields
  summoned_monster_id: string | null;
  summoned_monster_name: string | null;
  summoned_monster_level: number | null;
  summon_count_per_cast: number | null;
  max_active_summons: number | null;
  pet_prefab_name: string | null;
  pet_name: string | null;
  is_familiar: boolean;

  // AoE fields
  affects_random_target: boolean;
  area_object_size: number;
  area_objects_to_spawn: number;
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

/**
 * Monster that uses this skill
 */
export interface SkillMonster {
  id: string;
  name: string;
  level_min: number;
  level_max: number;
  is_boss: boolean;
  is_elite: boolean;
  is_fabled: boolean;
}

/**
 * Pet/mercenary that uses this skill
 */
export interface SkillPet {
  id: string;
  name: string;
  is_mercenary: boolean;
}

import { query, queryOne } from "$lib/db";

export interface Skill {
  id: string;
  name: string;
  skill_type: string;
  tier: number;
  max_level: number;
  player_classes: string | null; // JSON array
  level_required: number;
  required_skill_points: number;
  required_spent_points: number;
  prerequisite_skill_id: string | null;
  prerequisite_level: number;
  prerequisite2_level: number;
  prerequisite2_skill_id: string | null;
  required_weapon_category: string | null;
  required_weapon_category2: string | null;

  // Costs and timing (JSON LinearValue)
  mana_cost: string | null;
  energy_cost: string | null;
  cooldown: string | null;
  cast_time: string | null;
  cast_range: string | null;

  // Flags
  learn_default: number;
  show_cast_bar: number;
  cancel_cast_if_target_died: number;
  allow_dungeon: number;
  is_spell: number;
  is_veteran: number;
  is_mercenary_skill: number;
  is_pet_skill: number;
  followup_default_attack: number;

  // UI
  tooltip_template: string | null;
  icon_path: string | null;
  skill_aggro_message: string | null;
  pet_prefab_name: string | null;

  // New columns
  ward_bonus: string | null;
  fear_resist_chance_bonus: string | null;
  summoned_monster_id: string | null;
  summoned_monster_level: number | null;
  summon_count_per_cast: number | null;
  max_active_summons: number | null;

  // Combat flags
  is_assassination_skill: number;
  is_manaburn_skill: number;
  base_skill: number;
  break_armor_prob: number;
  affects_random_target: number;
  area_object_size: number;
  area_object_delay_damage: number;
  area_objects_to_spawn: number;

  // Damage/Healing (JSON LinearValue)
  damage: string | null;
  damage_percent: string | null;
  damage_type: string | null;
  heals_health: string | null;
  heals_mana: string | null;
  lifetap_percent: string | null;
  aggro: string | null;

  // Special mechanics
  is_balance_health: number;
  is_resurrect_skill: number;
  can_heal_self: number;
  can_heal_others: number;
  can_buff_self: number;
  can_buff_others: number;

  // CC (JSON LinearValue)
  stun_chance: string | null;
  stun_time: string | null;
  fear_chance: string | null;
  fear_time: string | null;
  knockback_chance: string | null;

  // Buff/Debuff properties
  duration_base: number;
  duration_per_level: number;
  remain_after_death: number;
  buff_category: string | null;
  is_invisibility: number;
  is_undead_illusion: number;
  is_poison_debuff: number;
  is_fire_debuff: number;
  is_cold_debuff: number;
  is_disease_debuff: number;
  is_melee_debuff: number;
  is_magic_debuff: number;
  is_cleanse: number;
  is_dispel: number;
  is_mana_shield: number;
  is_stance: number;
  is_blindness: number;
  is_avatar_war: number;
  is_only_for_magic_classes: number;
  is_permanent: number;
  prob_ignore_cleanse: number;
  is_decrease_resists_skill: number;

  // Stat bonuses (JSON LinearValue)
  health_max_bonus: string | null;
  health_max_percent_bonus: string | null;
  mana_max_bonus: string | null;
  mana_max_percent_bonus: string | null;
  energy_max_bonus: string | null;
  damage_bonus: string | null;
  damage_percent_bonus: string | null;
  magic_damage_percent_bonus: string | null;
  magic_damage_bonus: string | null;
  defense_bonus: string | null;
  magic_resist_bonus: string | null;
  poison_resist_bonus: string | null;
  fire_resist_bonus: string | null;
  cold_resist_bonus: string | null;
  disease_resist_bonus: string | null;
  block_chance_bonus: string | null;
  accuracy_bonus: string | null;
  critical_chance_bonus: string | null;
  haste_bonus: string | null;
  spell_haste_bonus: string | null;
  health_percent_per_second_bonus: string | null;
  healing_per_second_bonus: string | null;
  mana_percent_per_second_bonus: string | null;
  mana_per_second_bonus: string | null;
  energy_percent_per_second_bonus: string | null;
  energy_per_second_bonus: string | null;
  speed_bonus: string | null;
  damage_shield: string | null;
  cooldown_reduction_percent: string | null;
  heal_on_hit_percent: string | null;
  strength_bonus: string | null;
  intelligence_bonus: string | null;
  dexterity_bonus: string | null;
  charisma_bonus: string | null;
  wisdom_bonus: string | null;
  constitution_bonus: string | null;

  // Special flags
  is_enrage: number;
  is_familiar: number;

  // Denormalized
  granted_by_items: string | null; // JSON array
}

/**
 * Get all skills (client-side async).
 */
export async function getSkills(): Promise<Skill[]> {
  return query<Skill>("SELECT * FROM skills ORDER BY name");
}

/**
 * Get a single skill by ID (client-side async).
 */
export async function getSkillById(id: string): Promise<Skill | null> {
  return queryOne<Skill>("SELECT * FROM skills WHERE id = ?", [id]);
}

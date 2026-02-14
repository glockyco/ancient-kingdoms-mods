import { query, queryOne } from "$lib/db.server";
import type { Class } from "$lib/types/classes";

/**
 * Get all player classes (server-side, for prerendering)
 */
export function getAllClasses(): Class[] {
  return query<Class>(
    `SELECT
      id,
      name,
      description,
      primary_role,
      secondary_role,
      difficulty,
      resource_type,
      compatible_races,
      game_version
    FROM classes
    ORDER BY name`,
  );
}

/**
 * Get a single class by ID (server-side, for prerendering)
 */
export function getClassById(id: string): Class | null {
  return queryOne<Class>(
    `SELECT
      id,
      name,
      description,
      primary_role,
      secondary_role,
      difficulty,
      resource_type,
      compatible_races,
      game_version
    FROM classes
    WHERE id = ?`,
    [id],
  );
}

/**
 * Skill for class detail page (minimal fields for DataTable)
 */
export interface ClassSkill {
  id: string;
  name: string;
  skill_type: string;
  level_required: number;
  // All fields needed by formatSkillEffect
  damage_type: string | null;
  max_level: number;
  damage: string | null;
  damage_percent: string | null;
  lifetap_percent: string | null;
  knockback_chance: string | null;
  stun_chance: string | null;
  stun_time: string | null;
  fear_chance: string | null;
  fear_time: string | null;
  aggro: string | null;
  is_assassination_skill: boolean;
  is_manaburn_skill: boolean;
  break_armor_prob: number;
  heals_health: string | null;
  heals_mana: string | null;
  is_resurrect_skill: boolean;
  is_balance_health: boolean;
  health_max_bonus: string | null;
  health_max_percent_bonus: string | null;
  mana_max_bonus: string | null;
  mana_max_percent_bonus: string | null;
  energy_max_bonus: string | null;
  defense_bonus: string | null;
  ward_bonus: string | null;
  magic_resist_bonus: string | null;
  poison_resist_bonus: string | null;
  fire_resist_bonus: string | null;
  cold_resist_bonus: string | null;
  disease_resist_bonus: string | null;
  damage_bonus: string | null;
  damage_percent_bonus: string | null;
  magic_damage_bonus: string | null;
  magic_damage_percent_bonus: string | null;
  haste_bonus: string | null;
  spell_haste_bonus: string | null;
  speed_bonus: string | null;
  critical_chance_bonus: string | null;
  accuracy_bonus: string | null;
  block_chance_bonus: string | null;
  fear_resist_chance_bonus: string | null;
  damage_shield: string | null;
  cooldown_reduction_percent: string | null;
  heal_on_hit_percent: string | null;
  healing_per_second_bonus: string | null;
  health_percent_per_second_bonus: string | null;
  mana_per_second_bonus: string | null;
  mana_percent_per_second_bonus: string | null;
  energy_per_second_bonus: string | null;
  energy_percent_per_second_bonus: string | null;
  strength_bonus: string | null;
  intelligence_bonus: string | null;
  dexterity_bonus: string | null;
  charisma_bonus: string | null;
  wisdom_bonus: string | null;
  constitution_bonus: string | null;
  duration_base: number;
  is_invisibility: boolean;
  is_mana_shield: boolean;
  is_cleanse: boolean;
  is_dispel: boolean;
  is_blindness: boolean;
  is_enrage: boolean;
  summoned_monster_id: string | null;
  summoned_monster_name: string | null;
  summoned_monster_level: number | null;
  summon_count_per_cast: number | null;
  max_active_summons: number | null;
  pet_name: string | null;
  is_familiar: boolean;
  affects_random_target: boolean;
  area_object_size: number;
  area_objects_to_spawn: number;
  is_poison_debuff: boolean;
  is_fire_debuff: boolean;
  is_cold_debuff: boolean;
  is_disease_debuff: boolean;
  is_melee_debuff: boolean;
  is_magic_debuff: boolean;
  prob_ignore_cleanse: number;
}

/**
 * Get all skills for a class (server-side, for prerendering)
 * Uses universal class-filtered query pattern
 */
export function getClassSkills(className: string): ClassSkill[] {
  return query<ClassSkill>(
    `SELECT
      id,
      name,
      skill_type,
      level_required,
      damage_type,
      max_level,
      damage,
      damage_percent,
      lifetap_percent,
      knockback_chance,
      stun_chance,
      stun_time,
      fear_chance,
      fear_time,
      aggro,
      is_assassination_skill,
      is_manaburn_skill,
      break_armor_prob,
      heals_health,
      heals_mana,
      is_resurrect_skill,
      is_balance_health,
      health_max_bonus,
      health_max_percent_bonus,
      mana_max_bonus,
      mana_max_percent_bonus,
      energy_max_bonus,
      defense_bonus,
      ward_bonus,
      magic_resist_bonus,
      poison_resist_bonus,
      fire_resist_bonus,
      cold_resist_bonus,
      disease_resist_bonus,
      damage_bonus,
      damage_percent_bonus,
      magic_damage_bonus,
      magic_damage_percent_bonus,
      haste_bonus,
      spell_haste_bonus,
      speed_bonus,
      critical_chance_bonus,
      accuracy_bonus,
      block_chance_bonus,
      fear_resist_chance_bonus,
      damage_shield,
      cooldown_reduction_percent,
      heal_on_hit_percent,
      healing_per_second_bonus,
      health_percent_per_second_bonus,
      mana_per_second_bonus,
      mana_percent_per_second_bonus,
      energy_per_second_bonus,
      energy_percent_per_second_bonus,
      strength_bonus,
      intelligence_bonus,
      dexterity_bonus,
      charisma_bonus,
      wisdom_bonus,
      constitution_bonus,
      duration_base,
      is_invisibility,
      is_mana_shield,
      is_cleanse,
      is_dispel,
      is_blindness,
      is_enrage,
      summoned_monster_id,
      summoned_monster_name,
      summoned_monster_level,
      summon_count_per_cast,
      max_active_summons,
      pet_name,
      is_familiar,
      affects_random_target,
      area_object_size,
      area_objects_to_spawn,
      is_poison_debuff,
      is_fire_debuff,
      is_cold_debuff,
      is_disease_debuff,
      is_melee_debuff,
      is_magic_debuff,
      prob_ignore_cleanse
    FROM skills
    WHERE ? IN (SELECT value FROM json_each(player_classes))
       OR 'all' IN (SELECT value FROM json_each(player_classes))
    ORDER BY level_required, name`,
    [className],
  );
}

/**
 * Item for class detail page (minimal fields for DataTable)
 */
export interface ClassItem {
  id: string;
  name: string;
  slot: string | null;
  level_required: number;
  quality: number;
  item_type: string;
}

/**
 * Get all equipment and weapons for a class (server-side, for prerendering)
 * Uses universal class-filtered query pattern + item_type filter
 */
export function getClassItems(className: string): ClassItem[] {
  return query<ClassItem>(
    `SELECT
      id,
      name,
      slot,
      level_required,
      quality,
      item_type
    FROM items
    WHERE item_type IN ('equipment', 'weapon')
      AND (? IN (SELECT value FROM json_each(class_required))
           OR 'all' IN (SELECT value FROM json_each(class_required)))
    ORDER BY level_required, name`,
    [className],
  );
}

/**
 * Quest for class detail page (minimal fields for DataTable)
 */
export interface ClassQuest {
  id: string;
  name: string;
  quest_type: string;
  level_required: number;
  level_recommended: number;
  is_main_quest: boolean;
  is_epic_quest: boolean;
  is_adventurer_quest: boolean;
  is_repeatable: boolean;
}

/**
 * Get all quests with class requirements for a class (server-side, for prerendering)
 * Uses universal class-filtered query pattern
 */
export function getClassQuests(className: string): ClassQuest[] {
  return query<ClassQuest>(
    `SELECT
      id,
      name,
      quest_type,
      level_required,
      level_recommended,
      is_main_quest,
      is_epic_quest,
      is_adventurer_quest,
      is_repeatable
    FROM quests
    WHERE ? IN (SELECT value FROM json_each(class_requirements))
       OR 'all' IN (SELECT value FROM json_each(class_requirements))
    ORDER BY level_required, name`,
    [className],
  );
}

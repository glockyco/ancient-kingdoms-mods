import { getDb, query, queryOne } from "$lib/db.server";
import type { Class } from "$lib/types/classes";
import {
  getItemSourceSummaries,
  getMinimumSourceLevel,
  groupItemSourceSummaries,
} from "$lib/server/item-source-summary";

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
  is_innate?: boolean;
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
  duration_per_level: number;
  is_invisibility: boolean;
  is_mana_shield: boolean;
  is_cleanse: boolean;
  is_dispel: boolean;
  is_teleport: boolean;
  is_blindness: boolean;
  is_enrage: boolean;
  summoned_monster_id: string | null;
  summoned_monster_name: string | null;
  summoned_monster_level: number | null;
  summon_count_per_cast: number | null;
  max_active_summons: number | null;
  pet_name: string | null;
  pet_prefab_name: string | null;
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
  mana_cost: string | null;
  energy_cost: string | null;
  cooldown: string | null;
  cast_time: string | null;
  is_veteran: boolean;
  learn_default: boolean;
  base_skill: boolean;
  tier: number;
  required_spent_points: number;
}

/**
 * Get all skills for a class (server-side, for prerendering)
 * Uses universal class-filtered query pattern
 */
export function getClassSkills(classId: string): ClassSkill[] {
  return query<ClassSkill>(
    `SELECT
      s.id,
      s.name,
      s.skill_type,
      s.level_required,
      s.damage_type,
      s.max_level,
      s.damage,
      s.damage_percent,
      s.lifetap_percent,
      s.knockback_chance,
      s.stun_chance,
      s.stun_time,
      s.fear_chance,
      s.fear_time,
      s.aggro,
      s.is_assassination_skill,
      s.is_manaburn_skill,
      s.break_armor_prob,
      s.heals_health,
      s.heals_mana,
      s.is_resurrect_skill,
      s.is_balance_health,
      s.health_max_bonus,
      s.health_max_percent_bonus,
      s.mana_max_bonus,
      s.mana_max_percent_bonus,
      s.energy_max_bonus,
      s.defense_bonus,
      s.ward_bonus,
      s.magic_resist_bonus,
      s.poison_resist_bonus,
      s.fire_resist_bonus,
      s.cold_resist_bonus,
      s.disease_resist_bonus,
      s.damage_bonus,
      s.damage_percent_bonus,
      s.magic_damage_bonus,
      s.magic_damage_percent_bonus,
      s.haste_bonus,
      s.spell_haste_bonus,
      s.speed_bonus,
      s.critical_chance_bonus,
      s.accuracy_bonus,
      s.block_chance_bonus,
      s.fear_resist_chance_bonus,
      s.damage_shield,
      s.cooldown_reduction_percent,
      s.heal_on_hit_percent,
      s.healing_per_second_bonus,
      s.health_percent_per_second_bonus,
      s.mana_per_second_bonus,
      s.mana_percent_per_second_bonus,
      s.energy_per_second_bonus,
      s.energy_percent_per_second_bonus,
      s.strength_bonus,
      s.intelligence_bonus,
      s.dexterity_bonus,
      s.charisma_bonus,
      s.wisdom_bonus,
      s.constitution_bonus,
      s.duration_base,
      s.duration_per_level,
      s.is_invisibility,
      s.is_mana_shield,
      s.is_cleanse,
      s.is_dispel,
      s.is_teleport,
      s.is_blindness,
      s.is_enrage,
      s.summoned_monster_id,
      m.name as summoned_monster_name,
      s.summoned_monster_level,
      s.summon_count_per_cast,
      s.max_active_summons,
      s.pet_prefab_name as pet_name,
      s.is_familiar,
      s.affects_random_target,
      s.area_object_size,
      s.area_objects_to_spawn,
      s.is_poison_debuff,
      s.is_fire_debuff,
      s.is_cold_debuff,
      s.is_disease_debuff,
      s.is_melee_debuff,
      s.is_magic_debuff,
      s.prob_ignore_cleanse,
      s.mana_cost,
      s.energy_cost,
      s.cooldown,
      s.cast_time,
      s.is_veteran,
      s.learn_default,
      s.base_skill,
      s.tier,
      s.required_spent_points
    FROM skills s
    LEFT JOIN monsters m ON s.summoned_monster_id = m.id
    WHERE (? IN (SELECT value FROM json_each(s.player_classes))
       OR 'all' IN (SELECT value FROM json_each(s.player_classes)))
      AND s.id NOT IN ('alchemy', 'baking', 'crafting', 'digging', 'gathering', 'mining', 'opening', 'teleport', 'new_skill_placeholder')
    ORDER BY s.is_veteran, s.tier, s.level_required, s.name`,
    [classId],
  );
}

/**
 * A single source for an item (from any of the 11 source tables)
 */
export interface ClassItemSource {
  type: string;
  id: string;
  name: string;
  source_level: number | null;
}

/**
 * Item for class detail page with aggregated sources
 */
export interface ClassItem {
  id: string;
  name: string;
  slot: string | null;
  item_level: number;
  level_required: number;
  quality: number;
  item_type: string;
  sources: ClassItemSource[];
  min_source_level: number | null;
}

/**
 * Get all equipment and weapons for a class with aggregated sources.
 */
export function getClassItemsWithSources(
  classId: string,
): (ClassItem & { stat_keys: string })[] {
  const items = query<
    Omit<ClassItem, "sources" | "min_source_level"> & { stat_keys: string }
  >(
    `SELECT
      id,
      name,
      slot,
      item_level,
      level_required,
      quality,
      item_type,
      (
        SELECT json_group_array(json_each.key)
        FROM json_each(stats)
        WHERE json_each.key NOT IN ('max_durability', 'has_serenity', 'is_costume', 'augment_bonus_set')
          AND json_each.value != 0
          AND json_each.value != 0.0
          AND json_each.value != 'false'
      ) as stat_keys
    FROM items
    WHERE item_type IN ('equipment', 'weapon')
      AND (? IN (SELECT value FROM json_each(class_required))
           OR 'all' IN (SELECT value FROM json_each(class_required)))
      AND slot NOT IN ('Shovel', 'Pickaxe')
      AND json_extract(stats, '$.is_costume') IS NOT 1
    ORDER BY level_required, name`,
    [classId],
  );

  const sourceRows = getItemSourceSummaries(
    getDb(),
    items.map((item) => item.id),
  );
  const sourcesByItemId = groupItemSourceSummaries(sourceRows);

  return items.map((item) => {
    const sources = sourcesByItemId.get(item.id) ?? [];
    return {
      ...item,
      sources,
      min_source_level: getMinimumSourceLevel(sources),
    };
  });
}

/**
 * Quest for class detail page (minimal fields for DataTable)
 */
export interface ClassQuest {
  id: string;
  name: string;
  display_type: string;
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
export function getClassQuests(classId: string): ClassQuest[] {
  return query<ClassQuest>(
    `SELECT
      id,
      name,
      display_type,
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
    [classId],
  );
}

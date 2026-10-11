import { getDb, query, queryOne } from "$lib/db.server";
import type { Class } from "$lib/types/classes";
import type { SkillEffectRow } from "$lib/skills/skillEffectRow";
import {
  SKILL_EFFECT_COLUMNS,
  SKILL_EFFECT_JOINS,
} from "$lib/skills/skillsListQuery";
import type { EntityVisualAsset } from "$lib/types/visual-assets";
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
      c.id,
      c.name,
      c.description,
      c.primary_role,
      c.secondary_role,
      c.difficulty,
      c.resource_type,
      c.compatible_races,
      va.public_path AS visual_public_path,
      va.width AS visual_width,
      va.height AS visual_height,
      va.source_field AS visual_source_field,
      va.source_type AS visual_source_type
    FROM classes c
    LEFT JOIN visual_assets va
      ON va.domain = 'class'
     AND va.entity_id = c.id
     AND va.kind = 'icon'
    ORDER BY c.name`,
  );
}

/**
 * Get a single class by ID (server-side, for prerendering)
 */
export function getClassById(id: string): Class | null {
  return queryOne<Class>(
    `SELECT
      c.id,
      c.name,
      c.description,
      c.primary_role,
      c.secondary_role,
      c.difficulty,
      c.resource_type,
      c.compatible_races,
      va.public_path AS visual_public_path,
      va.width AS visual_width,
      va.height AS visual_height,
      va.source_field AS visual_source_field,
      va.source_type AS visual_source_type
    FROM classes c
    LEFT JOIN visual_assets va
      ON va.domain = 'class'
     AND va.entity_id = c.id
     AND va.kind = 'icon'
    WHERE c.id = ?`,
    [id],
  );
}

/**
 * Skill effect row plus class-detail table metadata.
 */
export interface ClassSkill extends SkillEffectRow {
  visual_width: number | null;
  visual_height: number | null;
  visual_source_field: string | null;
  visual_source_type: string | null;
  prerequisite_skill_id: string | null;
  prerequisite_skill_name: string | null;
  prerequisite_level: number;
  prerequisite2_skill_id: string | null;
  prerequisite2_skill_name: string | null;
  prerequisite2_level: number;
  required_weapon_category: string;
  is_innate?: boolean;
  mana_cost: string | null;
  energy_cost: string | null;
  cooldown: string | null;
  cast_time: string | null;
  learn_default: boolean;
  base_skill: boolean;
  required_spent_points: number;
  class_skill_position: number;
}

/**
 * Get all skills for a class (server-side, for prerendering)
 * Uses universal class-filtered query pattern
 */
export function getClassSkills(classId: string): ClassSkill[] {
  return query<ClassSkill>(
    `SELECT
      ${SKILL_EFFECT_COLUMNS},
      va.width AS visual_width,
      va.height AS visual_height,
      va.source_field AS visual_source_field,
      va.source_type AS visual_source_type,
      s.prerequisite_skill_id,
      ps.name AS prerequisite_skill_name,
      s.prerequisite_level,
      s.prerequisite2_skill_id,
      ps2.name AS prerequisite2_skill_name,
      s.prerequisite2_level,
      s.required_weapon_category,
      s.mana_cost,
      s.energy_cost,
      s.cooldown,
      s.cast_time,
      s.learn_default,
      s.base_skill,
      s.required_spent_points,
      json_extract(s.class_skill_positions, '$.' || ?) AS class_skill_position
    FROM skills s
    ${SKILL_EFFECT_JOINS}
    LEFT JOIN skills ps ON ps.id = s.prerequisite_skill_id
    LEFT JOIN skills ps2 ON ps2.id = s.prerequisite2_skill_id
    WHERE (? IN (SELECT value FROM json_each(s.player_classes))
       OR 'all' IN (SELECT value FROM json_each(s.player_classes)))
      AND s.id != 'new_skill_placeholder'
    ORDER BY class_skill_position`,
    [classId, classId],
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
  visual_public_path: string | null;
  visual_width: number | null;
  visual_height: number | null;
  visual_source_field: string | null;
  visual_source_type: string | null;
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
      i.id,
      i.name,
      va.public_path AS visual_public_path,
      va.width AS visual_width,
      va.height AS visual_height,
      va.source_field AS visual_source_field,
      va.source_type AS visual_source_type,
      i.slot,
      i.item_level,
      i.level_required,
      i.quality,
      i.item_type,
      (
        SELECT json_group_array(json_each.key)
        FROM json_each(i.stats)
        WHERE json_each.key NOT IN ('max_durability', 'has_serenity', 'is_costume', 'augment_bonus_set', 'augment_bonus_set_id')
          AND json_each.value != 0
          AND json_each.value != 0.0
          AND json_each.value != 'false'
      ) as stat_keys
    FROM items i
    LEFT JOIN visual_assets va
      ON va.domain = 'item'
     AND va.entity_id = i.id
     AND va.kind = 'icon'
    WHERE i.item_type IN ('equipment', 'weapon')
      AND (? IN (SELECT value FROM json_each(i.class_required))
           OR 'all' IN (SELECT value FROM json_each(i.class_required)))
      AND i.slot NOT IN ('Shovel', 'Pickaxe')
      AND json_extract(i.stats, '$.is_costume') IS NOT 1
    ORDER BY i.level_required, i.name`,
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

/**
 * The class icon the game shows for a class, exported from its UI slot.
 */
export function getClassVisualAsset(classId: string): EntityVisualAsset | null {
  return (
    queryOne<EntityVisualAsset>(
      `SELECT public_path, width, height, source_field, source_type
       FROM visual_assets
       WHERE domain = 'class' AND entity_id = ? AND kind = 'icon'`,
      [classId],
    ) ?? null
  );
}

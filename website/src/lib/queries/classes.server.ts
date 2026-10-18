import { getDb, query, queryOne } from "$lib/db.server";
import type { Class } from "$lib/types/classes";
import type { SkillListRow } from "$lib/skills/skillListRow";
import {
  SKILL_LIST_COLUMNS,
  SKILL_LIST_JOINS,
} from "$lib/skills/skillsListQuery";
import { skillEffectSummaries } from "$lib/skills/skillEffects.server";
import type { EntityVisualAsset } from "$lib/types/visual-assets";
import {
  getItemSourceSummaries,
  getMinimumSourceLevel,
  groupItemSourceSummaries,
  type ItemSourceSummary,
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
 * Skill list row plus class-detail table metadata and the effect summary.
 */
export interface ClassSkill extends SkillListRow {
  effect: string;
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
  duration_base: number;
  duration_per_level: number;
  base_skill: boolean;
  required_spent_points: number;
  class_skill_position: number;
}

/**
 * Get all skills for a class (server-side, for prerendering)
 * Uses universal class-filtered query pattern
 */
export function getClassSkills(classId: string): ClassSkill[] {
  const rows = query<
    Omit<
      ClassSkill,
      | "effect"
      | "prerequisite_skill_id"
      | "prerequisite_skill_name"
      | "prerequisite_level"
      | "prerequisite2_skill_id"
      | "prerequisite2_skill_name"
      | "prerequisite2_level"
    >
  >(
    `SELECT
      ${SKILL_LIST_COLUMNS},
      va.width AS visual_width,
      va.height AS visual_height,
      va.source_field AS visual_source_field,
      va.source_type AS visual_source_type,
      s.required_weapon_category,
      s.mana_cost,
      s.energy_cost,
      s.cooldown,
      s.cast_time,
      s.duration_base,
      s.duration_per_level,
      s.base_skill,
      s.required_spent_points,
      json_extract(s.class_skill_positions, '$.' || ?) AS class_skill_position
    FROM skills s
    ${SKILL_LIST_JOINS}
    WHERE (? IN (SELECT value FROM json_each(s.player_classes))
       OR 'all' IN (SELECT value FROM json_each(s.player_classes)))
    ORDER BY class_skill_position`,
    [classId, classId],
  );
  const effects = skillEffectSummaries(rows.map((row) => row.id));
  const prerequisites = query<{
    id: string;
    skill_id: string | null;
    name: string | null;
    rank: number;
    withheld: boolean;
    owner_skill_id: string;
  }>(
    `SELECT p.id, p.skill_id AS owner_skill_id, p.predecessor_skill_id AS skill_id,
            s.name, p.rank, p.withheld
     FROM skill_predecessors p
     LEFT JOIN skills s ON s.id = p.predecessor_skill_id
     WHERE p.skill_id IN (SELECT value FROM json_each(?))
     ORDER BY p.skill_id, p.ordinal`,
    [JSON.stringify(rows.map((row) => row.id))],
  );
  const prerequisitesBySkill = new Map<
    string,
    Omit<(typeof prerequisites)[number], "owner_skill_id">[]
  >();
  for (const { owner_skill_id, ...requirement } of prerequisites) {
    const list = prerequisitesBySkill.get(owner_skill_id) ?? [];
    list.push({ ...requirement, withheld: Boolean(requirement.withheld) });
    prerequisitesBySkill.set(owner_skill_id, list);
  }
  return rows.map((row, index) => ({
    ...row,
    effect: effects[index],
    prerequisite_skill_id:
      prerequisitesBySkill.get(row.id)?.[0]?.skill_id ?? null,
    prerequisite_skill_name:
      prerequisitesBySkill.get(row.id)?.[0]?.name ??
      (prerequisitesBySkill.get(row.id)?.[0]?.withheld
        ? "Unpublished skill"
        : null),
    prerequisite_level: prerequisitesBySkill.get(row.id)?.[0]?.rank ?? 0,
    prerequisite2_skill_id:
      prerequisitesBySkill.get(row.id)?.[1]?.skill_id ?? null,
    prerequisite2_skill_name:
      prerequisitesBySkill.get(row.id)?.[1]?.name ??
      (prerequisitesBySkill.get(row.id)?.[1]?.withheld
        ? "Unpublished skill"
        : null),
    prerequisite2_level: prerequisitesBySkill.get(row.id)?.[1]?.rank ?? 0,
  }));
}

export type ClassItemSource = Omit<ItemSourceSummary, "item_id">;

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
export async function getClassItemsWithSources(
  classId: string,
): Promise<(ClassItem & { stat_keys: string })[]> {
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
      AND (EXISTS (
        SELECT 1 FROM item_class_requirements cr
        WHERE cr.item_id = i.id AND cr.class_id = ?
      ) OR NOT EXISTS (
        SELECT 1 FROM item_class_requirements cr WHERE cr.item_id = i.id
      ))
      AND i.slot NOT IN ('Shovel', 'Pickaxe')
      AND json_extract(i.stats, '$.is_costume') IS NOT 1
    ORDER BY i.level_required, i.name`,
    [classId],
  );

  const sourceRows = await getItemSourceSummaries(
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
    WHERE EXISTS (
      SELECT 1 FROM quest_class_requirements cr
      WHERE cr.quest_id = quests.id AND cr.class_id = ?
    )
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

import { SKILL_LIST_COLUMNS, SKILL_LIST_JOINS } from "./skillsListQuery";

/**
 * A monster's ability table, ordered as the game lists it.
 *
 * Composed from the shared list columns, plus the slot index the game casts
 * from, the rank MonsterSkills assigns, and the cast time and cooldown shown in
 * the ability table.
 */
export const MONSTER_ABILITIES_QUERY = `SELECT
    ms.skill_index,
    ms.runtime_level,
    s.cooldown,
    s.cast_time,
    ${SKILL_LIST_COLUMNS}
    FROM monster_skills ms
    JOIN skills s ON s.id = ms.skill_id
    ${SKILL_LIST_JOINS}
    WHERE ms.monster_id = ?
    ORDER BY ms.skill_index`;

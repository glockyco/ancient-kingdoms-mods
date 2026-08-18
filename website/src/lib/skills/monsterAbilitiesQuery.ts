import { SKILL_EFFECT_COLUMNS, SKILL_EFFECT_JOINS } from "./skillsListQuery";

/**
 * A monster's ability table, ordered as the game lists it.
 *
 * Composed from the shared effect columns so a monster ability and the same row
 * on `/skills` render the identical effect summary. Only the monster-specific
 * additions live here: the slot index the game casts from, plus the cast time
 * and cooldown shown in the ability table.
 */
export const MONSTER_ABILITIES_QUERY = `SELECT
    ms.skill_index,
    ms.runtime_level,
    s.cooldown,
    s.cast_time,
    ${SKILL_EFFECT_COLUMNS}
    FROM monster_skills ms
    JOIN skills s ON s.id = ms.skill_id
    ${SKILL_EFFECT_JOINS}
    WHERE ms.monster_id = ?
    ORDER BY ms.skill_index`;

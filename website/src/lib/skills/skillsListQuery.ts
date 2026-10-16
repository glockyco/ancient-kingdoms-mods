/**
 * Shared SQL for the skill tables on the skills list, class, pet and monster
 * pages. `SKILL_LIST_COLUMNS` holds what those tables display. Their effect
 * summaries come from `skillEffectInputs`, which reads the full skill row.
 *
 * `SKILLS_LIST_QUERY` is used by the `/skills` page loader
 * (`routes/skills/+page.server.ts`) and the BetterBestiary parity-corpus bake
 * (`scripts/gen-skill-effect-parity.ts`), so the corpus covers the same skills
 * as the overview.
 */
export const SKILL_LIST_COLUMNS = `
      s.id,
      s.name,
      va.public_path as visual_public_path,
      s.skill_type,
      s.tier,
      s.max_level,
      s.level_required,
      s.player_classes,
      s.is_spell,
      s.is_veteran,
      s.is_pet_skill,
      s.is_mercenary_skill,
      s.summoned_monster_id,
      sm.name as summoned_monster_name,
      s.summoned_monster_level,
      s.summon_count_per_cast,
      s.max_active_summons,
      s.pet_id,
      pet_lookup.name as pet_name`;

export const SKILL_LIST_JOINS = `    LEFT JOIN monsters sm ON sm.id = s.summoned_monster_id
    LEFT JOIN pets pet_lookup ON pet_lookup.id = s.pet_id
    LEFT JOIN visual_assets va
      ON va.domain = 'skill'
     AND va.entity_id = s.id
     AND va.kind = 'icon'`;

export const SKILLS_LIST_QUERY = `SELECT
    ${SKILL_LIST_COLUMNS}
    FROM skills s
    ${SKILL_LIST_JOINS}
    ORDER BY s.tier ASC, s.name ASC`;

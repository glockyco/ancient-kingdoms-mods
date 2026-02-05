import { query, queryOne } from "$lib/db.server";
import type { Skill } from "./skills";
import type { SkillListViewRaw } from "$lib/types/skills";

/**
 * Get all skills with fields needed for overview page + tag/category derivation.
 * CC/heal base_values are extracted via json_extract to avoid client-side JSON parsing.
 */
export function getSkills(): SkillListViewRaw[] {
  return query<SkillListViewRaw>(
    `SELECT
      id,
      name,
      skill_type,
      max_level,
      level_required,
      player_classes,
      is_spell,
      is_veteran,
      is_pet_skill,
      is_mercenary_skill,
      is_resurrect_skill,
      is_invisibility,
      is_cleanse,
      is_dispel,
      is_stance,
      is_mana_shield,
      is_enrage,
      json_extract(stun_chance, '$.base_value') as stun_chance_base,
      json_extract(fear_chance, '$.base_value') as fear_chance_base,
      json_extract(knockback_chance, '$.base_value') as knockback_chance_base,
      json_extract(heals_health, '$.base_value') as heals_health_base
    FROM skills
    ORDER BY name`,
  );
}

/**
 * Get a single skill by ID with all columns (server-side, for prerendering).
 */
export function getSkillById(id: string): Skill | null {
  return queryOne<Skill>("SELECT * FROM skills WHERE id = ?", [id]);
}

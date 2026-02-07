import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import { DB_STATIC_PATH } from "$lib/constants/constants";
import type { SkillListView } from "$lib/types/skills";

export const prerender = true;

interface SkillRow {
  id: string;
  name: string;
  skill_type: string;
  tier: number;
  max_level: number;
  level_required: number;
  player_classes: string | null;
  is_spell: number;
  is_veteran: number;
  is_pet_skill: number;
  is_mercenary_skill: number;
}

export interface SkillsPageData {
  skills: SkillListView[];
}

export const load: PageServerLoad = (): SkillsPageData => {
  const db = new Database(DB_STATIC_PATH, { readonly: true });

  const rows = db
    .prepare(
      `
      SELECT
        id,
        name,
        skill_type,
        tier,
        max_level,
        level_required,
        player_classes,
        is_spell,
        is_veteran,
        is_pet_skill,
        is_mercenary_skill
      FROM skills
      ORDER BY tier ASC, name ASC
    `,
    )
    .all() as SkillRow[];

  db.close();

  const skills: SkillListView[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    skill_type: row.skill_type,
    tier: row.tier,
    max_level: row.max_level,
    level_required: row.level_required,
    player_classes: row.player_classes ? JSON.parse(row.player_classes) : [],
    is_spell: Boolean(row.is_spell),
    is_veteran: Boolean(row.is_veteran),
    is_pet_skill: Boolean(row.is_pet_skill),
    is_mercenary_skill: Boolean(row.is_mercenary_skill),
  }));

  return { skills };
};

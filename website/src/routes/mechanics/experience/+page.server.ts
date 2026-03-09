import Database from "better-sqlite3";
import type { PageServerLoad } from "./$types";
import { DB_STATIC_PATH } from "$lib/constants/constants";

export const prerender = true;

interface SkillRef {
  id: string;
  name: string;
}

interface ExperiencePageData {
  doubleExpSkills: SkillRef[];
}

export const load: PageServerLoad = (): ExperiencePageData => {
  const db = new Database(DB_STATIC_PATH, { readonly: true });

  const doubleExpSkills = db
    .prepare(
      `
      SELECT id, name
      FROM skills
      WHERE is_double_exp_spell = 1
      ORDER BY name
    `,
    )
    .all() as SkillRef[];

  db.close();

  return { doubleExpSkills };
};

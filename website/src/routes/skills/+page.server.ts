import { getSkills } from "$lib/queries/skills.server";
import { deriveSkillCategory, deriveSkillTags } from "$lib/constants/skills";
import type { SkillListViewClient } from "$lib/types/skills";
import type { PageServerLoad } from "./$types";

export const prerender = true;

export const load: PageServerLoad = () => {
  const rawSkills = getSkills();

  // Precompute class keys at build time (parallel map, matching items pattern)
  const classKeys: Record<string, string[]> = {};
  for (const skill of rawSkills) {
    classKeys[skill.id] = JSON.parse(skill.player_classes) as string[];
  }

  // Build client-ready rows with derived tags and category
  const skills: SkillListViewClient[] = rawSkills.map((skill) => ({
    id: skill.id,
    name: skill.name,
    skill_type: skill.skill_type,
    max_level: skill.max_level,
    level_required: skill.level_required,
    tags: deriveSkillTags(skill),
    category: deriveSkillCategory(skill),
  }));

  return { skills, classKeys };
};

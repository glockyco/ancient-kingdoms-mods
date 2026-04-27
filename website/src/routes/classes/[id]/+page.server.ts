import {
  getClassById,
  getClassSkills,
  getClassItemsWithSources,
  getClassQuests,
} from "$lib/queries/classes.server";
import { error } from "@sveltejs/kit";
import { validateClassName } from "$lib/utils/validateClassName";
import { classDescription } from "$lib/server/meta-description";
import type { PageServerLoad } from "./$types";

export const prerender = true;

export const load: PageServerLoad = ({ params }) => {
  const className = validateClassName(params.id);
  const classData = getClassById(className);

  if (!classData) {
    throw error(404, `Class not found: ${className}`);
  }

  const rawItems = getClassItemsWithSources(classData.id);

  // Precompute parsed stat key arrays at build time (avoids JSON.parse on client)
  const itemStatKeys: Record<string, string[]> = {};
  for (const item of rawItems) {
    itemStatKeys[item.id] = JSON.parse(item.stat_keys) as string[];
  }

  // Strip stat_keys from items before sending to client
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const items = rawItems.map(({ stat_keys: _, ...item }) => item);

  const skills = getClassSkills(classData.id);

  // Build signature skills from the first 3 base skills, or first 3 if no base filter
  const baseSkills = skills.filter((s) => s.base_skill);
  const signatureSkills = (baseSkills.length > 0 ? baseSkills : skills)
    .slice(0, 3)
    .map((s) => ({ name: s.name }));

  // Generate meta description
  const description = classDescription({
    name: classData.name,
    description: classData.description,
    primary_role: classData.primary_role,
    secondary_role: classData.secondary_role ?? null,
    resource_type: classData.resource_type,
    compatible_races: classData.compatible_races,
    signature_skills: signatureSkills,
  });

  return {
    class: classData,
    skills,
    items,
    itemStatKeys,
    quests: getClassQuests(classData.id),
    description,
  };
};

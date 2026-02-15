import {
  getAllClasses,
  getClassById,
  getClassSkills,
  getClassItemsWithSources,
  getClassQuests,
} from "$lib/queries/classes.server";
import { error } from "@sveltejs/kit";
import { validateClassName } from "$lib/utils/validateClassName";
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

  return {
    class: classData,
    allClasses: getAllClasses(),
    skills: getClassSkills(classData.id),
    items,
    itemStatKeys,
    quests: getClassQuests(classData.id),
  };
};

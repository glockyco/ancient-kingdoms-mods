import { getClassById } from "$lib/queries/classes.server";
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

  return {
    class: classData,
  };
};

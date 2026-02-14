import { getAllClasses } from "$lib/queries/classes.server";
import type { PageServerLoad } from "./$types";

export const prerender = true;

export const load: PageServerLoad = () => {
  const classes = getAllClasses();

  return {
    classes,
  };
};

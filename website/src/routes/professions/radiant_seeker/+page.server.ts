import type { PageServerLoad } from "./$types";
import {
  getRadiantSeekerPageData,
  type RadiantSeekerPageData,
} from "./radiant-seeker-page-data.server";

export const prerender = true;

export const load: PageServerLoad = (): RadiantSeekerPageData =>
  getRadiantSeekerPageData();

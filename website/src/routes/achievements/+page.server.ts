import type { PageServerLoad } from "./$types";
import { getAchievementsPageData } from "./achievements-page-data.server";

export const prerender = true;

export const load: PageServerLoad = () => getAchievementsPageData();

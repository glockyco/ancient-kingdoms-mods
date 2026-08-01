import type { PageServerLoad } from "./$types";
import {
  getSlayerPageData,
  type SlayerPageData,
} from "./slayer-page-data.server";

export const prerender = true;

export const load: PageServerLoad = (): SlayerPageData => getSlayerPageData();

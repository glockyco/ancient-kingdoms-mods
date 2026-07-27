import type { PageServerLoad } from "./$types";
import {
  getMercenaryCurves,
  getTaverns,
  type Tavern,
} from "$lib/queries/mercenaries.server";
import type { Curves } from "$lib/utils/merc-stats";

export const prerender = true;

export interface MercStatsData {
  curves: Curves;
  taverns: Tavern[];
}

export const load: PageServerLoad = (): MercStatsData => ({
  curves: getMercenaryCurves(),
  taverns: getTaverns(),
});

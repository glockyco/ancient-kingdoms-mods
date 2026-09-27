import type { PageServerLoad } from "./$types";
import {
  getMercenaryCurves,
  getMercenaryLinks,
  getTaverns,
  type Tavern,
} from "$lib/queries/mercenaries.server";
import type { MercenaryLink } from "$lib/types/pets";
import type { Curves } from "$lib/utils/merc-stats";

export const prerender = true;

export interface MercStatsData {
  curves: Curves;
  taverns: Tavern[];
  links: MercenaryLink[];
}

export const load: PageServerLoad = (): MercStatsData => ({
  curves: getMercenaryCurves(),
  taverns: getTaverns(),
  links: getMercenaryLinks(),
});

import { getMercenaryLinks } from "$lib/queries/mercenaries.server";
import {
  getMercenaryRecruiters,
  getMercenarySummaries,
} from "$lib/queries/pets.server";
import type { PageServerLoad } from "./$types";

export const prerender = true;

export const load: PageServerLoad = () => ({
  mercenaries: getMercenarySummaries(),
  links: getMercenaryLinks(),
  recruiters: getMercenaryRecruiters(),
});

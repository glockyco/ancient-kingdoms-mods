import type { PageServerLoad } from "./$types";
import { getReputationTiers } from "$lib/queries/factions.server";
import type { ReputationTier } from "$lib/utils/reputation";

export const prerender = true;

export interface ReputationMechanicsPageData {
  tiers: ReputationTier[];
}

export const load: PageServerLoad = (): ReputationMechanicsPageData => ({
  tiers: getReputationTiers(),
});

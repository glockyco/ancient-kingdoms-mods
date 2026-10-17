import {
  loadAllMapEntitiesServer,
  loadZoneListServer,
} from "$lib/queries/map.server";
import type { PageServerLoad } from "./$types";
import { query } from "$lib/db.server";
import type { ReputationTier } from "$lib/utils/reputation";

export const prerender = true;

export const load: PageServerLoad = () => {
  const entityData = loadAllMapEntitiesServer();
  const zoneList = loadZoneListServer();
  const reputationTiers = query<ReputationTier>(
    "SELECT * FROM reputation_tiers ORDER BY id",
  );
  return { entityData, zoneList, reputationTiers };
};

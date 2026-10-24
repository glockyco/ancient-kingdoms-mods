import type { PageServerLoad } from "./$types";
import { query } from "$lib/db.server";
import {
  getRegionalEventSettings,
  getRegionalInvasions,
  getRegionalInvasionAttackers,
} from "$lib/queries/regional-events.server";

export const prerender = true;

export const load = (() => {
  const attackers = getRegionalInvasionAttackers();
  return {
    settings: getRegionalEventSettings(),
    invasions: getRegionalInvasions().map((invasion) => ({
      ...invasion,
      attackers: attackers.filter(
        (attacker) => attacker.invasion_id === invasion.id,
      ),
    })),
    // Source: server-scripts/RegionalEvents.cs:497-551 — the standard regions are zones 1 through 5, and ore requests use zones 2, 3 and 5.
    regions: query<{ id: string; name: string; zone_id: number }>(
      "SELECT id, name, zone_id FROM zones WHERE zone_id BETWEEN 1 AND 5 ORDER BY zone_id",
    ),
  };
}) satisfies PageServerLoad;

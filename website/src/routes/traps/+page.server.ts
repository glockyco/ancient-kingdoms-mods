import {
  getTrapsList,
  groupPositionlessTraps,
} from "$lib/queries/traps.server";
import type { PageServerLoad } from "./$types";

export const prerender = true;

export const load: PageServerLoad = () => {
  const placements = getTrapsList();
  // Redaction removes positions only in zones where the game withholds them
  // (redactions.toml [zones.suppress_positions]).
  const withheldZones = [
    ...new Set(
      placements
        .filter((trap) => trap.position_x == null)
        .map((trap) => trap.zone_name),
    ),
  ].sort();
  return { traps: groupPositionlessTraps(placements), withheldZones };
};

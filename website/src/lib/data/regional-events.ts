import { formatRange } from "$lib/utils/format";

// Code rules that the export cannot carry. The export holds what the game
// discovers per region: fishing, hunting and cooking requests.

// Source: server-scripts/RegionalEvents.cs:TryStart — zone 22 is the Northern Wastes. It joins the candidate regions only while a level 35 player is online, and it never hosts herb requests.
const NORTHERN_WASTES = 22;
// Source: server-scripts/RegionalEvents.cs:TryStart — ore requests use zones 2, 3 and 5.
const ORE_ZONES = new Set([2, 3, 5]);
// Source: server-scripts/RegionalEventProgress.cs:38-48 — goals count at most five players.
export const MAX_COUNTED_PLAYERS = 5;

export const hostsHerbRequests = (zoneNumber: number) =>
  zoneNumber !== NORTHERN_WASTES;

export const hostsOreRequests = (zoneNumber: number) =>
  ORE_ZONES.has(zoneNumber);

/** Whether the region hosts events only while a level 35 or higher player is online. */
export const needsLevel35Player = (zoneNumber: number) =>
  zoneNumber === NORTHERN_WASTES;

/**
 * The player counts at which a hunt can ask for an animal, such as "1 - 2
 * players", or null when any count qualifies. More players raise the goal,
 * and an animal that respawns too slowly for it drops out.
 */
export function huntPlayers(maxPlayers: number): string | null {
  if (maxPlayers >= MAX_COUNTED_PLAYERS) return null;
  return maxPlayers === 1
    ? "1 player"
    : `${formatRange(1, maxPlayers)} players`;
}

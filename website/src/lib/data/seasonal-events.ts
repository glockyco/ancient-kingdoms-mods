// Source: server-scripts/EnviromentSystem.cs:CheckSpecialEvents — Halloween runs from October 19 through November 1 and the Winter Festival from December 19 through January 6, by UTC date.
export const SEASONS = {
  halloween: {
    name: "Halloween",
    anchor: "halloween",
    dates: "October 19 to November 1",
  },
  christmas: {
    name: "Winter Festival",
    anchor: "winter-festival",
    dates: "December 19 to January 6",
  },
} as const;

/** The game's season keys, as the export records them on seasonal shop offers. */
export type Season = keyof typeof SEASONS;

/** Calendar position of each season, for ordering season lists. */
export const SEASON_ORDER = Object.fromEntries(
  Object.keys(SEASONS).map((season, index) => [season, index]),
) as Record<Season, number>;

export const SEASONAL_EVENTS_HREF = "/mechanics/seasonal-events";

export const seasonHref = (season: Season) =>
  `${SEASONAL_EVENTS_HREF}#${SEASONS[season].anchor}`;

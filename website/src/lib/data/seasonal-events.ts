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

export const SEASONAL_EVENTS_HREF = "/mechanics/seasonal-events";

export const seasonHref = (season: Season) =>
  `${SEASONAL_EVENTS_HREF}#${SEASONS[season].anchor}`;

/** A calendar date without a year, in UTC. */
interface MonthDay {
  readonly month: number;
  readonly day: number;
}

interface SeasonDefinition {
  readonly name: string;
  /** The season's section on the Seasonal Events page. */
  readonly anchor: string;
  /** First and last UTC dates of the season, both included. */
  readonly start: MonthDay;
  readonly end: MonthDay;
}

// Source: server-scripts/EnviromentSystem.cs:CheckSpecialEvents — Halloween runs from October 19 through November 1 and the Winter Festival from December 19 through January 6, by UTC date.
export const SEASONS = {
  halloween: {
    name: "Halloween",
    anchor: "halloween",
    start: { month: 10, day: 19 },
    end: { month: 11, day: 1 },
  },
  christmas: {
    name: "Winter Festival",
    anchor: "winter-festival",
    start: { month: 12, day: 19 },
    end: { month: 1, day: 6 },
  },
} as const satisfies Record<string, SeasonDefinition>;

/** The game's season keys, as the export records them on seasons, actors and offers. */
export type Season = keyof typeof SEASONS;

/** Calendar position of each season, for ordering season lists. */
export const SEASON_ORDER = Object.fromEntries(
  Object.keys(SEASONS).map((season, index) => [season, index]),
) as Record<Season, number>;

export const SEASONAL_EVENTS_HREF = "/mechanics/seasonal-events";

export const seasonHref = (season: Season) =>
  `${SEASONAL_EVENTS_HREF}#${SEASONS[season].anchor}`;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const formatMonthDay = ({ month, day }: MonthDay) =>
  `${MONTH_NAMES[month - 1]} ${day}`;

/** The season's dates as a reader sees them, for example "October 19 to November 1". */
export function seasonDates(season: Season): string {
  const { start, end } = SEASONS[season];
  return `${formatMonthDay(start)} to ${formatMonthDay(end)}`;
}

/**
 * Whether a UTC instant falls inside the season. Both end dates are included,
 * and a season whose end comes before its start wraps the year boundary.
 */
export function seasonIncludes(season: Season, instant: Date): boolean {
  const { start, end } = SEASONS[season];
  const key = (month: number, day: number) => month * 100 + day;
  const today = key(instant.getUTCMonth() + 1, instant.getUTCDate());
  const first = key(start.month, start.day);
  const last = key(end.month, end.day);
  return first <= last
    ? today >= first && today <= last
    : today >= first || today <= last;
}

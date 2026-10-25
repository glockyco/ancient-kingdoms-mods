/** A calendar date without a year, in UTC. */
interface MonthDay {
  readonly month: number;
  readonly day: number;
}

interface SeasonDefinition {
  readonly name: string;
  /** The article a sentence puts before the name, as in "during the Winter Festival". */
  readonly article: "the" | null;
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
    article: null,
    anchor: "halloween",
    start: { month: 10, day: 19 },
    end: { month: 11, day: 1 },
  },
  christmas: {
    name: "Winter Festival",
    article: "the",
    anchor: "winter-festival",
    start: { month: 12, day: 19 },
    end: { month: 1, day: 6 },
  },
} as const satisfies Record<string, SeasonDefinition>;

/** The season's name as it reads inside a sentence, for example "the Winter Festival". */
export function seasonInSentence(season: Season): string {
  const { article, name } = SEASONS[season];
  return article ? `${article} ${name}` : name;
}

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
 * The season's current run, or its next one when it is not running. A run
 * starts at midnight UTC on its first date and ends at midnight UTC after its
 * last date, and a season whose end comes before its start wraps the year.
 */
export function seasonOccurrence(
  season: Season,
  instant: Date,
): { start: Date; end: Date } {
  const { start, end }: SeasonDefinition = SEASONS[season];
  const wraps =
    end.month < start.month ||
    (end.month === start.month && end.day < start.day);
  const year = instant.getUTCFullYear();
  for (const startYear of [year - 1, year, year + 1]) {
    const run = {
      start: new Date(Date.UTC(startYear, start.month - 1, start.day)),
      end: new Date(
        Date.UTC(startYear + (wraps ? 1 : 0), end.month - 1, end.day + 1),
      ),
    };
    if (run.end > instant) return run;
  }
  throw new Error(`${season} has no run after ${instant.toISOString()}`);
}

/** Whether a UTC instant falls inside the season, both end dates included. */
export function seasonIncludes(season: Season, instant: Date): boolean {
  return seasonOccurrence(season, instant).start <= instant;
}

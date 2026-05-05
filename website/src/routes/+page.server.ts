import type { PageServerLoad } from "./$types";
import { HOME_COUNTS, type HomeCounts } from "$lib/generated/home-counts";
import { fetchGameVersion } from "$lib/server/game-version";
import type { GameVersionResult } from "$lib/steam-news-parser";

// Opt out of prerendering so the live game version is fetched fresh on each
// edge cache miss instead of being baked in at build time. Static counts are
// snapshotted at prebuild time (see scripts/generate-home-counts.mjs) so this
// load runs without touching SQLite — required because Workers can't use
// better-sqlite3.
export const prerender = false;

interface HomePageData {
  counts: HomeCounts;
  live: GameVersionResult;
}

export const load: PageServerLoad = async ({
  setHeaders,
}): Promise<HomePageData> => {
  const live = await fetchGameVersion();

  // Edge-cache the rendered HTML. s-maxage matches the Steam upstream cache
  // TTL so we don't render the page more often than the data changes; the
  // shorter max-age keeps the user-agent's local copy snappy without showing
  // truly stale data on back-forward navigations. On upstream failure we
  // shorten both windows so the next visitor recovers quickly.
  setHeaders({
    "cache-control": live.ok
      ? "public, s-maxage=600, max-age=120"
      : "public, s-maxage=60, max-age=30",
  });

  return { counts: HOME_COUNTS, live };
};

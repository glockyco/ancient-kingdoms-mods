import type { PageServerLoad } from "./$types";
import { fetchGameVersion } from "$lib/server/game-version";
import type { GameVersionResult } from "$lib/steam-news-parser";

// Opt out of prerendering so the live game version is fetched fresh on each
// edge cache miss instead of being baked in at build time.
//
// Entity counts are deliberately NOT returned here. They are a build-time
// snapshot (see scripts/generate-home-counts.mjs) that the page component
// imports directly, so they ship inside the same immutable bundle as the code
// reading them. Putting them in this payload instead would version them
// separately from that code: the response below is edge-cached for s-maxage,
// so for one cache window after a deploy a fresh bundle would be paired with
// the previous deploy's counts object and crash on any key added or renamed in
// between. This load returns only runtime data whose shape is stable across
// deploys.
export const prerender = false;

interface HomePageData {
  live: GameVersionResult;
  checkedAt: string;
}

export const load: PageServerLoad = async ({
  setHeaders,
}): Promise<HomePageData> => {
  const live = await fetchGameVersion();

  // ISO date (YYYY-MM-DD) of the render. Surfaced to users as "Checked on
  // …" so they can see the page is live, and exposed via a `<time datetime>`
  // element so crawlers latch onto the freshness signal. UTC is correct
  // here: Cloudflare Workers run in UTC, the value rolls over at most once
  // per s-maxage window, and YYYY-MM-DD is unambiguous regardless of the
  // viewer's locale.
  const checkedAt = new Date().toISOString().slice(0, 10);

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

  return { live, checkedAt };
};

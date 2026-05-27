import {
  parseGameVersionRss,
  type GameVersionResult,
} from "../steam-news-parser";

const STEAM_NEWS_RSS_URL =
  "https://store.steampowered.com/feeds/news/app/2241380/?cc=US&l=en";

/**
 * Fetches the latest game version from the Steam News RSS feed.
 *
 * Called from the home page's server load function (`+page.server.ts`) so the
 * version is server-rendered into the initial HTML — no client fetch, no
 * load flash. Lives under `$lib/server/` so SvelteKit guarantees it never
 * gets bundled into client code.
 *
 * The `cf` field on RequestInit is a Cloudflare Workers extension that lets
 * workerd cache the upstream response at the colo for ~10 minutes, capping
 * Steam hits regardless of home page traffic. svelte-check uses DOM fetch
 * types which don't know about `cf`; Node's fetch (Vite dev) silently ignores
 * unknown init fields. Both paths therefore work, only prod gets the colo
 * cache.
 */
export async function fetchGameVersion(): Promise<GameVersionResult> {
  try {
    const upstream = await fetch(STEAM_NEWS_RSS_URL, {
      // @ts-expect-error - `cf` is a Cloudflare Workers extension to RequestInit;
      // DOM fetch (svelte-check tsconfig) does not know about it, but Node's fetch
      // (Vite dev) silently ignores unknown init fields.
      cf: { cacheTtl: 600, cacheEverything: true },
    });
    if (!upstream.ok) return { ok: false };
    const body = await upstream.text();
    return parseGameVersionRss(body);
  } catch {
    return { ok: false };
  }
}

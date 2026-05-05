import {
  parseGameVersion,
  type GameVersionResult,
  type SteamNewsItem,
} from "../steam-news-parser";

const STEAM_NEWS_URL =
  "https://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?appid=2241380&count=10&format=json";

interface SteamNewsResponse {
  appnews?: { newsitems?: SteamNewsItem[] };
}

/**
 * Fetches the latest game version from the Steam News API.
 *
 * Called from the home page's server load function (`+page.server.ts`) so the
 * version is server-rendered into the initial HTML — no client fetch, no
 * load flash. Lives under `$lib/server/` so SvelteKit guarantees it never
 * gets bundled into client code.
 *
 * The `cf` field on RequestInit is a Cloudflare Workers extension that lets
 * workerd cache the upstream response at the colo for ~10 minutes, capping
 * Steam API hits regardless of home page traffic. svelte-check uses DOM
 * fetch types which don't know about `cf`; Node's fetch (Vite dev) silently
 * ignores unknown init fields. Both paths therefore work, only prod gets
 * the colo cache.
 */
export async function fetchGameVersion(): Promise<GameVersionResult> {
  try {
    const upstream = await fetch(STEAM_NEWS_URL, {
      // @ts-expect-error - `cf` is a Cloudflare Workers extension to RequestInit;
      // DOM fetch (svelte-check tsconfig) does not know about it, but Node's fetch
      // (Vite dev) silently ignores unknown init fields.
      cf: { cacheTtl: 600, cacheEverything: true },
    });
    if (!upstream.ok) return { ok: false };
    const body = (await upstream.json()) as SteamNewsResponse;
    return parseGameVersion(body?.appnews?.newsitems);
  } catch {
    return { ok: false };
  }
}

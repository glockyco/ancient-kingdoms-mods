import {
  parseGameVersion,
  type GameVersionResult,
  type SteamNewsItem,
} from "./steam-news-parser.ts";

const STEAM_NEWS_URL =
  "https://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?appid=2241380&count=10&format=json";

interface SteamNewsResponse {
  appnews?: { newsitems?: SteamNewsItem[] };
}

export interface GameVersionRouteResult {
  body: string;
  cacheControl: string;
}

/**
 * Build the JSON body and Cache-Control header for the /api/game-version
 * route. Used by both the production Cloudflare Worker (worker/index.ts) and
 * the Vite dev middleware (vite.config.ts) so the dev experience matches what
 * ships to production.
 *
 * The upstream Steam fetch is annotated with a Cloudflare-specific `cf`
 * RequestInit field — workerd reads it for ~10-minute edge caching per CF
 * colo. Node's fetch (used by Vite dev) silently ignores unknown init fields
 * at runtime, so the dev path is unaffected aside from losing the cache.
 */
export async function buildGameVersionResponse(): Promise<GameVersionRouteResult> {
  let result: GameVersionResult;
  try {
    const upstream = await fetch(STEAM_NEWS_URL, {
      // @ts-expect-error - `cf` is a Cloudflare Workers extension to RequestInit;
      // DOM fetch (svelte-check tsconfig) does not know about it, but Node's fetch
      // (Vite dev) silently ignores unknown init fields.
      cf: { cacheTtl: 600, cacheEverything: true },
    });
    if (!upstream.ok) {
      result = { ok: false };
    } else {
      const body = (await upstream.json()) as SteamNewsResponse;
      result = parseGameVersion(body?.appnews?.newsitems);
    }
  } catch {
    result = { ok: false };
  }

  return {
    body: JSON.stringify(result),
    cacheControl: result.ok
      ? "public, s-maxage=600, max-age=120"
      : "public, s-maxage=60, max-age=30",
  };
}

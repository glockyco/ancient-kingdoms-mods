import {
  parseGameVersionRss,
  type GameVersionResult,
} from "../steam-news-parser";

// The parameter order differs from the URL Cloudflare's cache held a Steam 403
// for, which kept answering after the cause was gone.
const STEAM_NEWS_RSS_URL =
  "https://store.steampowered.com/feeds/news/app/2241380/?l=en&cc=US";

/**
 * Fetches the latest game version from the Steam News RSS feed.
 *
 * Called from the home page's server load function (`+page.server.ts`) so the
 * version is server-rendered into the initial HTML — no client fetch, no
 * load flash. Lives under `$lib/server/` so SvelteKit guarantees it never
 * gets bundled into client code.
 *
 * The `cf` field on RequestInit is a Cloudflare Workers extension that lets
 * workerd cache a good upstream response at the colo for ~10 minutes, capping
 * Steam hits regardless of home page traffic. Errors are not cached, so one
 * refusal doesn't hide the version for the whole window. svelte-check uses DOM
 * fetch types which don't know about `cf`; Node's fetch (Vite dev) silently
 * ignores unknown init fields. Both paths therefore work, only prod gets the
 * colo cache.
 */
export async function fetchGameVersion(): Promise<GameVersionResult> {
  try {
    const upstream = await fetch(STEAM_NEWS_RSS_URL, {
      // Steam's store has refused requests from Cloudflare without a User-Agent,
      // and a Worker's fetch sends none.
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; AncientKingdomsCompendium/1.0; +https://ancient-kingdoms.compendiums.org)",
      },
      // Five seconds limits a stalled Steam request without holding the Worker's home-page response.
      signal: AbortSignal.timeout(5_000),
      // @ts-expect-error - `cf` is a Cloudflare Workers extension to RequestInit;
      // DOM fetch (svelte-check tsconfig) does not know about it, but Node's fetch
      // (Vite dev) silently ignores unknown init fields.
      cf: {
        cacheEverything: true,
        cacheTtlByStatus: { "200-299": 600, "300-599": 0 },
      },
    });
    if (!upstream.ok) {
      console.warn(`Steam news feed answered ${upstream.status}`);
      return { ok: false };
    }
    const result = parseGameVersionRss(await upstream.text());
    if (!result.ok) console.warn("Steam news feed held no version title");
    return result;
  } catch (error) {
    console.warn("Steam news feed request failed", error);
    return { ok: false };
  }
}

/// <reference types="@cloudflare/workers-types" />

import {
  parseGameVersion,
  type GameVersionResult,
  type SteamNewsItem,
} from "../src/lib/steam-news-parser.ts";

const STEAM_NEWS_URL =
  "https://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?appid=2241380&count=10&format=json";

export interface Env {
  ASSETS: Fetcher;
}

interface SteamNewsResponse {
  appnews?: { newsitems?: SteamNewsItem[] };
}

async function handleGameVersion(): Promise<Response> {
  let result: GameVersionResult;
  try {
    const upstream = await fetch(STEAM_NEWS_URL, {
      // Cache the upstream response at the Cloudflare edge for 10 minutes,
      // independent of any cache-control header Steam sends. This ensures
      // we hit Steam at most ~once per region per 10 minutes regardless of
      // visitor traffic.
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

  return new Response(JSON.stringify(result), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      // On success, hold for 10 min at edge / 2 min in browser.
      // On failure, hold briefly so a Steam outage does not pin a stale
      // "no data" answer for visitors.
      "cache-control": result.ok
        ? "public, s-maxage=600, max-age=120"
        : "public, s-maxage=60, max-age=30",
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/game-version" && request.method === "GET") {
      return handleGameVersion();
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

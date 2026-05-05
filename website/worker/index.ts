/// <reference types="@cloudflare/workers-types" />

import { buildGameVersionResponse } from "../src/lib/game-version-route.ts";

export interface Env {
  ASSETS: Fetcher;
}

async function handleGameVersion(): Promise<Response> {
  const r = await buildGameVersionResponse();
  return new Response(r.body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": r.cacheControl,
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

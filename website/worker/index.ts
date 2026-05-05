/// <reference types="@cloudflare/workers-types" />

/**
 * Bindings declared in wrangler.toml.
 * - ASSETS: the static asset namespace bound from ./build (see [assets] block).
 */
export interface Env {
  ASSETS: Fetcher;
}

/**
 * Default routing: any request that doesn't match a static asset arrives
 * here. We delegate everything to the asset binding, preserving today's
 * 404 behavior for non-asset paths. Specific API routes will be added in
 * later tasks.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

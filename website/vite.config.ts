import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";
import { buildGameVersionResponse } from "./src/lib/game-version-route.ts";

/**
 * Mirrors the production Cloudflare Worker route at /api/game-version inside
 * Vite's dev server so `pnpm dev` is a single-process workflow. The route
 * shaping is shared with worker/index.ts via lib/game-version-route.ts so
 * dev and prod stay in lockstep.
 */
function gameVersionDevPlugin(): Plugin {
  return {
    name: "ak-compendium:dev-game-version",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.method !== "GET" || !req.url) return next();
        const path = req.url.split("?")[0];
        if (path !== "/api/game-version") return next();
        try {
          const r = await buildGameVersionResponse();
          res.setHeader("content-type", "application/json; charset=utf-8");
          res.setHeader("cache-control", r.cacheControl);
          res.end(r.body);
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ ok: false }));
          // Surface in the dev console so a broken upstream is debuggable.
          // Production failures are already swallowed inside buildGameVersionResponse.
          console.error("[dev-game-version] unexpected error:", err);
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [tailwindcss(), sveltekit(), gameVersionDevPlugin()],
});

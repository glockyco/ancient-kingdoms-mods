import adapter from "@sveltejs/adapter-cloudflare";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    // Cloudflare adapter writes a Worker entry plus prerendered/static assets
    // into .svelte-kit/cloudflare. The Worker only runs for routes that opt
    // out of prerendering (currently just the home page); every other route
    // is prerendered at build time and served as a static asset, so it does
    // not consume Worker invocations.
    adapter: adapter({}),
    inlineStyleThreshold: 100000,
    prerender: {
      handleHttpError: ({ path }) => {
        // During prerendering, ignore 404s for routes that don't exist yet
        // Item pages link to monsters/npcs/quests that aren't implemented
        if (
          path.startsWith("/monsters/") ||
          path.startsWith("/npcs/") ||
          path.startsWith("/quests/")
        ) {
          return; // Ignore these 404s, allow build to succeed
        }

        // All other 404s should fail the build (catches broken links)
        throw new Error(`404: ${path}`);
      },
    },
  },
};

export default config;

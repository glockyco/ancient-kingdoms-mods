import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter({
      pages: "build",
      assets: "build",
      // No fallback - all routes are prerendered, 404s return proper HTTP status
      precompress: false,
    }),
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

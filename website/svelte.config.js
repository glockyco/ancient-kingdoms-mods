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
    prerender: {
      // A list that fits on one page has no numbered pages to prerender. The
      // list and its numbered pages count pages with one helper, so no page
      // links to a numbered route that this lets through.
      handleUnseenRoutes: ({ routes, message }) => {
        if (
          !routes.every((route) => /^\/[a-z-]+\/page\/\[page\]$/.test(route))
        ) {
          throw new Error(message);
        }
      },
    },
  },
};

export default config;

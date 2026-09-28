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
      // A 404 during prerendering is a broken internal link.
      handleHttpError: ({ path }) => {
        throw new Error(`404: ${path}`);
      },
    },
  },
};

export default config;

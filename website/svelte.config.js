import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import adapter from "@sveltejs/adapter-cloudflare";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

// SvelteKit writes the version into a chunk that every page preloads. Its
// default, the build time, renamed that chunk on every build and so rewrote
// every prerendered page, which each deploy then uploaded again. A hash of
// what the client code and the service worker's tile cache are built from
// changes only when they do.
const VERSION_INPUTS = [
  "src",
  "static/tiles",
  "svelte.config.js",
  "vite.config.ts",
  "package.json",
  "../pnpm-lock.yaml",
];

function files(path) {
  try {
    return readdirSync(path, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))
      .flatMap((entry) =>
        entry.isDirectory()
          ? files(join(path, entry.name))
          : [join(path, entry.name)],
      );
  } catch (error) {
    if (error.code === "ENOTDIR") return [path];
    // The tiles are generated, so a checkout without them hashes the rest.
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

function inputsVersion() {
  const root = import.meta.dirname;
  const hash = createHash("sha256");
  for (const input of VERSION_INPUTS) {
    for (const file of files(join(root, input))) {
      hash.update(relative(root, file)).update("\0");
      hash.update(readFileSync(file)).update("\0");
    }
  }
  return hash.digest("hex").slice(0, 16);
}

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
    version: { name: inputsVersion() },
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

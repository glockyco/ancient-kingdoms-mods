import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  test: {
    // Co-located *.test.ts under src/. The SvelteKit Vite plugin (above)
    // registers `$lib` and other kit aliases, so tests can import any
    // module the app imports without extra resolver setup.
    include: ["src/**/*.test.ts"],
  },
});

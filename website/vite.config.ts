import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    fs: {
      allow: [resolve(import.meta.dirname, "data")],
    },
  },
  test: {
    include: ["*.test.ts", "src/**/*.test.ts", "scripts/**/*.test.mjs"],
  },
});

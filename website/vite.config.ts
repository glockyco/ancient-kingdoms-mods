import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    // "localhost" binds [::1] on macOS, where it coexists with another server on
    // 127.0.0.1 and the port fallback never triggers. Bind IPv4 explicitly.
    host: "127.0.0.1",
    fs: {
      allow: [resolve(import.meta.dirname, "data")],
    },
  },
  test: {
    include: ["*.test.ts", "src/**/*.test.ts", "scripts/**/*.test.mjs"],
  },
});

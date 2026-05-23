import type { KnipConfig } from "knip";

const config: KnipConfig = {
  // Only report on unused files and dependency issues.
  // Export/type analysis (exports, types, nsTypes, enumMembers) is deferred:
  // Svelte component prop types imported via `import type` are not always traced by
  // knip, producing too many false positives for a reliable CI gate.
  // Run `pnpm knip --include exports,types` for a full (manual-review) analysis.
  exclude: ["exports", "types", "nsTypes", "enumMembers"],

  workspaces: {
    // Root workspace: shell/Python scripts only
    ".": {
      entry: ["scripts/*.sh", "scripts/*.py"],
      project: ["scripts/**"],
      // uv is a Python package manager invoked from package.json scripts; not a Node binary
      ignoreBinaries: ["uv"],
    },
    // Website workspace: SvelteKit + Vite project
    website: {
      // Disable the Vite plugin: it tries to load vite.config.ts which imports
      // @sveltejs/kit/vite — only resolvable after `pnpm install`. Running knip
      // before install (e.g. in a fresh worktree) otherwise prints a noisy load error.
      vite: false,
      entry: [
        "src/routes/**/+{page,layout,error,server}.{ts,svelte}",
        "src/routes/**/+{page,layout,error}.server.ts",
        "src/app.{ts,html,css,d.ts}",
        // scripts/ includes snapshot-mechanics.mjs (mechanics regression-test tool,
        // documented in CLAUDE.md; invoked via `node scripts/...`, not a package.json script)
        "scripts/*.{mjs,ts}",
        "wrangler.toml",
        "wrangler.redirect.toml",
        // Note: vite.config.ts, svelte.config.js, src/service-worker.ts are handled
        // automatically by knip's SvelteKit plugin; listing them here is redundant.
      ],
      project: ["src/**/*.{ts,svelte}", "scripts/**/*.{mjs,ts}"],
      // Component library barrel re-exports (bits-ui/shadcn-style index.ts files):
      // Knip can't trace Svelte component imports through them, producing false positives.
      // Actual unused components still surface as unused files.
      ignore: [
        "src/lib/components/ui/**",
        "src/lib/components/map/sidebar/index.ts",
        "src/lib/components/monster-table/index.ts",
      ],
      // @types/sql.js: required by src/sql.js-fts5.d.ts type bridge (import from "sql.js")
      // postcss: optional peer dep for eslint-plugin-svelte via postcss-load-config
      ignoreDependencies: ["@types/sql.js", "postcss"],
    },
  },
};

export default config;

# Website

SvelteKit static site for browsing Ancient Kingdoms game data.

## Task Triggers

When working on the map component, see src/lib/map/CLAUDE.md.

## Overview

- **Stack**: SvelteKit 2 + Svelte 5 + TypeScript + Tailwind 4
- **Database**: Client-side SQLite via sql.js-fts5 (full DB downloaded to browser)
- **Map**: deck.gl with OrthographicView for WebGL rendering
- **UI**: bits-ui components (shadcn-svelte compatible)
- **Deploy**: Cloudflare Static Assets via wrangler

## Commands

```bash
cd website
pnpm dev        # Dev server with HMR
pnpm check      # TypeScript + Svelte validation
pnpm lint       # ESLint
pnpm build      # Production build
pnpm cf-deploy  # Build + deploy to Cloudflare
```

Pre-commit hooks auto-run: ESLint --fix, Prettier --write, pnpm check.

## Structure

```
src/
├── routes/               # Pages (items, monsters, npcs, quests, skills, zones, map, etc.)
├── lib/
│   ├── components/       # Svelte components
│   │   ├── ui/          # bits-ui base components
│   │   └── map/         # Map UI components
│   ├── map/             # deck.gl map utilities (has own CLAUDE.md)
│   ├── queries/         # SQL query functions
│   ├── types/           # TypeScript types
│   ├── db.ts            # SQLite wrapper (sql.js-fts5)
│   └── config.ts        # Configuration constants
static/
├── compendium.db        # SQLite database
├── tiles/               # Map tiles
└── icons/               # Game icons
```

## Key Patterns

**Static Site Generation:**

- Uses `@sveltejs/adapter-static`
- `export const prerender = true` in `+layout.ts`
- All routes must be prerenderable (no dynamic SSR)

**Client-Side SQLite:**

- sql.js-fts5 (full DB download, FTS5 search support)
- Queries in `lib/queries/` return typed results
- Use `query<T>()`, `queryOne<T>()`, `queryScalar<T>()` from `lib/db.ts`

**Svelte 5 Runes:**

- Use `$state`, `$derived`, `$effect` (not legacy reactive statements)
- Keep components small and focused
- Prefer composition over inheritance

**TypeScript Strict Mode:**

- Type assertions only at I/O boundaries (DB queries, JSON.parse)
- Never use assertions in components or business logic
- Define shared types in `lib/types/`

## No-JS Support

Site provides functional experience without JavaScript.

- Detail pages render ALL rows in pre-rendered HTML
- Overview pages render paginated subset (to avoid bloat)
- `<noscript>` CSS hides `.loading-overlay` and `.js-only` elements
- DataTable uses `isHydrated` state to show all rows before JS initializes

## Hardcoded Game Values

Some game mechanics cannot be derived from the database and are hardcoded directly in the website. These must be manually verified on each game update by diffing the server scripts.

**Every hardcoded value must have a source comment** in this format:

```ts
// Source: server-scripts/FileName.cs:lineNumber — brief description
```

```svelte
<!-- Source: server-scripts/FileName.cs:lineNumber — brief description -->
```

## Gotchas

**Map prerendering:** Map data is prerendered at build time via `+page.server.ts`. deck.gl initializes client-side with `browser` guards.

**Database loading:** DB is downloaded fully on first client query (~15MB). Use `preloadDb()` on map page mount.

**Build validation:** Always run `pnpm check && pnpm lint && pnpm build` before committing.

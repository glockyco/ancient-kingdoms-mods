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

In fresh git worktrees, load the root `bootstrap-worktree` skill before these
commands. Website validation assumes the bootstrap script has installed
dependencies and produced generated website artifacts.

Pre-commit hooks auto-run: ESLint --fix, Prettier --write, pnpm check.

## Mechanics Snapshots

Regression tests for the mechanics card rendered on each skill page.
Snapshots live in `test-fixtures/mechanics-snapshots/<skill_id>.txt` and are committed to the repo.

```bash
# Check: compare built pages against committed snapshots (exit 1 on any diff)
pnpm build && node scripts/snapshot-mechanics.mjs

# Update: accept current output as the new baseline
pnpm build && node scripts/snapshot-mechanics.mjs --update
```

Run `--update` after any intentional mechanics card change and commit the updated snapshots in the same commit.
Run without `--update` (check mode) to catch unintended regressions before shipping.

## Structure

```
src/
├── routes/               # Pages (/, /items, /recipes, /altars, /quests, /skills, /mercenaries, /classes, /summons, /monsters, /map, /zones, /npcs, /gather-items, /chests, /mechanics, /mechanics/inventory, /mechanics/experience, /mechanics/mercenary-stats, /mechanics/monster-spawns, /mechanics/combat, /professions, /tools/combat-simulator, /sitemap.xml, and nested detail routes)
├── lib/
│   ├── components/       # Svelte components
│   │   ├── ui/          # bits-ui base components
│   │   └── map/         # Map UI components
│   ├── map/             # deck.gl map utilities (has own CLAUDE.md)
│   ├── queries/         # SQL query functions
│   ├── types/           # TypeScript types
│   ├── db.ts            # SQLite wrapper (sql.js-fts5)
│   ├── map/config.ts     # Map configuration constants
│   ├── constants/constants.ts # Shared constants
static/
├── compendium.db        # SQLite database — gitignored, populate with build pipeline
├── tiles/               # Map tiles
└── icons/               # Game icons
```

## Key Patterns

**Static Site Generation:**

- Uses `@sveltejs/adapter-cloudflare`
- `export const prerender = true` in `+layout.ts`
- All routes except the home page are prerendered. `src/routes/+page.server.ts` sets `prerender = false` so the home page uses dynamic SSR for the live game version.

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

These citations are machine-checked. `pnpm check:citations` from the repository
root (also a pre-commit job, skipped when `server-scripts/` is absent) hashes
every cited region and compares it to `citations.lock.json`. After a game update,
run:

```bash
cd build-pipeline
uv run compendium citations check                      # what drifted
uv run compendium citations fix                        # relocate code that only moved
uv run compendium citations suggest                    # propose fixes for the rest
uv run compendium citations sync --game-version <ver>  # re-anchor
```

A `changed` citation means the cited code was rewritten, so verify the claim
itself is still true before re-anchoring.

**A green check is not proof the claim is correct.** The checker hashes the bytes
in the cited region; it cannot tell that a line range has slid onto a different
member as the file grew, nor that the value was transcribed wrong to begin with.
Every profession success formula once cited a range that had drifted onto a
neighbouring function, and all of them verified green while two were wrong. Use
symbol form for anything that pins a single member.

Grammar rules worth knowing:

- Everything after a spaced em dash is prose and is not parsed for references,
  so put every file and line number before the dash.
- Cite several files as `Foo.cs:10-20, Bar.cs:30`. Never write `Foo.cs/Bar.cs`;
  that parses as one nested path.
- A bare range attaches to the nearest preceding filename: `Foo.cs:10-20, 40-50`.
- Prefer `File.cs:symbolName` over a line number when the claim is about a single
  named member. A symbol reference never rots.
- Do not pin an archived snapshot directory (`server-scripts-0.9.25.1/...`); the
  lockfile records the game version centrally.

## Gotchas

**Map prerendering:** Map data is prerendered at build time via `+page.server.ts`. deck.gl initializes client-side with `browser` guards.

**Database loading:** DB is downloaded fully on first client query (~15MB). Use `preloadDb()` on map page mount.

**Database path:** `static/compendium.db` is gitignored. For direct SQL queries (debugging, data exploration), use the absolute path: `website/static/compendium.db` (relative to repo root).

**Build validation:** Always run `pnpm check && pnpm lint && pnpm build` before committing.

## Game Mechanics — Common Mistakes

**Never use semicolons in user-facing prose.** Split the thought into separate sentences or use a conjunction. This applies to every visible description, note, label, tooltip, and mechanics explanation.

**Damage types and resist stats are 1-to-1.** There is no fallback or catch-all. Each damage type has its own dedicated resist stat:

| Damage type             | Resist stat    |
| ----------------------- | -------------- |
| Magic                   | Magic Resist   |
| Fire                    | Fire Resist    |
| Cold                    | Cold Resist    |
| Disease                 | Disease Resist |
| Poison                  | Poison Resist  |
| Physical (melee debuff) | Defense        |

Never write 'magicResist (magic/fire/cold/disease default)' or anything implying Magic Resist is a fallback for other damage types. Each has its own stat, verified in `server-scripts/Combat.cs:480-487` and `server-scripts/Combat.cs:1245-1274`.

**Source code references must not appear in visible page content.** Internal flag names (`is_melee_debuff`, `prob_ignore_cleanse`, `buff_category`, etc.), file names (`skillMechanics.ts`, `Skills.cs`), and code identifiers belong only in invisible HTML comments (`<!-- Source: ... -->`) or TypeScript source files. Describe behavior in plain English for page visitors.

## Why

The site has no search outside the map. The home page shows a search field only in development, and most visitors reach a detail page without a way to jump to another entity, rule, or list.

The current ranking also misses common queries. On 106 judged queries it returns a correct top result for 59. Measured causes: each tier returns early, so "sword" finds "Sword Strike" but not "Iron Sword"; reordered words, plurals, and abbreviations find nothing (16 queries return no result); and mechanics pages, sub-zones such as Milldenn, and role or slot lists are not in the index.

## What Changes

- Add a site-wide search palette. Cmd-K or Ctrl-K opens it on every page, and the home page search field opens the same palette.
- Replace the SQLite full-text ranking with an in-memory search index that the build serializes. The map search uses the same ranking path and keeps its geometry lookup in `compendium.db`.
- Add documents to the index: mechanics and overview pages, tools, filtered list pages (NPC roles, item slots and types, monster classifications), and sub-zone names as aliases of their parent zone.
- Add a reviewed synonym list for game abbreviations such as `xp`, `hp`, and `merc`.
- Rank typo matches below exact and prefix matches. A query that is a full name with two adjacent letters swapped returns that name first.
- Show one flat list in relevance order. Each row shows the result type.
- Add a judged query set with a held-out part as a regression test.
- **BREAKING** (build artifact only): remove `search.db`, its gzip copy, and the 14 legacy full-text tables and triggers in `compendium.db`. No page reads these tables.

## Capabilities

### New Capabilities

- `global-search`: the site-wide search palette, the documents it can return, its ranking contract, result presentation, keyboard access, and the judged relevance check.

### Modified Capabilities

None. The existing search requirements in `game-guide-coverage` (article titles are results), `notable-npc-classification` (a `notable` query returns Notable NPCs with their classification), and `compendium-redaction` (a redacted entity has no search entry) keep their text. The `global-search` spec and the tasks verify them.

## Impact

- Website: `src/lib/search/`, `src/lib/server/search/documents.ts`, `scripts/build-search-db.ts` (renamed for the new artifact), `scripts/compress-databases.mjs`, `src/lib/database-assets.ts`, `src/lib/db.worker.ts`, `src/lib/queries/map-search.ts`, `src/lib/components/map/MapSearch.svelte`, `src/lib/components/HomeSearch.svelte`, `src/routes/+layout.svelte`, `src/routes/+page.svelte`.
- Pipeline: `schema.sql` legacy FTS tables and triggers, the optimize list in `commands/build.py`, and three tests that query legacy FTS tables.
- Dependency: `minisearch` (no runtime dependencies; 5.9 KB minified and gzipped).
- Transfer: the search artifact changes from `search.db` (1.09 MB gzip) plus the SQLite WASM (0.46 MB gzip) to one serialized index (about 0.39 MB gzip). Pages other than the map no longer load the WASM to search.
- Plan: `docs/plans/2026-08-09-map-marker-and-search-registry.md` describes the SQLite tiers as the search design. This change updates that section.

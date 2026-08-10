---
title: "Global Entity Search"
type: spec
status: draft
created: 2026-07-31
parent: 2026-07-31-ancient-kingdoms-overview
superseded_by: 2026-08-09-map-marker-and-search-registry
archived:
---

# Global Entity Search

One Cmd/Ctrl+K palette, available on every page, that finds any of the 3,579 entities by
full-text search and navigates to its detail page.

## Current state

There is no `searchAllEntities` anywhere in the website. `routes/+layout.svelte` contains
only theme setup, service-worker registration, the loading overlay and JSON-LD — no nav
bar, no palette. A Cmd/K handler exists at `routes/map/+page.svelte:653-657`, but it opens
`lib/components/map/MapSearch.svelte`, which calls `searchMapEntities`
(`lib/queries/map-search.ts`) and resolves results to map positions, never to detail pages.

The `bits-ui` command primitives at `lib/components/ui/command/` — including `CommandDialog`
and `CommandLinkItem` — are used today only by `MapSearch.svelte`,
`map/sidebar/ZoneFocusSelect.svelte` and `data-table/data-table-faceted-filter.svelte`.

Entity counts, so search coverage is checkable: items 1,658, skills 689, monsters 361, npcs
229, quests 172, chests 133, portals 118, traps 101, gathering_resources 49, zones 26,
crafting_stations 15, houses 9, altars 7, alchemy_tables 7, scribing_tables 5 — **3,579
total**.

### Measured sizing

From `dbstat` and `LENGTH()` sums over `website/static/compendium.db`:

| Quantity | Size |
| --- | --- |
| `name` + `keywords` text across all 15 entity types | 76.2 KiB |
| `items.tooltip` | 573.9 KiB |
| `quests.tooltip` | 133.6 KiB |
| All 14 existing `*_fts` shadow tables | 1,396 KiB |
| Full `compendium.db`, fetched by `lib/db.ts` | 16.1 MiB |
| `sql.js-fts5` WASM runtime, required for any client-side SQLite | 1.2 MB |

The existing FTS5 tables are tuned for content search rather than name lookup. `items_fts`
and `quests_fts` index `name` + `tooltip`, which is why `items_fts_data` alone accounts for
832 KiB of that 1,396 KiB. Eleven others index `name` + `keywords`, and `portals_fts`
indexes `keywords` only, because portals have no useful name. All use `prefix='2,3'`.

## Design

**The palette does real full-text search over indexed content, not name matching.** Name
matching alone is cheaper but worse UX, and the tooltip indexes that make content search
possible already exist.

The delivery shape is not settled, because it turns on measurements nobody has taken. That
is task 1, a bounded spike whose recorded outcome the remaining tasks build on.

Whichever shape wins, any build-time artifact is produced by a script in
`website/scripts/`, wired into the `prebuild` chain in `website/package.json` beside
`generate-og-image.mjs`, `generate-home-counts.mjs` and `build-sitemap-manifest.mjs`, and
reads the database with `import Database from "better-sqlite3"` exactly as
`scripts/generate-home-counts.mjs` does. That script's header states the standing
constraint: Cloudflare Workers cannot use better-sqlite3, so anything the client needs must
be produced at build time.

The 14 existing `*_fts` tables (`items`, `monsters`, `npcs`, `quests`, `zones`,
`gathering_resources`, `chests`, `traps`, `houses`, `altars`, `portals`,
`crafting_stations`, `alchemy_tables`, `scribing_tables`) keep serving the map's own search
unchanged. Skills have no map position, so `MapSearch.svelte` keeps excluding them — only
the global palette searches skills.

## Acceptance

- Cmd/Ctrl+K opens the palette on every route, results are grouped by entity type, and
  selecting one navigates to `/{type}/{id}`.
- Matches come from indexed content, not name prefixes alone.
- All 15 entity types, skills included, are reachable through the palette.
- An empty query renders nothing, and a query matching nothing renders `CommandEmpty`.

## Tasks

- [ ] **1. Spike: choose the delivery shape.** Record the measurements and the resulting
  decision in `docs/plans/2026-07-31-search-delivery-spike.md` (`type: audit`,
  `status: draft`, `parent: 2026-07-31-global-entity-search`) — spike findings belong in an
  audit, not in this spec. Prototype each candidate and measure, on a cold cache over
  throttled Fast 3G **and** on desktop broadband, the time from opening the search UI to the
  first ranked result:

  - **(i) Search-only SQLite** — a build-time database carrying only the FTS5 content-search
    needs, queried with `sql.js-fts5`. Budget from current data: ~1.4 MiB database plus the
    1.2 MB WASM runtime.
  - **(ii) Reuse `compendium.db`** — query the existing `*_fts` tables through the existing
    `lib/db.ts` loader. No new build artifact, but 16.1 MiB plus 1.2 MB WASM on a cold cache.
  - **(iii) Progressive** — ship a small static name/keyword index (~70 KiB gzipped, from the
    76.2 KiB of name + keyword text) that answers keystrokes instantly with no WASM, and load
    an FTS5 database in the background so content matches join the same result list once
    ready.

  **Decision rule, applied in this order.** The chosen shape MUST return full-text content
  matches. A name-only outcome is not acceptable and ends the spike as a failure to be
  reported, not a shipped compromise. Among shapes that qualify, take the lowest Fast 3G
  time-to-first-result, breaking ties toward fewer moving parts. Reject (ii) if its cold Fast
  3G time-to-first-result exceeds 10 s, which its ~17.3 MB total makes likely. Record
  measured numbers for rejected candidates too, so the choice is re-checkable as the database
  grows.

  The audit MUST record three outputs, not just timings, because tasks 3 and 4 branch on
  them:

  1. Measured cold time-to-first-result per candidate, on both network profiles.
  2. **Whether `skills_fts` is needed in `build-pipeline/schema.sql`.** This reads straight
     off the chosen shape: (ii) needs it, since it queries the main schema's FTS tables. (i)
     does not, because its generator reads `skills.name` and `skills.keywords` and writes
     them into the search database's own index, leaving the main schema untouched. (iii)
     inherits whichever of (i) or (ii) its background FTS half uses, so (iii) must declare
     which.
  3. **Index layout: one unified FTS5 table with a `type` column, or one per entity type.**
     Either is viable. bm25 scores are only comparable within a single index, so a unified
     table is what a single globally ranked result list would need, but the acceptance
     criteria call for results grouped by entity type and per-type grouping needs only
     per-type ranking. Pick unified if building a fresh search database (fewer queries, one
     code path), pick per-entity if reusing the main schema, since those tables already
     exist.

- [ ] **2. Give skills searchable text beyond their name.** The `skills` table has exactly
  one text column, `name` — no `keywords`, no `description`, no `tooltip` — so this is a
  schema addition, not merely a denormalizer one. Add a `keywords` column to `skills` in
  `build-pipeline/schema.sql`, then add `_generate_skill_keywords` to
  `build-pipeline/src/compendium/denormalizers/search/keywords.py`, mirroring the existing
  `_generate_monster_keywords`, `_generate_npc_keywords` and `_generate_resource_keywords`.
  Required under every delivery shape: without it, skills would match on exact name alone
  while every other type matches keywords.

- [ ] **3. Make skills reachable by full-text search.** Which edit this is depends on task
  1's recorded outcome. Both branches are fully specified, so no judgement is needed.

  **If the chosen shape queries the main schema (candidate (ii), or (iii) declaring (ii)):**
  add `skills_fts` in `build-pipeline/schema.sql` by copying the `monsters_fts` block
  verbatim and substituting `skills` for `monsters`:

  - The virtual table at lines 1558-1564: `name`, `keywords`, `content=monsters`,
    `content_rowid=rowid`, `prefix='2,3'`. Copy this, **not** `items_fts` (line 1550), which
    indexes `tooltip` and is the wrong shape for skills.
  - Its three external-content sync triggers, `monsters_ai` / `monsters_ad` / `monsters_au`,
    at lines 1597-1610. Triggers are named `<table>_ai` / `_ad` / `_au`, so grepping for
    `_fts` does not find them. The delete and update triggers use the
    `INSERT INTO <t>_fts(<t>_fts, rowid, ...) VALUES ('delete', ...)` form. Reproduce it
    exactly or the index desyncs on rebuild.
  - Append `"skills_fts"` to the `fts_tables` list at
    `build-pipeline/src/compendium/commands/build.py:116-130` so it is optimized with the
    rest.

  **If the chosen shape builds its own search index (candidate (i), or (iii) declaring
  (i)):** add nothing to `build-pipeline/schema.sql`. The generator selects `id, name,
  keywords` from `skills` alongside the other entity types and writes them into the search
  database's index, and `build.py`'s `fts_tables` list is untouched.

  Either way this depends on task 2 for the `keywords` column that carries skills'
  searchable text.

- [ ] **4. `searchAllEntities(query)` in `website/src/lib/queries/`**, returning typed
  results grouped by entity type, each carrying its detail-page URL. Entity type maps to the
  route segment (`items`, `monsters`, `npcs`, and so on), so a result URL is `/{type}/{id}`
  with no lookup table.

  Read `lib/queries/map-search.ts` first for the per-table query idiom, but do not copy its
  structure wholesale: across 1,148 lines it issues one separate query per `*_fts` table,
  each with its own `ORDER BY rank`, and never merges them into a single ranking. That suits
  a map sidebar with fixed categories, but for the palette it would mean a dozen-plus
  near-duplicate query blocks. If task 1 chose a unified index, this is one query. If it
  chose per-entity tables, generate the per-table queries from a table of
  `{ table, type, nameColumn, extraColumn }` rather than hand-writing each block.

  Three entity types have irregular FTS shapes to handle: `items_fts` and `quests_fts` index
  `name` + `tooltip` rather than `keywords`, and `portals_fts` indexes `keywords` only with
  no name column at all.

- [ ] **5. A Cmd/Ctrl+K `CommandDialog` in `routes/+layout.svelte`** wired to it, using
  `CommandLinkItem` so results navigate to detail pages, grouped by entity type. Edge cases
  to handle: an empty query renders nothing rather than all 3,579 entities, a query matching
  nothing renders `CommandEmpty`, and if the chosen shape loads an index or database
  asynchronously the dialog opens immediately in a loading state rather than blocking on the
  fetch.

Task ordering: 1 gates 4 and 5, since they build on the chosen shape, and 2 gates 3. Tasks 2
and 3 touch only the build pipeline, so they can proceed in parallel with the spike.

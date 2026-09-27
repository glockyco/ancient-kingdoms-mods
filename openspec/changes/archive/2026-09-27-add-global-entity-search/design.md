## Context

See proposal.md for the motivation and `specs/global-search/spec.md` for the behaviour.

Current state:

- `scripts/build-search-db.ts` writes `data/search.db` (4,009 documents, SQLite FTS5 with `unicode61`, 1.09 MB gzip) from `buildSearchDocuments()` in `src/lib/server/search/documents.ts`.
- `searchEntities()` in `src/lib/search/search.ts` runs exact, prefix, FTS, and fuzzy tiers in the database worker. Each tier returns early when it finds rows.
- The browser SQLite build is `sql.js-fts5@1.4.0`, SQLite 3.33.0. It has no `trigram` tokenizer and no `spellfix1`.
- `searchMapEntities()` calls `searchEntities()` and then reads geometry from `compendium.db`.
- The map page binds Cmd-K to `MapSearch`. The layout has no palette. `HomeSearch.svelte` is a visual stub shown only in development.
- `compendium.db` still contains 14 legacy FTS tables and their triggers. No website code reads them. Three pipeline tests query them.

### Evidence

A spike compared the current search with candidate configurations. Destinations were compared as exact hrefs, including anchors. The current search was run through the real `searchEntities()` on the SQLite 3.33.0 WASM build.

| Configuration | Tuning set (106) | Development set (150) | Development MRR@10 |
|---|---|---|---|
| Current `searchEntities()` | 59 | 123 | 0.806 |
| MiniSearch, current documents | 81 | 129 | 0.852 |
| MiniSearch, added documents | 91 | 141 | 0.919 |

- The tuning set has 106 hand-written queries in 14 intent groups.
- The development set has 150 queries. It was written as a held-out set. 108 of them are the exact name, a prefix, and a one-swap typo of 36 randomly sampled entities, so they are 36 entities with three variants each, not 108 independent cases. The other 42 are hand-written concept, page, list, role, sub-zone, and synonym queries. No query string occurs in both sets.
- The set was then used to compare four typo policies, so it is development evidence, not a validation set. Only the fresh held-out set from task 6.1 gates the held-out requirement.
- Most of the development-set gain comes from the added documents (129 → 141). The engine change alone mainly fixes words inside a name, word order, plurals, and empty results.
- All 64 guide article titles return their own article within the first three results in every candidate configuration.
- Query latency in Bun: median 0.3 ms, 95th percentile 1.2 ms. This is not a browser measurement.

### Release measurements

Measured on the production build (`vite preview`) in headless Chromium on 2026-09-27, with an empty cache and the service worker bypassed. The query set is 30 queries for the local run and 20 for the throttled run. Query latency is the time from input to the last update of the rendered list, minus the palette's 100 ms debounce, so it includes worker messaging and Svelte rendering.

| Measurement | Local | Slow 4G (150 ms, 1.6 Mbps) and 4x CPU |
|---|---|---|
| Palette open to first result, cold cache | 137 ms | 2,252 ms |
| Long tasks on the main thread during the first search | none | none |
| Query latency, median | 3.5 ms | 10.7 ms |
| Query latency, 95th percentile | 6.0 ms | 17.7 ms |

The index asset `search-index.json.<hash>.gz` is 383,480 bytes, from the build output. The worker fetches it, so the page's network log does not show it. An item page loads neither the SQLite WASM nor `compendium.db` to search.

Final judged results: 97 of 107 tuning cases, 142 of 150 development cases, and 127 of 131 held-out cases pass. All four held-out failures are short prefixes that match several names ("Guard", "Emerald").

## Goals / Non-Goals

**Goals:**

- One ranking path for the palette and the map search.
- A relevance regression check that can fail a pull request.
- Search on non-map pages without the SQLite WASM.

**Non-Goals:**

- One result for each mechanics section. Guide articles already cover the rules that players name. A typed section registry can follow in a separate change.
- A search results page. The palette is the only result surface.
- Query logging or analytics.

## Decisions

### D1. MiniSearch replaces the SQLite full-text path

The build serializes one MiniSearch index to a static JSON asset. The client loads it on the first palette open or the first map search. The index replaces `search.db`, so the site still has one search index.

Alternatives considered:

- **Keep SQLite FTS5 and fix the tiers.** SQLite 3.33.0 has no trigram tokenizer or edit-distance module, so typo tolerance stays a scan over all names in JavaScript. The palette would also keep the 0.46 MB WASM on every page.
- **Custom ranker.** A spike implementation was slow (up to 600 ms per query in Python) and rebuilt what the library provides.
- **Orama, FlexSearch, Fuse.js.** Fuse.js has no inverted index and scores whole strings. MiniSearch covers field boosts, last-word prefix, per-word edit limits, document boosts, and serialization, with no runtime dependencies at 5.9 KB gzip. The other two were not measured. MiniSearch is the smallest candidate that meets the ranking contract.

### D2. Load and query the index in a dedicated worker

A search worker loads the index and runs every query. The client posts the query and receives the ranked documents.

On an unthrottled local preview, loading the index on the main thread caused no long task. With a 4x slower CPU and a slow 4G network, it caused one 134 ms long task during the first search, which froze typing in the palette. The existing database worker is not used, because its bundle carries the sql.js loader, and a page other than the map should not load SQLite code to search.

### D3. Ranking settings

These settings implement the spec's ranking rules:

- Field boosts: name 6, aliases 4, keywords 2, body 0.4. Aliases hold other names of the same thing: a zone's area names, a list's alternative words, and a page's subtitle.
- Prefix matching on the last query word only.
- Edits: 1 for words of 4 to 7 letters, 2 for 8 or more. Edit-match weight 0.15, prefix weight 0.4.
- Match every word first. When that finds nothing, repeat the search with any word.
- Type weights: zones, classes, professions, pages, and filtered lists 1.3; recipes 0.6, because recipes repeat item names. Map placements keep weight 1: the palette filters them out before ranking, and on the map they are the results a visitor looks for. The spike weighted them 0.3, which pushed the Milldenn portals out of the map's 20 results.
- Exact normalized name first.
- A full-name match with one adjacent swap first. MiniSearch counts a swap as two edits. A swap-only rule restores those typos without the noise of two edits on short words: two edits from 5 letters turned "banker" into "Barbers" and "Soul Binders".

The synonym list is a reviewed `Record<string, readonly string[]>` in `src/lib/search/`. Each entry needs a query in the judged set.

### D4. Index documents

`buildSearchDocuments()` stays the single owner of documents. It adds these families:

- `page`: mechanics pages from `MECHANICS_GROUPS`, overview pages from the entity manifest, the map, and the combat simulator.
- `list`: filtered lists. A typed table in `src/lib/search/` holds each reviewed name, target page, table URL key, column, and value. A test fails when a value no longer occurs in the data or the column no longer exists. Names are written by hand, because generated plurals produced "Bracerses".
- Sub-zone names are added to the parent zone's aliases, not indexed as separate results. The zone page is the only destination for a sub-zone.

The palette leaves out chests, traps, portals, and workstations. Their names are internal labels that repeat: 26 traps are named "Trap", and chest names read like "Chest RF Interiors (1)". Houses and treasure locations are also left out, because they have no page of their own. Map search keeps all of these families.

### D5. Filtered-list links use the existing table URL state

A result such as "Bankers" opens `/npcs?npcs.role_keys=is_bank`. `DataTable` reads `{urlKey}.{column}` on mount. A browser check confirmed the filter applies: 6 rows, the Role filter set, and Reset available. A later plain visit to `/npcs` showed no filter, and local storage stayed empty. No change to `DataTable` is needed.

### D6. Palette component

`SearchPalette.svelte` uses the existing `Command` and `Drawer` components with the same desktop and mobile split as `MapSearch`. It shows a flat list; the map search `groupByCategory` display stays map-only. `+layout.svelte` mounts it and binds Cmd-K or Ctrl-K, except on `/map`, where the existing map binding stays. `HomeSearch.svelte` becomes a button that opens the palette.

`HomeSearch` and a compact search button in the breadcrumb row open the palette; the button is the only way in on a device without a keyboard. Both use the layout's existing `js-only` class, which hides them when JavaScript is off, so a page without JavaScript shows no dead control. Every destination stays reachable through links without JavaScript.

Recent searches are stored in `localStorage`, capped at 8 entries.

### D7. Search scopes

`searchEntities()` takes a scope. The palette scope filters out the placement families before ranking, so they cannot take result slots. The map scope searches every family. Both scopes use one index and one ranking.

### D8. Legacy FTS removal

The cutover removes the 14 legacy FTS tables, their triggers, and the optimize list in `commands/build.py`. Index tests take over what the three FTS-based pipeline tests check, including that item comments are not searchable. The pipeline tests keep their keyword-column and comment-preservation assertions.

## Risks / Trade-offs

- [The judged set overfits the settings] → Keep a fresh held-out part (task 6.1). Change settings only with a tuning-set reason, and record the held-out result.
- [Common prefixes rank one family member first ("Nightveil")] → Accept. The judged cases for common prefixes accept any family member within rank 3.
- [The index grows with body text] → The check records the gzip size. Body text is limited to the fields already indexed today.
- [The map search changes order] → Map search keeps its geometry and category contract. A test covers one query per map category.
- [Redacted content reaches the index] → The index reads only `compendium.db`, which the redaction pipeline has already filtered. A test builds the index and asserts that no redacted identifier occurs.

## Migration Plan

1. Build the new index next to `search.db` and switch `searchEntities()` to it.
2. Switch the map search, then add the palette.
3. Remove `search.db`, its compression entry, its asset import, and the worker target in the same commit series.
4. Remove the legacy FTS tables and move the three pipeline tests.
5. Rollback: revert the commit series. No stored user data changes, except the new recent-search key in `localStorage`.

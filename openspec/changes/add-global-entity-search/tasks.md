## 1. Judged query set

- [x] 1.1 Move `evidence/tuning-queries.json` and `evidence/development-queries.json` into a typed fixture under `website/src/lib/search/` as development cases, keeping exact destination hrefs. Verify that no query string occurs in both sets.
- [x] 1.2 Add a relevance test that builds the index from `compendium.db`, runs each case, and reports passes by intent and by sampled entity. It fails when a guide title is outside the first three results, and when the held-out pass count from task 6.1 falls below its recorded number. Verify that it runs against the current `searchEntities()` and reports 59/106 tuning and 123/150 development passes before the engine changes. Done as follows: the baseline was measured by running the old `searchEntities()` on the SQLite 3.33.0 WASM build before the engine changed; the committed test runs the new engine and lists failing cases by intent.

## 2. Index documents

- [x] 2.1 Extend `buildSearchDocuments()` with `page` documents from `MECHANICS_GROUPS`, the entity manifest overview pages, the map, and the combat simulator. Verify with the relevance test cases for "experience" and "combat simulator".
- [x] 2.2 Add the reviewed filtered-list table (name, page, URL key, column, value) for NPC roles, item slots, item types, and monster classifications, and emit one `list` document for each row. Add a test that fails when a value is absent from `compendium.db`. Verify "banker" opens `/npcs?npcs.role_keys=is_bank` in the browser.
- [x] 2.3 Add sub-zone names to their parent zone documents, in an alias field weighted close to the name. Verify with the "Milldenn" and "Thogh Maldur" cases.
- [x] 2.4 Add the reviewed synonym list, with one judged case for each entry. Verify with the "xp", "hp", and "merc" cases.
- [x] 2.5 Add a test that builds the index and asserts that no redacted identifier from the redaction ledger occurs in it.

## 3. Engine

- [x] 3.1 Add `minisearch` to `website/package.json` and replace `scripts/build-search-db.ts` with a build step that writes the serialized index. Verify that `pnpm build` emits one hashed index asset and records its gzip size.
- [x] 3.2 Reimplement `searchEntities()` with the design D3 settings, the exact-name rule, and the swap rule, keeping its `SearchResult` type. Verify with the relevance test and the spec scenarios for "sword", "Depsair", "banker", and "Need, Greed".
- [x] 3.3 Give `searchEntities()` a scope: the palette scope leaves out chests, traps, portals, workstations, houses, and treasure locations, and the map scope keeps them. Switch `searchMapEntities()` to the map scope and keep its geometry queries. Add a test that "Milldenn" returns no placement result in the palette scope and returns the Milldenn portals in the map scope, and one test query for each map category. Verify map search in the browser for a monster, a portal, and a trap.

## 4. Palette

- [x] 4.1 Add `SearchPalette.svelte` with the flat result list, type labels, the Notable label, the live result count, recent searches, and the no-result message. Add a test that every Notable NPC result for "notable" carries the Notable label. Verify keyboard use (Down, Enter, Escape) and the "notable" rows in the browser.
- [x] 4.2 Mount the palette in `+layout.svelte` with Cmd-K and Ctrl-K, leave the `/map` binding to `MapSearch`, and turn `HomeSearch.svelte` into the production entry point, and add a search button to the breadcrumb row so that every page without a keyboard can open the palette. Hide both controls without JavaScript with the existing `js-only` class. Verify on a detail page, the home page, the map page, a mobile viewport, and the home page with JavaScript disabled.

## 5. Cutover and measurement

- [x] 5.1 Remove `search.db`, its compression entry, its import in `database-assets.ts`, and the `search` worker target. Verify that `pnpm build` succeeds and no asset named `search.db` is emitted.
- [x] 5.2 Measure a production build in a browser: index transfer size, cold-cache time from palette open to first result, query latency percentiles, and main-thread long tasks during index load. Record the results in this change. Verify that the 95th percentile query latency is at most 50 ms.
- [x] 5.3 Before removal, add index tests that keep what the three legacy FTS tests check: an item comment word does not return the item; "barber" returns barber NPCs and no bank-only NPC; "notable" returns the Notable NPCs; the map scope returns houses for "housing". Verify that they pass.
- [x] 5.4 Remove the 14 legacy FTS tables, their triggers, and the optimize list in `commands/build.py`. In `test_search_keywords.py` and `test_houses_loader.py`, assert the keyword columns that the index reads. In `test_item_cosmetic_fields.py`, keep the comment preservation assertion and drop only the FTS query that task 5.3 replaced. Verify with those tests and `uv run compendium build`.

## 6. Final validation

- [x] 6.1 Write a fresh held-out part that was not used for any setting decision, record its pass count, and freeze it. Verify that the relevance test passes.
- [x] 6.2 Update the search design section of `docs/plans/2026-08-09-map-marker-and-search-registry.md` and mark the `add-global-entity-search` tasks there. Verify with `scripts/check-agent-docs.sh` and `openspec validate add-global-entity-search --strict`.
- [x] 6.3 Run the website tests, `pnpm check`, `pnpm lint`, and `pnpm build`, and the pipeline tests changed in 5.3.

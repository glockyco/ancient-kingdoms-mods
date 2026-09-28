## 1. Verify shipped marker behavior

- [x] 1.1 Verify partition precedence, tie errors, and null-position exclusion against `marker-registry.ts:919-942`, `layers.ts:85-115`, and `marker-registry.test.ts:219-245`.
- [x] 1.2 Verify marker labels, icons, paint order, visibility metadata, and NPC role facets against `marker-registry.ts:295-308,396-501,893-917`, `layers.ts:52-54,418-513`, `MapSidebarContent.svelte:106-141`, and `golden.test.ts:76-145`.
- [x] 1.3 Verify monster, gathering, and NPC filters against `layers.ts:404-513`, including the spark-only visibility path at `marker-registry.ts:696-717`.

## 2. Verify shipped map search

- [x] 2.1 Verify one worker/index, scoped placement inclusion, kind-and-ID map deduplication, and destination deduplication in the palette against `search.ts:28-73` and `engine.ts:170-221`.
- [x] 2.2 Verify geometry bounds, coordinate conversion, and altar-only fallback against `map-search.ts:114-142,406-499`.
- [x] 2.3 Verify category grouping and selected-result popup and view fitting against `MapSearch.svelte:78-92,123-134` and `+page.svelte:662-687`.

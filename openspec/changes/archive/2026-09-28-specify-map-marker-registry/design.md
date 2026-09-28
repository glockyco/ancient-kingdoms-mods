## Context

`marker-registry.ts:396-853` declares marker partitions and visual metadata. `layers.ts:85-170,418-513` partitions positioned records and builds primary layers. `global-search/spec.md:43-115` already specifies global ranking and placement exclusions. The map-specific reader at `queries/map-search.ts:454-499` adds geometry after ranking.

## Goals / Non-Goals

**Goals:** Record only behavior that current production paths implement. Keep the map-specific search scope distinct from the site-wide palette.

**Non-Goals:** This change does not make unused registry `selection` or `decorations` declarations production owners. `complete-map-registry-ownership` owns that work. This change does not change ranking, navigation, code, or data.

## Decisions

### Partition precedence differs from paint order

`resolveMarker()` chooses the highest matching precedence and throws on a tie (`marker-registry.ts:919-942`). `createLayers()` sorts primary layers by `z` (`layers.ts:52-54,418-513`). Do not use paint order to resolve overlapping source flags. Notable NPCs use a distinct marker, while 22 role controls are facets over the ordinary NPC layer (`marker-registry.ts:295-308,443-501`; `layers.ts:462-480`). A separate marker for each role would duplicate NPC spawns.

### One search index, two scopes

`searchEntities()` sends a scope to one worker (`search.ts:28-73`). The map scope keeps placement kinds and deduplicates by kind and ID; the palette scope excludes placements and deduplicates by destination (`engine.ts:170-221`). `map-search.ts:454-499` enriches ranked map documents with compendium geometry. The dialog groups results by category but does not rerank rows within a group (`MapSearch.svelte:78-92,123-134`). Do not create a second map search index or move server-only document builders into the browser.

### Keep measured transfer figures historical

The legacy record reports 4,105 documents and 0.38 MB compressed index, compared with 2.07 MB compressed main database (`docs/plans/2026-08-09-map-marker-and-search-registry.md:41-42`). Those are an earlier snapshot, not stable specifications or current measurements. Recheck production browser transfer and query latency under the existing `global-search` measurement requirement before any release that changes search.

## Risks / Trade-offs

- [Risk] A spec could describe the unused selection and decoration fields as shipped. → Restrict this change to verified primary-layer and search consumers.
- [Risk] Category grouping obscures overall rank across groups. → Preserve ranking inside each group and keep global palette results in one ranked list.

## Migration Plan

Documentation only. No deployment or rollback is required. Archive these requirements into their new main capabilities after verification.

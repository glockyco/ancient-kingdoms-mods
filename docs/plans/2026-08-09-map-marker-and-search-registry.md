---
title: "Map Marker Registry, Wayfinding, and First-Class Search"
type: spec
status: in-progress
created: 2026-08-09
parent: 2026-07-31-ancient-kingdoms-overview
supersedes:
superseded_by:
archived:
---

# Map Marker Registry, Wayfinding, and First-Class Search

## Goal

Finish the map-registry migration, expose the existing unified search as a global capability, and add
source-backed travel directions. Preserve URL identity, deck.gl performance, and explicit registry
ownership.

## Current state

Audit baseline: Ancient Kingdoms 0.9.31.1.

Implemented:

- `markerRegistry` owns marker identity, labels, colors, icons, paint order, default visibility,
  partition precedence, layer metadata, and NPC role facets.
- `createFilteredData()` partitions rows through `resolveMarker()`.
- `createLayers()` receives one `LayerContext` and constructs primary point layers from the registry.
- The sidebar and URL defaults derive their visibility metadata from the registry.
- Golden tests pin marker identities and deck.gl paint order.
- `entity-manifest.json` and `entityRegistry` own shared entity labels, routes, searchability, artwork,
  and sitemap participation.
- `build-search-db.ts` creates one `search.db` from registered entity documents.
- `searchEntities()` performs exact, prefix, FTS, and fuzzy search tiers.
- Map search uses the unified search ranking and restores map-specific geometry afterward.

The current build writes 3,858 search documents. It compresses `search.db` from 2.65 MB to 0.93 MB.
The main `compendium.db` compresses from 16.50 MB to 2.37 MB.

Not implemented:

- The site layout has no global Cmd-K palette.
- `HomeSearch.svelte` remains a development-only visual stub.
- The 14 legacy per-table FTS indexes and their triggers remain in `compendium.db`.
- Physical selection still uses legacy indexes and dispatch paths.
- Popup routing and popup bodies remain centralized.
- Zone focus and its GPU filters remain.
- Travel-edge publication, route computation, and wayfinding UI do not exist.
- Portal arcs still need the selected rendering and interaction treatment.

## Registry contracts

### Marker ownership

A marker definition owns presentation, partitioning, selection identity, visibility metadata, and
optional decorations. Registry iteration must keep stable layer IDs, stable data references, hoisted
accessors, and `visible: false` toggles. A field that removes no parallel ownership does not belong in
the registry.

Monster partitions use explicit precedence because source flags overlap. Paint order is separate from
partition precedence. NPC roles remain facets over one layer, not 22 marker definitions.

Decorations cover patrol paths, portal and teleporter arcs, altar radii, trap areas, and relationship
arcs. Every decoration layer ID must use its owning marker ID as a prefix.

### Entity ownership

`entityRegistry` owns shared labels, routes, searchability, artwork metadata, and sitemap participation.
Map markers refer to an entity definition instead of declaring a second route or label registry.
Server-only search-document builders remain outside browser modules.

### URL stability

Existing full marker keys remain the URL identities. Golden tests protect the key set. Removed keys
need no compatibility branch because the parser already discards unknown keys.

The current `entity` and `etype` selection grammar remains until the selection migration has a tested
replacement. Do not change it as a side effect of popup or search work.

## Search design

One search index serves map and global consumers. Search ranking uses these tiers:

1. exact normalized name;
2. name prefix;
3. weighted FTS over `name`, `keywords`, and cleaned `content`;
4. bounded fuzzy fallback.

Global relevance order remains intact. A consumer may group results for display, but it must not use
round-robin category interleaving.

The installed `sql.js-fts5@1.4.0` WASM is 1,213,472 bytes raw and 460,651 bytes gzip. A measured local
Node run initialized it in a 4.498 ms median and opened the earlier 16.9 MB database plus one query in a
13.966 ms median. These are local-process measurements, not browser cold-start evidence.

The global palette must measure network transfer, decompression, worker startup, first-result latency,
and keyboard interaction in a browser before release.

## Wayfinding model

Travel is not a portal-only graph. Day-one edge providers are:

- physical portals;
- NPC teleporters;
- the Wizard-only `Evacuate` path;
- travel items;
- walking within a non-dungeon parent zone.

A class-blind route cannot depend on `Evacuate`. The Gate Scroll and death or bind behavior provide
separate escape semantics and must not be hidden inside portal reachability.

Portal rows are physical objects. Do not deduplicate them by zone pair. Multiple exits between the same
zones can be on different dungeon floors. Sub-zone endpoint names are part of the route contract.

Each edge records direction, mechanism, source and destination, requirements, cost, and availability.
Requirements are conditions, not a guarantee that the route works in current server state.

Build-time checks must cover provider completeness, endpoint resolution, and route reachability.
Unreleased or redacted content must not become a public route merely because an edge survives in raw
data.

## Portal arc decision

Keep the all-arcs view. Replace straight, equally weighted chords with curved arcs that are faint by
default and emphasized on hover or selection. Keep distinct physical portals. Separate cross-zone and
intra-zone presentation without changing portal identity.

## Zone-focus decision

Remove zone focus during the remaining layer cleanup. It duplicates spatial navigation and threads two
GPU filter extensions through every entity layer. An old `zone` parameter can become inert; no parser
shim is required.

This decision is not implemented. Current code still contains `ZoneFocusSelect`, `focusedZoneId`, and
the zone filter extensions.

## Remaining work

### Map completion

- [ ] Move physical selection to registry-owned strategies and delete the legacy index switches.
- [ ] Split centralized popup bodies and route dispatch behind entity or marker ownership.
- [ ] Move patrols, radii, areas, and arcs to registry-owned decoration production.
- [ ] Remove zone focus and its URL, component, state, and GPU filter plumbing.
- [ ] Preserve golden URL keys, paint order, selection outcomes, and popup behavior.

### Global search

- [ ] Add one global Cmd-K palette in `+layout.svelte` using `searchEntities()`.
- [ ] Replace the development-only `HomeSearch` stub with a working global-search entry point.
- [ ] Keep map search on the same ranking path and retain map-specific geometry enrichment.
- [ ] Add entity artwork, keyboard navigation, empty state, and recent searches.
- [ ] Remove the 14 legacy FTS tables, triggers, optimization list, and last old reader in one cutover.
- [ ] Measure browser cold start, first result, transfer bytes, worker memory, and main-thread responsiveness.

### Wayfinding and portal UX

- [ ] Publish source-cited `Evacuate` destinations and every other required non-database rule.
- [ ] Implement typed travel-edge providers for portals, NPC teleporters, travel items, and `Evacuate`.
- [ ] Implement guarded walking edges for non-dungeon parent zones.
- [ ] Build deterministic directed route tables with explicit requirement and availability metadata.
- [ ] Add route search and itinerary presentation to the map.
- [ ] Replace portal `LineLayer` chords with the approved curved, interactive arc presentation.
- [ ] Add game-version and graph-completeness checks.

### Cleanup

- [ ] Remove duplicate entity unions, route switches, role maps, and dead wrappers after their owners move.
- [ ] Keep map-specific rules in `rule://interactive-map` and behavioral invariants in tests.
- [ ] Run browser checks for shared links, selection, popups, search, cancellation, routing, and arc interaction.

## Boundaries

- Do not build a second search index for the global palette.
- Do not move database or server-only code into shared browser registries.
- Do not allocate marker data or accessors per deck.gl frame.
- Do not replace explicit complex marker behavior with exception flags in a generic helper.
- Do not infer travel completeness from database tables alone.
- Do not claim browser performance from local Node measurements.

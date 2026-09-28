## Context

The registry declares `selection` and `decorations` (`marker-registry.ts:59-71,97-120`), but production selection uses `selection.ts:60-150` and `resolve-selection.ts:86-95,450-472`. Hand-built decorations remain in `layers.ts:634-769,846-905,1004-1029`. The map page handles selection and two popup render branches (`+page.svelte:205-230,462-511,1190-1343`); `EntityPopup.svelte:98-155,454-1369` contains family-specific data and layouts.

## Goals / Non-Goals

**Goals:** Make every retained registry declaration serve a production path and preserve behavior at each selection entry point. Delete declarations that cannot own real behavior.

**Non-Goals:** Route computation and curved portal-arc styling belong to `add-map-wayfinding`. Global search ranking belongs to `global-search`. Mini-maps on detail pages remain outside map scope.

## Decisions

### Selection ownership must preserve two identities

Monster marker rows use spawn `id`, but navigation and group highlighting use `monsterId` (`selection.ts:60-83,156-254`; `+page.svelte:491-511`). Fishing-spot selection groups variants; item-source overrides use exact spawn IDs (`selection.test.ts:54-95`). Move physical identity and index metadata behind registry-owned strategies rather than copying the current type checks. Keep virtual item and quest resolution separate, since it queries the client database (`resolve-selection.ts:98-168`). Test URL restoration, click identity, search, hover, and unpositioned entities before removing the old dispatch. A simple `by-field` strategy cannot alone express altar-only monster overrides or NPC position rules.

### Popup ownership stays family-specific

Resolve popup family through the existing marker/entity definitions, then render dedicated family bodies inside the existing card and drawer shells. Entity identity and routes belong to `openspec/specs/entity-registries/spec.md`; positioned marker selection belongs to `openspec/specs/map-marker-registry/spec.md`. Keep server-only queries outside the browser registry. Do not replace distinct portal, trap, monster, and NPC bodies with a generic field renderer. Two repeated `{#if}` dispatches in `+page.svelte:1190-1343` should share one popup host. Preserve concurrent accessibility work on `ZoneFocusSelect.svelte` and text corrections in `EntityPopup.svelte` and `MapTooltip.svelte` when splitting or removing those components.

### Decoration declarations must be real or absent

Current `MarkerDecoration` has only an ID and kind, and no production consumer (`marker-registry.ts:63-71,136-149,310-320,530-537`). This shape cannot describe trap polygons and the altar radius. Replace it with source-specific, typed production metadata only where that removes the corresponding `layers.ts` branch; delete all inert declarations. Retain stable render arrays, layer IDs where possible, filtering, and the golden draw order (`golden.test.ts:76-145`). Prefix any new decoration IDs with the owning marker ID. Precompute selection-dependent shapes outside per-frame layer creation. Portal-arc generation moves with portal ownership; curvature and hover treatment remain in `add-map-wayfinding`.

### Remove zone focus without changing selection links

`ZoneFocusSelect.svelte`, `MapSidebarContent.svelte:331-337`, `+page.svelte:97-99,409-435,734-735,1012-1014`, `url-state.ts:22-35,362-370`, and `layers.ts:404-513,601-627` carry zone focus. `zone-filter.ts:8-18` now returns its input unchanged. Remove the dropdown, focused state, `zone` parsing and writing, GPU zone predicates, and then the wrapper. Keep `szone` popup links and `entity`/`etype` identity. Existing `zone` URLs need no compatibility parser because the map can ignore unknown keys; browser navigation must remain valid. Preserve level and NPC-role GPU filters after dropping the zone dimension. Reconcile `MapLink.svelte:6-8` and `+page.svelte:215-221` with the canonical entity type, removing duplicate unions without changing published links.

### Detail pages deliberately omit a live map

The map component owns database preload, tile warming, dynamic deck.gl import, and view fitting (`+page.svelte:693-757,907-950`). `db.ts:20-29,76-82` starts the browser database worker. Embedding it on detail pages would add map-only database, WASM, and graphics work to those pages. A measurement found a 16.1 MiB database, 1.2 MB WASM, and about 1.58 MB deck.gl chunks; remeasure before treating these as current payload sizes. The detail-page `MapLink` opens `/map?entity=…&etype=…` or `/map?szone=…` (`MapLink.svelte:18-23`) and map initialization fits selections (`+page.svelte:766-915`). A future mini-map, if justified, should use a build-time static crop of `/tiles/{z}/{x}/{y}` rather than the live map runtime.

## Risks / Trade-offs

- [Risk] Moving popup branches drops a family action or current corrected wording. → Compare each family on desktop and mobile before deleting its old branch.
- [Risk] Removing zone filtering also disables monster levels or NPC roles. → Keep their remaining GPU predicates and verify both filters.
- [Risk] A decoration changes paint position. → Review golden order and exercise its selection and visibility in the browser.

## Migration Plan

Migrate physical selection and popup dispatch before removing old paths. Move or delete decoration declarations only after checking their real output. Remove zone focus and obsolete wrappers in one cutover. Check map links and both viewports before release; no persistent data migration is needed.

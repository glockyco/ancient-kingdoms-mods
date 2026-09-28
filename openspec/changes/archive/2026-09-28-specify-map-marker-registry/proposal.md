## Why

Map marker and map search behavior is live, but the main specifications do not own its distinct contracts. This documentation-only change records verified behavior without treating unfinished selection and decoration declarations as shipped features.

## What Changes

- Specify the marker registry's existing partition, presentation, sidebar, visibility, and primary-layer behavior.
- Specify map-only search results, shared ranking, geometry enrichment, and selection behavior not covered by `global-search`.
- Verify each requirement against the current code. No website code or tests change.

## Capabilities

### New Capabilities

- `map-marker-registry`: Existing marker partitions, presentation metadata, layer construction, and visibility controls.
- `map-search`: Existing map-specific search scope, map geometry, and selected-result behavior.

### Modified Capabilities

None. The existing `global-search` ranking and placement-family requirements remain authoritative.

## Impact

Documentation only. Evidence includes `website/src/lib/map/marker-registry.ts:396-853,919-942`, `website/src/lib/map/layers.ts:85-170,418-513`, `website/src/lib/search/engine.ts:170-221`, `website/src/lib/queries/map-search.ts:406-499`, and `website/src/routes/map/+page.svelte:662-687`.

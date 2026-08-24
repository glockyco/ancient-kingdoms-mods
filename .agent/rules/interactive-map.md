---
description: Preserve registry ownership, coordinate conversion, and deck.gl performance when editing the interactive map.
globs:
  - "website/src/lib/map/**"
  - "website/src/lib/components/map/**"
  - "website/src/routes/map/**"
---
# Interactive map

`marker-registry.ts` is the single marker registry. Add the data contract and loader first, then register presentation metadata once. Do not add a parallel config record or a compatibility switch in a consumer. Keep stable marker ids and filter null positions before layer creation.

Convert game `(x, z)` to deck `[x, -z]` once. Navigation ids are entity ids, not spawn-row ids.

Keep layer creation cheap:

- Pre-filter static categories once.
- Create stable layers and change `visible` instead of rebuilding arrays for toggles.
- Use `updateTriggers` for dynamic accessors.
- Use `DataFilterExtension` for level filtering.
- Compute state-dependent arrays with `$derived` outside `createLayers()`.
- Reuse stable empty arrays and typed layer context values.

Preserve semantic layer order. Background, tiles, and zones stay below paths and ranges. Ordinary markers stay below important markers. Relationship, selection, hover, and zone highlights stay above marker layers.

The marker registration test owns completeness. A new layer is incomplete until that test passes and the real map shows selection, search, tooltip, popup, and visibility behavior required by its contract.

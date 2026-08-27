---
description: Preserve registry ownership, coordinate conversion, and deck.gl performance when editing the interactive map.
globs:
  - "website/src/lib/map/**"
  - "website/src/lib/components/map/**"
  - "website/src/routes/map/**"
---
# Interactive map

## Coordinate contract

- Deck X is game X.
- Deck Y is negative game Z. Do not use game Y on the two-dimensional map.
- Negating Z keeps north at the top because screen Y increases downward.
- Convert coordinates once at the data boundary. Do not mix game and deck coordinates inside layers.

## Identity contract

- `MapEntity.id` is the spawn id for a monster and the entity id for an NPC. A monster's entity id is `monsterId`.
- Detail routes need the entity id. `website/src/lib/components/map/EntityPopup.svelte` owns both cases. Either id is a string, so the wrong one gives a dead route rather than a type error.

## Layer ownership

`marker-registry.ts` owns marker precedence and presentation metadata. Add the data contract and loader first, then register presentation metadata once. Do not add another marker registry, compatibility map, or consumer-specific marker switch. Do not add a parallel config record. Keep stable marker ids and filter null positions before layer creation. The registration test must fail when a layer is omitted.

Render order is semantic. Preserve the relative order when inserting a layer:

1. terrain and zones
2. paths and ranges
3. ordinary markers
4. important markers
5. relationship, selection, hover and zone highlights

## Layer performance

Keep layer creation cheap:

- Pre-filter static categories once.
- Create stable layers and change `visible` instead of rebuilding arrays for toggles.
- Use `updateTriggers` for dynamic accessors.
- Use `DataFilterExtension` for level filtering.
- Compute state-dependent arrays with `$derived` outside `createLayers()`.
- Reuse stable empty arrays and typed layer context values.

A new layer is incomplete until that test passes and the real map shows selection, search, tooltip, popup, and visibility behavior required by its contract.

---
name: add-map-entity-layer
description: Add a new entity type layer to the interactive map
---

## Overview

The map is migrating to a registry-centered architecture. A new marker must be added
through the production registry and the data contract; do not create parallel color,
icon, radius, visibility, selection, or URL switches.

## Required workflow

1. **Define the data contract** in `website/src/lib/types/map.ts`:
   - Extend `EntityType`, `AnyMapEntity`, `MapEntityData`, and `FilteredMapData`.
   - Add an entity-specific `MapEntity` interface.
   - Add a `LayerVisibility` key only when the marker has an independent visibility
     control. NPC roles remain facets of the NPC marker, not separate marker types.
2. **Add the server loader** in `website/src/lib/queries/map.server.ts` and wire it into
   `loadAllMapEntities()`. Select raw coordinates and map them as
   `[position_x, -position_y]`. Use entity IDs for links, not spawn IDs.
3. **Register the marker** in `website/src/lib/map/marker-registry.ts`:
   - Give it a unique ID, source, precedence, match/selection strategy, labels,
     plural label, color, Lucide icon, atlas key, icon size, fallback radius,
     border class, z-order, and default visibility.
   - Add hard-case behavior (facets, delegated selection, decorations, or portal
     destination metadata) to the registry contract rather than to a new switch.
   - Preserve the distinction between partition precedence and deck.gl paint order.
4. **Connect presentation consumers** using registry-derived metadata:
   - Partition render data with `resolveMarker()`.
   - Use the marker registry for layer styling, atlas keys, fallback radii, URL defaults,
     and marker-specific sidebar metadata.
   - Add only genuinely entity-specific popup, tooltip, selection, or decoration behavior.
5. **Update search only at the capability boundary**. Add the entity to the shared
   search/index source and its broad semantic category; do not add a second map-only
   search table or per-consumer metadata translation.
6. **Add tests** for registry completeness, precedence/selection, URL key grammar,
   layer order, and any entity-specific observable behavior. Run the focused map tests,
   `pnpm check`, and the relevant full-suite gates.

## Clean-cutover rules

- Do not add compatibility aliases, deprecated paths, fallback zone names, or a second
  marker registry.
- Do not edit `config.ts`, `icons.ts`, or `layers.ts` to duplicate marker presentation
  metadata. Those files retain only global map constants and genuinely specialized
  decorations while migration is in progress.
- Keep the existing marker ID as the stable URL/deep-link key.
- Preserve null-position filtering and Y negation.
- Use deck.gl `visible` state and precomputed arrays; do not compute entity data inside
  the layer factory.

## Key files

- `website/src/lib/types/map.ts` — map data contracts
- `website/src/lib/queries/map.server.ts` — server-side loaders
- `website/src/lib/map/marker-registry.ts` — marker definitions and derived metadata
- `website/src/lib/map/layers.ts` — rendering and specialized decorations
- `website/src/lib/map/url-state.ts` — shareable visibility state
- `website/src/lib/components/map/sidebar/` — layer controls
- `website/src/lib/map/selection.ts` and `resolve-selection.ts` — selection behavior
- `website/src/lib/components/map/EntityPopup.svelte` — click details
- `website/src/lib/components/map/MapTooltip.svelte` — hover details
- `website/src/lib/queries/map-search.ts` — legacy map search during search migration

## Coordinate invariant

SQL selects raw `position_x` and `position_y`; map coordinates use:

```ts
position:
  r.position_x !== null && r.position_y !== null
    ? [r.position_x, -r.position_y]
    : null
```

The second coordinate must be negated because game Z is displayed as deck.gl Y.

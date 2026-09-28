## Why

Several entity lists show a name and zone but no direct route to the entity on the map. Readers must open a detail page first, even when the list already identifies a mapped entity.

## What Changes

- Add compact map links to the monster, NPC, altar, gathering-resource, and quest overviews and the Hunter and Herbalism target lists.
- Add compact map links to the position-backed monster, altar, NPC, chest, and trap rows on zone detail pages.
- Show a non-link placeholder where a physical row has no usable map position. Only show a quest map link when a mapped quest-related location can be identified.
- Preserve the already linked chest, trap, Slayer, and Mining lists and the existing map URL and selection behavior.

## Capabilities

### New Capabilities

- `list-page-map-links`: Direct navigation from entity and profession lists to available map locations.

### Modified Capabilities

None. Existing map zoom and pan requirements do not change.

## Impact

The list and profession Svelte routes, their server-side list data, zone detail rows, and the shared `MapLink` component contract are affected. The map selection and URL handlers remain the navigation source of truth (`website/src/lib/components/MapLink.svelte:18-23`, `website/src/lib/map/resolve-selection.ts:86-105`).

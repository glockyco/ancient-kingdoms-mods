## Why

The map item popup omits pack and random-container sources that the item detail page already knows. An item with only these sources appears to have no way to obtain it in the popup.

## What Changes

- Show pack containers and their item amounts in a map item's source list.
- Show random containers and their item probabilities in the same popup.
- Link each container to its item selection within the map. Preserve all existing source sections and distinguish virtual item sources from focusable map locations.

## Capabilities

### New Capabilities

- `map-item-popup-sources`: Obtainability sources shown in the interactive map's item popup.

### Modified Capabilities

None. The existing map navigation zoom and pan rules are unchanged.

## Impact

`website/src/lib/queries/popup.ts` reads two additional junction tables into `ItemPopupDetails`, and `website/src/lib/components/map/ItemPopup.svelte` renders both families. The item detail page already reads both through `website/src/lib/server/item-sources.ts:477-516`. The concurrent recipe-material reader change in `popup.ts` remains independent.

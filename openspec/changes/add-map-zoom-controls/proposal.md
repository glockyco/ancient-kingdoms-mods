## Why

The interactive map can zoom and pan by pointer or touch, but it has no visible zoom buttons. Its map canvas has no focusable, named region, and the current keyboard handler only opens search or clears selection (`website/src/routes/map/+page.svelte:651-660,1157-1164`).

## What Changes

- Add visible, accessible zoom-in and zoom-out controls within the map UI.
- Make the map region focusable and labelled, with keyboard zoom and pan while the region has focus.
- Keep every input within the existing viewport limits and preserve mouse and touch navigation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `interactive-map-navigation`: Add explicit zoom controls and keyboard navigation to its existing zoom and pan contract.

## Impact

`website/src/routes/map/+page.svelte` gains map controls and a focused-region keyboard handler. Existing viewport constraints (`website/src/lib/map/config.ts:26-36`), camera updates (`website/src/lib/map/flyto.ts:12-33`), and map URL sync remain authoritative. No new tiles or data assets are required.

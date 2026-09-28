## Why

Primary marker layers use the registry, but selection, decorations, and popup routing still have separate owners. Registry fields that have no production consumer misstate the current contract and can hide omissions.

## What Changes

- Give each retained registry field one production consumer, or delete the unused field. Preserve map selection, popups, and stable marker URL keys.
- Move physical selection, popup family dispatch, and decoration production away from parallel switches and hand-built declarations. Do not turn complex behavior into generic exception flags.
- Remove zone-focus controls, URL state, and GPU filters after verifying the affected links and view navigation. **BREAKING**: the old `zone` focus parameter becomes inert; `szone` still selects a zone popup.
- Remove duplicate entity unions and obsolete wrappers after the cutover.

## Capabilities

### New Capabilities

- `map-registry-ownership`: Selection identity, popup routing, decoration ownership, marker URL stability, and zone-focus removal.

### Modified Capabilities

None. The existing `interactive-map-navigation` zoom and pan contract stays unchanged.

## Impact

`website/src/lib/map/{marker-registry,selection,resolve-selection,layers,url-state,zone-filter,visibility}.ts`, map popups and sidebar, `website/src/routes/map/+page.svelte`, `website/src/lib/components/MapLink.svelte`, and focused map tests. The parallel accessibility and wording changes to `ZoneFocusSelect.svelte`, `EntityPopup.svelte`, and `MapTooltip.svelte` must remain intact until the relevant controls or branch owners move.

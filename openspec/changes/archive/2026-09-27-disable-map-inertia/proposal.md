## Why

The interactive map continued to pan for 500 ms after the reader released a drag. On a touch device, a short swipe moved the map far past the target position. The reader then had to pan back.

## What Changes

- The map stops pan motion when the reader releases a mouse or touch drag.
- Zoom bounds and click selection do not change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `interactive-map-navigation`: add a requirement for non-inertial pan gestures.

## Impact

- `website/src/routes/map/+page.svelte`: the deck.gl controller configuration.
- No data, API, or dependency changes.

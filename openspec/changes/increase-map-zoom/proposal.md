## Why

The interactive map stops at zoom level 4, which prevents close inspection of dense areas. The existing tiles can support a closer view through client-side overzooming.

## What Changes

- Increase the interactive map maximum zoom from 4 to 6.
- Keep the tile source, tile zoom range, and fly-to zoom behavior unchanged.
- Verify that users can zoom to level 6 without requesting new tile levels.

## Capabilities

### New Capabilities

- `interactive-map-navigation`: Defines the map viewport zoom range and tile overzoom behavior.

### Modified Capabilities

None.

## Impact

- `website/src/lib/map/config.ts`: viewport maximum zoom.
- Interactive map verification and focused view-state tests.

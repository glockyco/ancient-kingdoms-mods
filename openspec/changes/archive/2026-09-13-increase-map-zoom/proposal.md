## Why

Bounds navigation can replace the map's zoom ceiling with its zoom-2 fit limit. After users select or focus an entity, they cannot manually zoom to the intended level 4.

## What Changes

- Preserve the interactive map maximum zoom at level 4 after bounds navigation.
- Keep the zoom-2 fit limit separate from the viewport's zoom ceiling.
- Keep the tile source and tile zoom range unchanged.
- Verify that users can manually zoom to level 4 after selecting an entity.

## Capabilities

### New Capabilities

- `interactive-map-navigation`: Defines the map viewport zoom range and tile overzoom behavior.

### Modified Capabilities

None.

## Impact

- `website/src/lib/map/flyto.ts`: bounds-fitting view state.
- Interactive map verification and focused fly-to tests.

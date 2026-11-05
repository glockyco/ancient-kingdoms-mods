## Why

Pocket Compendium's hovers all used a copy of the game's tooltip frame. Over the mod's own dark panels, such as a dungeon card, the stone frame looked out of place, while inside the game's own windows it fits.

## What Changes

- Hovers on Pocket Compendium's panels and on the map use the panels' look: the boss list, the Boss skills panel, map pins and dungeon cards.
- Hovers inside the game's windows keep the game's tooltip frame: the Skills window beside a Bestiary page and the Fatecharm icon on the target frame.
- The panel look is fully opaque, so the text under a tooltip stays hidden.

## Capabilities

### New Capabilities

### Modified Capabilities

- `player-mods`: a hover's tooltip takes the look of the surface it belongs to.

## Impact

- `mods/PocketCompendium/Core/Ui/Tooltip.cs`: a second, panel-look frame, and a look per hover text.
- The Skills window cards and the Fatecharm icon ask for the game's look.

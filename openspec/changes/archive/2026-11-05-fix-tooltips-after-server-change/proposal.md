## Why

After a player hovers a boss list row and then changes servers, or logs out and back in, every game tooltip shows as an empty box, including the Bestiary drops. Pocket Compendium's panels used the game's single tooltip object, so the game moved it into the panel canvas, which survives leaving the world. The game then kept writing tooltip text into that old object and showed its new tooltip empty.

## What Changes

- Pocket Compendium shows its own hover texts in a tooltip of its own that looks like the game's: the boss list, the Boss skills panel, the map pins, the Fatecharm icon and the Skills window cards.
- The mod no longer moves, shows or changes the game's tooltip object. Bestiary drops are the game's own slots and keep the game's tooltip, with the mod's lines in their text.

## Capabilities

### New Capabilities

### Modified Capabilities

- `player-mods`: the mod's hover texts use the mod's own tooltip and leave the game's tooltip working after a server change.
- `respawn-surfaces`: map pins show their hover text in the mod's tooltip.

## Impact

- `mods/PocketCompendium/Core/Ui`: a new tooltip view and its hover registry. `Overlay` no longer touches the game's tooltip.
- Boss list rows, tiles and buttons, Boss skills buttons, map pins, the Fatecharm socket and the Skills cards register their texts with the new tooltip instead of adding the game's `UIShowToolTip`.
- Gamepad focus on a Skills card shows the mod's tooltip.

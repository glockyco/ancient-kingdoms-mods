## Why

Hovering a dungeon's entrance on the local map only writes the dungeon's name under the map. Seeing which of a dungeon's bosses are up means switching the boss list to all zones and finding the dungeon among them.

## What Changes

- Hovering a dungeon's entrance on the local map shows a card beside it with the dungeon's tracked bosses, elites and fabled monsters in the boss list's compact style: the dungeon's name and how many are up, then their tiles four to a line, in the boss list's state order.
- The card stays while the pointer is on the entrance, on the card or on the strip between them. Its tiles work as the boss list's: a tooltip, a click to watch and a Shift-click to open the Bestiary.
- Dungeon entrances is a feature with its own switch, on at first, apart from map pins.
- The boss list's panel look and its compact tiles become shared components, `PanelChrome` and `TileGrid`, which the boss list and the card both use.

## Capabilities

### New Capabilities

### Modified Capabilities

- `respawn-surfaces`: dungeon entrances list their monsters on the local map.

## Impact

- `mods/PocketCompendium/Features/MapPins`: the entrances, their spots and the card.
- `mods/PocketCompendium/Core/Ui/PanelChrome.cs` and `Features/BossList/Ui/TileGrid.cs`, taken out of `BossListPanel`.

# MapTeleporter

Teleports the local player to a position selected on the open map.

Not published as a download. `build-tool deploy` installs it with the other mods.

## Use

Open the map, hold Alt, and left-click a destination.

## Settings

In `UserData/MelonPreferences.cfg`, category `MapTeleporter`: `VerboseLogging` defaults to `false` and logs coordinate conversion details.

## Limits

Uses the player's current zone ID and the game's portal command; it does not choose a destination zone.

## Requirements

MelonLoader, Ancient Kingdoms, and [FieldDefaultValueHookFix](../FieldDefaultValueHookFix/README.md).

# MapTeleporter

Teleports the character to a point clicked on the map.

Not published as a download. `build-tool deploy` installs it with the other mods.

## Use

Open the map, hold Alt, and left-click the destination.

## Settings

In `UserData/MelonPreferences.cfg`, category `MapTeleporter`, `VerboseLogging` (default `false`) logs each coordinate conversion.

## Limits

It teleports within the current zone, through the game's portal command.

## Requirements

MelonLoader and [FieldDefaultValueHookFix](../FieldDefaultValueHookFix/README.md).

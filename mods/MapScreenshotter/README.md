# MapScreenshotter

Captures tiled world-map images and their metadata.

Not published as a download. `build-tool deploy` installs it with the other mods.

## Use

Press Shift+F10 with a local player loaded. [HotReplCommands](../HotReplCommands/README.md) also drives capture through `compendium.export`. Outputs go to `DATA_EXPORT_PATH/screenshots`: `world_x<X>_y<Y>.png` tiles and `metadata.json`.

## Settings

None.

## Limits

Requires a local player and the zone list. Rejects concurrent captures. The output path is compiled into the DLL.

## Requirements

MelonLoader, Ancient Kingdoms, and [FieldDefaultValueHookFix](../FieldDefaultValueHookFix/README.md).

# MapScreenshotter

Captures the world map as tiled screenshots, with their metadata.

Not published as a download. `build-tool deploy` installs it with the other mods.

## Use

Press Shift+F10 in the world, or run `compendium.export` from [HotReplCommands](../HotReplCommands/README.md). The tiles (`world_x<X>_y<Y>.png`) and `metadata.json` go to `DATA_EXPORT_PATH/screenshots`.

## Settings

None.

## Limits

It needs a character in the world and the zone list, and runs one capture at a time. To change the output folder, rebuild the mod.

## Requirements

MelonLoader and [FieldDefaultValueHookFix](../FieldDefaultValueHookFix/README.md).

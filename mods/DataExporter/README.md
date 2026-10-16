# DataExporter

Exports the game data and images that the compendium is built from.

Not published as a download. `build-tool deploy` installs it with the other mods.

## Use

Press Shift+F9, or run the HotRepl command `compendium.export` from [HotReplCommands](../HotReplCommands/README.md). Each run becomes a new session under `DATA_EXPORT_PATH`, which is set when the mod is built, once every file checks out. [`exported-data/README.md`](../../exported-data/README.md) describes the layout.

## Settings

None.

## Limits

World positions cover only objects the game has loaded. To change the output folder, rebuild the mod.

## Requirements

MelonLoader and [FieldDefaultValueHookFix](../FieldDefaultValueHookFix/README.md).

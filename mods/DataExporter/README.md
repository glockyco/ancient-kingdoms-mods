# DataExporter

Exports the game data and images that the compendium is built from.

Not published as a download. `build-tool deploy` installs it with the other mods.

## Use

Press Shift+F9, or run the HotRepl command `compendium.export` from [HotReplCommands](../HotReplCommands/README.md). The JSON files and images go to `DATA_EXPORT_PATH`, which is set when the mod is built.

## Settings

None.

## Limits

World positions cover only objects the game has loaded. To change the output folder, rebuild the mod.

## Requirements

MelonLoader and [FieldDefaultValueHookFix](../FieldDefaultValueHookFix/README.md).

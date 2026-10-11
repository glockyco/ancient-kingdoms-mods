# DataExporter

Exports runtime game data and visual assets for the compendium.

Not published as a download. `build-tool deploy` installs it with the other mods.

## Use

Press Shift+F9 to export. [HotReplCommands](../HotReplCommands/README.md) also exposes `compendium.export`. JSON and visual assets are written under the build-time `DATA_EXPORT_PATH`.

## Settings

None.

## Limits

World placements depend on loaded game objects. The export destination is compiled into the DLL, not a runtime preference.

## Requirements

MelonLoader, Ancient Kingdoms, and [FieldDefaultValueHookFix](../FieldDefaultValueHookFix/README.md).

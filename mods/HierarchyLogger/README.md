# HierarchyLogger

Dumps the active World scene's object hierarchy and fog-related components.

Not published as a download. `build-tool deploy` installs it with the other mods.

## Use

Press F9 in the World scene. Writes `hierarchy_dump.txt` in the game root, replacing the previous dump.

## Settings

None.

## Limits

Only runs in the World scene; it does not dump every loaded scene. It does not check modifier keys, so DataExporter's Shift-F9 also writes a dump.

## Requirements

MelonLoader, Ancient Kingdoms, and [FieldDefaultValueHookFix](../FieldDefaultValueHookFix/README.md).

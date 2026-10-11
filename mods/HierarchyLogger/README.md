# HierarchyLogger

Writes the object hierarchy of the World scene, with its fog components, to a text file.

Not published as a download. `build-tool deploy` installs it with the other mods.

## Use

Press F9 in the world. The mod writes `hierarchy_dump.txt` to the game folder, replacing the previous dump.

## Settings

None.

## Limits

It covers the World scene only. It ignores modifier keys, so DataExporter's Shift+F9 also writes a dump.

## Requirements

MelonLoader and [FieldDefaultValueHookFix](../FieldDefaultValueHookFix/README.md).

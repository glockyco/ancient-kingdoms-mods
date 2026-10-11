# ResourceRespawner

Shows resource cooldown markers and lets the host bring their ready deadline forward.

Not published as a download. `build-tool deploy` installs it with the other mods.

## Use

In the World scene, hold Alt and left-click a resource marker to bring its ready deadline forward.

## Settings

None.

## Limits

Changing the deadline requires hosting; writing a local copy on a remote client does not change the server. Only loaded gather items that are not spawn-ready and have a future deadline receive markers.

## Requirements

MelonLoader, Ancient Kingdoms, and [FieldDefaultValueHookFix](../FieldDefaultValueHookFix/README.md).

# MonsterRespawner

Shows dead monster countdown markers and lets the host bring their respawn deadline forward.

Not published as a download. `build-tool deploy` installs it with the other mods.

## Use

In the World scene, hold Alt and left-click a respawn marker to make that monster eligible on the next respawn check.

## Settings

None.

## Limits

Host-only: countdowns and clicks read or write the unsynchronized server field `Monster.respawnTimeEnd`. Only dead, respawning, loaded monsters with a future deadline receive markers.

## Requirements

MelonLoader, Ancient Kingdoms, and [FieldDefaultValueHookFix](../FieldDefaultValueHookFix/README.md).

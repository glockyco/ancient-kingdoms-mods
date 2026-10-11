# MonsterRespawner

Marks dead monsters with their respawn countdowns and lets the host respawn them early.

Not published as a download. `build-tool deploy` installs it with the other mods.

## Use

In the world, hold Alt and left-click a monster's marker. The monster respawns at the game's next respawn check.

## Settings

None.

## Limits

It works only in a world you host, because it reads and writes `Monster.respawnTimeEnd`, which the server does not send to other players. Only loaded monsters that are waiting to respawn get markers.

## Requirements

MelonLoader and [FieldDefaultValueHookFix](../FieldDefaultValueHookFix/README.md).

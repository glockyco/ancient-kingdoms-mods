# HotReplCommands

Adds the HotRepl commands that `build-tool` and agents use to drive the game.

Not published as a download. `build-tool deploy` installs it with the other mods.

## Use

| Command | Use |
| --- | --- |
| `compendium.preflight` | Checks that an export can start. |
| `world.summary` | Reports the scene, the network state, the characters, and whether a player is in the world. |
| `world.enter` | Enters the world with a chosen character. |
| `compendium.export` | Runs DataExporter, and MapScreenshotter when asked. |
| `game.quit` | Quits the game. |
| `game.useScratchDatabase` | Points the game at the scratch database before the save opens. |
| `capture.zoneShots` | Captures the zone images. |
| `character.create` | Creates a character through the game's character creator. |

Exports go to a new session under `DATA_EXPORT_PATH`, as [`exported-data/README.md`](../../exported-data/README.md) describes, and map screenshots to its `screenshots` folder. Zone shots go to `screenshots/zones/<zone_id>.png` under the same folder, with a `manifest.json`. The scratch database is `verification-scratch/game.dat`, next to the game's own database.

## Settings

None.

## Limits

`game.useScratchDatabase` refuses once the game has opened its database. Character creation, world entry, and capture change the game state.

## Requirements

MelonLoader and [FieldDefaultValueHookFix](../FieldDefaultValueHookFix/README.md).
The HotRepl host, installed by `build-tool deploy-host`.
[DataExporter](../DataExporter/README.md) and [MapScreenshotter](../MapScreenshotter/README.md) in the game.

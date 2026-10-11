# HotReplCommands

Exposes typed HotRepl controls for world entry, exports, screenshots, and scratch-database isolation.

Not published as a download. `build-tool deploy` installs it with the other mods.

## Use

Use these registered HotRepl commands:

| Command | Use |
| --- | --- |
| `compendium.preflight` | Checks export readiness. |
| `world.summary` | Reads world state. |
| `world.enter` | Enters the world with a selected character. |
| `compendium.export` | Exports data and optionally map tiles. |
| `game.quit` | Quits the game. |
| `game.useScratchDatabase` | Redirects the database before it opens. |
| `capture.zoneShots` | Captures zone images. |

Exports use `DATA_EXPORT_PATH`; map tiles use its `screenshots` folder. Zone shots write `screenshots/zones/<zone_id>.png` and `manifest.json` under that export root. The scratch database is `verification-scratch/game.dat` beside the normal database.

## Settings

None.

## Limits

Scratch redirection refuses an already-open database. World entry and capture mutate game state.

## Requirements

MelonLoader, Ancient Kingdoms, and [FieldDefaultValueHookFix](../FieldDefaultValueHookFix/README.md). The HotRepl host must be installed with `build-tool deploy-host`. Requires [DataExporter](../DataExporter/README.md) and [MapScreenshotter](../MapScreenshotter/README.md) at runtime.

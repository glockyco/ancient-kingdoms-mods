# BossTracker

Lists the loaded bosses, elites, and fabled monsters with whether they are alive, their direction and distance, and when they respawn.

[Download BossTracker.dll](https://ancient-kingdoms.compendiums.org/mods/BossTracker.dll)

## Use

Install MelonLoader, then put the DLL in the game's `Mods` folder with FieldDefaultValueHookFix.

The panel appears in the world. Hold Right Shift and drag it with the left mouse button to move it.

## Settings

In `UserData/MelonPreferences.cfg`, category `BossTracker`:

| Key | Default |
| --- | --- |
| `PanelX` | `-10` |
| `PanelY` | `30` |
| `PanelWidth` | `420` |
| `PanelHeight` | `300` |
| `FontSize` | `12` |

## Limits

Respawn countdowns appear only in a world you host, solo play included. They come from `Monster.respawnTimeEnd`, which the server does not send to other players. Monsters outside the loaded area are not listed.

## Requirements

MelonLoader and [FieldDefaultValueHookFix](../FieldDefaultValueHookFix/README.md).

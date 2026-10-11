# BossTracker

Lists loaded bosses, elites, and fabled monsters with alive status, direction, distance, and respawn countdowns.

[Download BossTracker.dll](https://ancient-kingdoms.compendiums.org/mods/BossTracker.dll).

## Use

With MelonLoader installed, put the DLL in the game's `Mods` folder alongside FieldDefaultValueHookFix.

The panel appears automatically in the World scene. Hold Right Shift and drag with the left mouse button to move it.

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

Respawn countdowns are host-only: they read `Monster.respawnTimeEnd`, a server field that is not synchronized to remote clients. Only loaded monsters are scanned.

## Requirements

MelonLoader, Ancient Kingdoms, and [FieldDefaultValueHookFix](../FieldDefaultValueHookFix/README.md).

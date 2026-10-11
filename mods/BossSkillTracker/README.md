# BossSkillTracker

Shows the skill cooldowns of the bosses, elites, and fabled monsters you fight, and when each can next use a special skill.

[Download BossSkillTracker.dll](https://ancient-kingdoms.compendiums.org/mods/BossSkillTracker.dll)

## Use

Install MelonLoader, then put the DLL in the game's `Mods` folder with FieldDefaultValueHookFix.

The panel lists the monsters fighting you or your pet. Out of combat, select a boss, elite, or fabled monster to preview it. Drag a monster's header to move the panel. The compact button shrinks the rows, and the lock button stops dragging.

## Settings

In `UserData/MelonPreferences.cfg`, category `BossSkillTracker`:

| Key | Default |
| --- | --- |
| `PanelX` | `0` |
| `PanelY` | `0` |
| `PanelPositionVersion` | `0` |
| `Locked` | `false` |
| `Compact` | `false` |

When `PanelPositionVersion` is below `2`, the mod resets the panel position and sets it to `2`.

## Limits

The panel finds monsters near you, not every monster in the zone. In a world you host, the next-special timer is exact. On someone else's server, the game does not send that deadline, so the mod estimates it from the casts it sees.

## Requirements

MelonLoader and [FieldDefaultValueHookFix](../FieldDefaultValueHookFix/README.md).

# BossSkillTracker

Shows skill cooldowns and special gates for bosses, elites, and fabled monsters.

[Download BossSkillTracker.dll](https://ancient-kingdoms.compendiums.org/mods/BossSkillTracker.dll).

## Use

With MelonLoader installed, put the DLL in the game's `Mods` folder alongside FieldDefaultValueHookFix.

Enter combat to see relevant enemies, or select a qualifying monster outside combat for a preview. Drag an enemy header to move the panel when unlocked. Click the compact and lock controls to toggle them.

## Settings

In `UserData/MelonPreferences.cfg`, category `BossSkillTracker`:

| Key | Default |
| --- | --- |
| `PanelX` | `0` |
| `PanelY` | `0` |
| `PanelPositionVersion` | `0` |
| `Locked` | `false` |
| `Compact` | `false` |

Initialization upgrades `PanelPositionVersion` to `2` and resets the position when its value is below `2`.

## Limits

Requires a local player in the World scene and trackable skills. Combat discovery uses nearby monster colliders, not a world-wide list.

## Requirements

MelonLoader, Ancient Kingdoms, and [FieldDefaultValueHookFix](../FieldDefaultValueHookFix/README.md).

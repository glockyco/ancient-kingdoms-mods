# BetterBestiary

Reveals Bestiary details, adds loot tooltips and skill summaries, and opens entries directly from monsters.

[Download BetterBestiary.dll](https://ancient-kingdoms.compendiums.org/mods/BetterBestiary.dll).

## Use

With MelonLoader installed, put the DLL in the game's `Mods` folder alongside FieldDefaultValueHookFix.

Open a Bestiary detail page and click **Skills** for its skill panel. Hold Alt and left-click a monster in the world to open its entry; clicks over UI are ignored.

## Settings

In `UserData/MelonPreferences.cfg`, category `BetterBestiary`:

| Key | Default | Effect |
| --- | --- | --- |
| `AutoAddMissingBestiaryEntries` | `false` | Adds missing entries from loaded bosses, elites, and fabled monsters. |
| `ShowSkillsPanelButton` | `true` | Shows the Skills button and panel. |

## Limits

Uses runtime monster data. Its detail-render patch disables itself after an exception.

## Requirements

MelonLoader, Ancient Kingdoms, and [FieldDefaultValueHookFix](../FieldDefaultValueHookFix/README.md).

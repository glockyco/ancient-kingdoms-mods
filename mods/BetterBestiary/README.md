# BetterBestiary

Shows the full Bestiary page for every monster: details, loot tooltips, and a skill summary.

[Download BetterBestiary.dll](https://ancient-kingdoms.compendiums.org/mods/BetterBestiary.dll)

## Use

Install MelonLoader, then put the DLL in the game's `Mods` folder with FieldDefaultValueHookFix.

On a Bestiary page, click **Skills** to open the monster's skills. Hold Alt and left-click a monster in the world to open its page. Clicks on the interface are ignored.

## Settings

In `UserData/MelonPreferences.cfg`, category `BetterBestiary`:

| Key | Default | Effect |
| --- | --- | --- |
| `AutoAddMissingBestiaryEntries` | `false` | Adds Bestiary entries for loaded bosses, elites, and fabled monsters you have not met. |
| `ShowSkillsPanelButton` | `true` | Shows the Skills button and panel. |

## Limits

If drawing a Bestiary page throws an exception, the mod stops changing Bestiary pages until the game restarts.

## Requirements

MelonLoader and [FieldDefaultValueHookFix](../FieldDefaultValueHookFix/README.md).

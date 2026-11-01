# Proposal

## Why

Players will report Pocket Compendium problems as GitHub issues. A report helps only when it says which versions the player runs, on which system, where they play, which other mods are loaded and what the log shows, and few players know where any of that is. A feature that stops after an error also goes unnoticed, because nothing but the log and a red page name in the settings window shows it.

## What Changes

- An issue form for Pocket Compendium problems in `.github/ISSUE_TEMPLATE/`. It asks what went wrong and how to see it, takes the details the game fills in, and asks for the log and a screenshot.
- A report action in the settings window. It copies the details to the clipboard, opens the issue form in the browser with the details filled in, and then shows where the log file is with a button that opens its folder.
- The details name Pocket Compendium's version and build, the game and MelonLoader versions, the system, the game language, whether the player plays alone, hosts or joined a world, the other loaded mods, the features switched off and the features stopped by an error. They contain no server address, character name or file path, because the issue is public.
- When a feature stops after an error, the game's message band says so once and names the report action.
- The log records on each world entry whether the player plays alone, hosts or joined a world.
- The README's limits name the report action.
- The wording of the form, the action, its result and the message is chosen through comparisons before it ships.

## Capabilities

### New Capabilities

- `mod-problem-reports`: how a player reports a Pocket Compendium problem from the game, what a report carries, and how a feature that stopped after an error makes itself known.

### Modified Capabilities

None.

## Impact

- Code: a details and link builder in `mods/PocketCompendium/Core`, the settings window's footer, the feature registry's failure path, and a reference to `UnityEngine.IMGUIModule` for the clipboard.
- Repository: `.github/ISSUE_TEMPLATE/pocket-compendium.yml`. The labels `bug` and `mods` exist already.
- GitHub serves a form only from the default branch, so the end-to-end check of a filled-in report happens right after the release push.
- Documentation: the limits in `mods/PocketCompendium/README.md`.

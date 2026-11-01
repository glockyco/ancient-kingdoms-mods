# Proposal

## Why

Players will report Pocket Compendium problems and suggest ideas as GitHub issues. A report helps only when it says which versions the player runs, on which system, where they play, which other mods are loaded and what the log shows, and few players know where any of that is. A feature that stops after an error also goes unnoticed, because only the log and a red page name in the settings window show it. And the settings window offers no way to reach the project itself: the compendium website, the source on GitHub or Ko-fi.

## What Changes

- A new last page in the settings window, About, for Pocket Compendium itself. It shows the version and build, links the Ancient Kingdoms Compendium website, the source on GitHub, the game's Discord and Ko-fi, and holds the actions that report a problem and suggest an idea. Its icon and its further content are chosen through comparisons.
- Two issue forms in `.github/ISSUE_TEMPLATE/`, one for problems and one for ideas.
- The report action copies the details to the clipboard, opens the problem form with the details filled in, and then shows where the log file is with a button that opens its folder. The idea action opens the ideas form.
- The details name Pocket Compendium's version and build, the game and MelonLoader versions, the system, the game language, whether the player plays alone, hosts or joined a world, the other loaded mods, the features switched off and the features stopped by an error. They contain no server address, character name or file path, because the issue is public.
- The problem form and the README name the compendium channel on the game's Discord as the place to post the copied details without a GitHub account.
- When a feature stops after an error, the game's message band says so once and names the report action.
- The log records on each world entry whether the player plays alone, hosts or joined a world.
- The wording of the page, the forms, the actions and the message, and of the other settings pages' summaries and help texts, is chosen through comparisons before it ships.

## Capabilities

### New Capabilities

- `mod-about-page`: the settings page about Pocket Compendium itself, with its version, its links and the feedback actions.
- `mod-feedback`: how a player reports a problem or suggests an idea from the game, what a report carries, and how a feature that stopped after an error makes itself known.

### Modified Capabilities

None.

## Impact

- Code: a settings page that belongs to no feature, a details and link builder in `mods/PocketCompendium/Core`, the feature registry's failure path, and a reference to `UnityEngine.IMGUIModule` for the clipboard.
- Repository: a problem form and an ideas form in `.github/ISSUE_TEMPLATE/`. The labels `bug`, `enhancement` and `mods` exist already.
- GitHub serves forms only from the default branch, so the end-to-end check of both forms happens right after the release push.
- Documentation: the limits in `mods/PocketCompendium/README.md`.

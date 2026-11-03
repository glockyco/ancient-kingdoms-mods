# Proposal

## Why

Pocket Compendium announces a new version with one chat line that players miss, and they then replace the DLL by hand, so a fix such as 1.0.2's stutter fix reaches players slowly. It also checks the website from its first start without asking. The choices behind this change were made in comparisons in the game (`.local/changes/update-ux/review/1-update-ux.md` to `4-remaining.md`, 2026-11-03).

## What Changes

- At its first start, and once for players of earlier versions, Pocket Compendium asks on the start screen how to handle updates: "Install updates for me" (highlighted), "Only tell me about updates" or "Don't check for updates". Until the player answers, nothing contacts the website.
- With "Install updates for me", an updater that Pocket Compendium writes into the game's `Plugins` folder checks the website before MelonLoader loads mods and installs a higher version in the same start.
- A card on the start screen offers a new version with Install and Later, confirms a clicked Install, reports a failed one with a Download button, and says when an update has loaded. It lists what changed.
- A new Updates page before About shows a status line and the same three answers.
- The website's mod list carries each release's changes and a signature made with a key kept in Bitwarden. Pocket Compendium and its updater accept only a list with a valid signature and only a file whose checksum that list names.
- The chat line, the About page's update row and the hidden `AnnouncedChecksum` preference are removed.
- A release adds its changes to the mod registry, and a deploy signs the mod list.

## Capabilities

### New Capabilities

- `mod-updates`: how Pocket Compendium asks whether it may check for new versions, how it announces and installs them, and what it sends to the website.

### Modified Capabilities

- `player-mods`: the mod list names each release's changes and is signed, and the one download includes the updater, which Pocket Compendium writes itself.

## Impact

- `mods/PocketCompendium/`: the update check, the About page, the settings window's pages, new start-screen interface, preferences and icons.
- New projects for the updater: a small MelonLoader plugin and the update code it loads, both embedded in Pocket Compendium.
- `build-tool publish-mods`, `website/mod-downloads.json`, the website's deploy script and `CONTRIBUTING.md`'s release steps.
- `tests/PocketCompendium.Tests` and `tests/BuildTool.Tests`.
- Player documentation that describes installing or removing the mod.

# Proposal

## Why

The website's mods page offers the Pocket Compendium download without saying which version it holds. A player who compares it with the version the About page shows in game, or who reports a problem, has to download the DLL to find out.

## What Changes

- `build-tool publish-mods` reads each published mod's version from the DLL's `MelonInfo` attribute, the version MelonLoader logs and the mod shows in game, and writes it into the downloads manifest. A DLL without that version stops the publish and keeps the current downloads.
- The mods page names that version beside the mod's name.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `player-mods`: the website's mods page names the version of Pocket Compendium it offers.

## Impact

- `build-tool/Commands/PublishModsCommand.cs` and a metadata reader beside it, with tests in `tests/BuildTool.Tests/`.
- `website/static/mods/manifest.json`, which publish-mods writes and the mod's update check reads, gains a `version` field per mod.
- `website/src/routes/mods/`: a build-time load of the manifest and the version on the page.

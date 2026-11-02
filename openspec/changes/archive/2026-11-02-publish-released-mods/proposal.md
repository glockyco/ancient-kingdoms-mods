# Proposal

## Why

`build-tool publish-mods` builds every downloadable mod from the working tree, and a site deploy runs it. A deploy made for a page fix therefore published an unreleased Pocket Compendium build under the released version 1.0.0, and the mod's update notice offered it to players. Nothing tied a published DLL to a release.

## What Changes

- `publish-mods` builds each mod from the newest git tag of its releases, named `<id>-v<version>` after the mod's id in `website/mod-downloads.json`, such as `pocket-compendium-v1.0.1`, in a temporary worktree. A deploy publishes the released mods whatever the working tree holds.
- The publish fails, keeping the current downloads, when a mod has no release tag or when the DLL built from a tag names another version than the tag.
- Releasing a mod means setting its `MelonInfo` version, committing, tagging that commit and deploying.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `player-mods`: the website offers only released builds of its mods.

## Impact

- `build-tool/Commands/PublishModsCommand.cs` and `tests/BuildTool.Tests/PublishModsCommandTests.cs`.
- `CONTRIBUTING.md`, which describes `publish-mods` and gains how to release a mod.
- Release tags `pocket-compendium-v1.0.1` and `field-default-value-hook-fix-v1.0.1`.

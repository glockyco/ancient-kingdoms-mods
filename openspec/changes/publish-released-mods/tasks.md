# Tasks

## 1. Publish

- [ ] 1.1 Build each mod in `publish-mods` from the newest `<id>-v<version>` tag in a temporary worktree that gets the local `Local.props`, check that the DLL names the tag's version, and remove the worktree afterwards. Cover the newest tag, a missing tag, a version mismatch and a failed build with tests in `tests/BuildTool.Tests/PublishModsCommandTests.cs`. Verify with `dotnet test tests/BuildTool.Tests`.
- [ ] 1.2 Describe in `CONTRIBUTING.md` that publish-mods builds the released tags and how to release a mod.

## 2. Release

- [ ] 2.1 Set Pocket Compendium's version to 1.0.1, commit, and tag `pocket-compendium-v1.0.1` and `field-default-value-hook-fix-v1.0.1`. Verify with `dotnet run --project build-tool publish-mods` that the manifest names both versions from their tags while the working tree holds other changes, and that the published DLLs name the tagged commit as their build.

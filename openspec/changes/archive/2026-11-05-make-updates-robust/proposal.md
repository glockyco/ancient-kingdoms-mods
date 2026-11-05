## Why

Automatic updates failed for players in ways the mod didn't report, while it told them they had nothing to do:

- A player saw "Pocket Compendium 1.2.0 is downloaded" at every start and never got 1.2.0. The updater looked for the mod only as `Mods/PocketCompendium.dll`, but a browser saves a second download as `PocketCompendium (1).dll`, and MelonLoader loads a mod under any name.
- With two copies in `Mods`, MelonLoader loads only the first by name, which can be the older one, and the updater updated the copy that never loaded.
- A download slower than the 10-second wait never installed: every start downloaded again and ran out of time again.
- An install that failed stayed quiet, and a download still waiting at the next start was announced as loading then.
- Changing the answer while a check ran let the old answer's check stage a file and show its card, also after "Don't check for updates".
- The download completion was announced from the file alone, before its hash was written, and a broken mod file stopped the install with an error.
- The mod list, its signature and the DLL each had their own cache life, so a check right after a deploy could pair two deploys.

## What Changes

- Before mods load, the updater settles the Mods folder: one copy, under the usual name, with the newest version among the installed copies and an intact waiting download. A download left by an earlier start installs before the next check.
- Pocket Compendium removes older copies beside the one that runs, and a newer copy waiting beside it gets the updater and the card that it loads at the next start.
- A failed install, or a waiting download the updater did not install, shows "Couldn't install" with Download. Failed checks stay quiet.
- A changed answer cancels the old answer's check and drops its result.
- The updater reports what it did in every start, and announces a download only after the whole download is kept. Any error in the check becomes its result instead of stopping the install.
- The mod list and its signature are served without caching, and each version's DLL at an address of its own.

## Capabilities

### New Capabilities

### Modified Capabilities

- `mod-updates`: one copy stays installed, failed installs speak up, a changed answer stops the old one's work, and the website serves one consistent list per deploy.

## Impact

- `mods/Shared/Updates/Staging.cs`, `UpdateFiles.cs` and `mods/Shared/MelonInfoReader.cs`.
- `mods/PocketCompendiumUpdateCore/Startup.cs`.
- `mods/PocketCompendium/Core/Updates/UpdateService.cs`.
- `build-tool/Commands/PublishModsCommand.cs` and `website/_headers`.
- A player whose updater is older than this change installs once by hand, because the updater's code comes from the running mod.

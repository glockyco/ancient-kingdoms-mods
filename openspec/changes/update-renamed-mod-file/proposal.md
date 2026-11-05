## Why

A player saw "Pocket Compendium 1.2.0 is downloaded" at every start and never got 1.2.0. The updater looked for the mod only as `Mods/PocketCompendium.dll`. A browser saves a second download as `PocketCompendium (1).dll`, and MelonLoader loads a mod under any name, so the mod ran and downloaded the update while the updater took it for removed and discarded the download.

## What Changes

- The updater finds the installed mod as the DLL in `Mods` whose `MelonInfo` names Pocket Compendium, `PocketCompendium.dll` first, and updates that file in place.

## Capabilities

### New Capabilities

### Modified Capabilities

- `mod-updates`: automatic installs update a mod saved under another file name.

## Impact

- `mods/Shared/Updates/UpdateFiles.cs` and `mods/Shared/MelonInfoReader.cs`.
- A player whose updater is older than this change installs once by hand, because the updater's code comes from the running mod.

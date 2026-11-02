# Tasks

## 1. Manifest

- [x] 1.1 Read the `MelonInfo` version from each published DLL's metadata, write it into the manifest, and fail the publish for a DLL without one. Verify with `dotnet test tests/BuildTool.Tests`, whose test assembly carries a `MelonInfo` attribute, and with `dotnet run --project build-tool publish-mods`, whose manifest names Pocket Compendium 1.0.0 and FieldDefaultValueHookFix 1.0.1 as their DLLs do.

## 2. Page

- [x] 2.1 Load the manifest at build time on the mods page and show the version beside the mod's name. Verify in a browser at 1280 and 390 pixels wide that the page names the manifest's version without breaking the layout.
- [x] 2.2 Choose where and how the page names the version through a comparison (compare-options) with screenshots at both widths, and apply the answer. Verify that the answer is recorded in the vault's Ancient Kingdoms Compendium note.

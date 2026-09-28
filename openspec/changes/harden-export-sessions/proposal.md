## Why

`DataExporter.ExportAllData()` writes required files into one mutable directory. A failed run can leave old and new files together. Curated files also sit beside runtime output without a declared ownership boundary.

## What Changes

- Register exporters with stable IDs, expected outputs, requiredness, and execution functions.
- Stage each runtime export as one run. Publish an immutable session and content manifest only after all required outputs pass integrity checks.
- Make the build read exactly one validated session plus separate curated `classes.json` and `static_data.json` inputs.
- Keep class/race parity checks outside the normal build. Keep failed composition from replacing the last built database.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `game-data-export`: A successful session declares its required outputs, provenance, and hashes; failed sessions cannot replace successful ones.
- `compendium-build`: Composition verifies a single complete session and separate curated inputs before publishing the database.

## Impact

`mods/DataExporter/`, `mods/HotReplCommands/Artifacts/ArtifactCollector.cs`, `build-tool/Commands/ExportCommand.cs`, `build-pipeline/src/compendium/commands/build.py`, `build-pipeline/src/compendium/loaders/core.py`, export/build tests, and export guidance. `ExportIntegrity` separately owns immediate write-failure and missing-object fixes and removal of unused door and interactive-object exporters.

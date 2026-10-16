## Why

Each dataset currently needs an imported function, a re-export, and a hand-ordered call. This duplicates registration and permits missing or misordered loaders despite the intended foreign-key contract.

## What Changes

- Replace manual loader imports and calls with one ordered dataset descriptor list.
- Route qualifying one-file, one-model, one-table datasets through the existing validation and insert path.
- Retain custom loaders for joins, derived data, assets, and read-only record mode.
- Validate duplicate descriptors, missing files, loader-owned tables, and prerequisite order.

## Capabilities

### New Capabilities

- `pipeline-loader-registration`: Each declared dataset is loaded once in prerequisite order, with a strict boundary between simple and custom loaders.

### Modified Capabilities

- None.

## Impact

`build-pipeline/src/compendium/commands/build.py`, `loaders/__init__.py`, `loaders/core.py`, `db.py`, and focused registration/loading tests. `PipelineRobustness` separately removes the missing-input `SKIP` branches.

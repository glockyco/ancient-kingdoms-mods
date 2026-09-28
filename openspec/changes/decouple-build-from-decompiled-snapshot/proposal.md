## Why

`compendium build` reads `server-scripts/SNAPSHOT.toml` while creating the planner payload. That local snapshot is not committed. The dependency contradicts the existing guarantee that a build succeeds without it.

## What Changes

- Move planner payload generation to a dedicated verification command that requires the decompiled snapshot.
- Keep `compendium build` focused on database and website output. Do not require the snapshot or produce a verification payload.
- Preserve both planner payload outputs and combat-verification compatibility when the verification command runs.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `compendium-build`: A build without a decompiled snapshot succeeds and does not generate verification-only planner output.
- `combat-verification`: A dedicated command produces a version-matched planner payload for the verification corpus.

## Impact

`build-pipeline/src/compendium/planner_payload.py`, `commands/build.py`, `cli.py`, `planner_inputs.py`, `website/src/lib/planner/verification/`, focused tests, and game-version update procedure. The existing curated-data-parity guarantee remains unchanged.

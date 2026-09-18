## Why

Tier D observations commit frame-level diagnostic traces that the verification test does not consume. The current 18-file corpus is 28.4 MB and produces review diffs near one million lines, although its statistical sampling unit is the window.

## What Changes

- Define a compact Tier D sample that records the observed window duration, per-entity damage totals, action counts, fidelity, resource-transition evidence, and maintained-effect evidence.
- Keep full hit and action-attempt traces as temporary diagnostic artifacts instead of committed verification baselines.
- Make the verification runner derive the committed observation from the full runtime trace.
- Update the website verifier to compare compact Tier D samples without reconstructing totals from individual hits.
- Move every committed observation to schema version 2, with structural compaction limited to Tier D.
- Preserve every existing verification verdict during migration.
- Re-record the six class Tier D fixtures because the current traces do not prove their maintained effects.
- Keep per-hit samples for Tier B because one hit is that tier's statistical sampling unit.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `combat-verification`: Define tier-specific committed sample data and separate the compact evidence baseline from temporary diagnostic traces.

## Impact

- `build-tool/`: Observation normalization and committed-file output.
- `mods/CombatVerification/`: Runtime trace output remains detailed and supplies the compact derivation inputs.
- `website/src/lib/planner/verification/`: Tier D parsing and comparison.
- `verification/observations/`: One-time Tier D schema migration and substantial size reduction.
- `tests/BuildTool.Tests/`, `tests/CombatVerification.Tests/`, and website verification tests: Contract coverage for compact output and unchanged verdicts.

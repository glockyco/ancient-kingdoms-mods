## Why

`docs/plans/` remains a legacy planning hub beside OpenSpec, so current work, shipped behavior, stale
claims, and historical rationale can appear authoritative in two places. The repository needs one
planning system. Its execution is deliberately queued until the combat-verification harness and gear
planner changes are complete, so it does not compete with those higher-priority changes.

## What Changes

- Inventory every file under `docs/plans/` and every reference to that directory.
- Classify each legacy record by behavior, unfinished work, durable rationale, or disposable history.
- Move current behavior into the appropriate main OpenSpec capability specification.
- Move still-wanted unfinished work into a dedicated OpenSpec change with complete proposal, specs,
  design, and tasks artifacts.
- Reconcile partially implemented plans with the code and tests before deciding what work remains.
- Relocate only rationale that `documentation-lifecycle` permits: rejected alternatives, external
  constraints, measurements behind decisions, and deliberate omissions.
- Delete stale, completed, superseded, and fully migrated planning records instead of preserving a
  second archive.
- Remove `docs/plans/INDEX.md`, remaining `docs/plans/` pointers, and obsolete planning-tool hooks after
  every owned record and reference is resolved.
- Sequence implementation after `add-combat-verification-harness` and
  `add-gear-and-rotation-planner` are complete and archived. This proposal does not migrate any record.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `documentation-lifecycle`: define OpenSpec as the only owner of current behavior and active change
  planning, and require a lossless, reference-clean migration before a legacy planning hub is removed.

## Impact

- `docs/plans/`: audited and removed after each record has an explicit disposition.
- `openspec/specs/`: receives current behavior that exists only in legacy plans.
- `openspec/changes/`: receives still-wanted unfinished work as separate, scoped changes.
- Repository guidance and navigation: stop naming the legacy planning index as an authority.
- Planning checks and hooks: remove or repoint legacy-path integration only after no live owner depends
  on it.
- Application behavior, game data, mods, pipeline output, and website output do not change as part of
  the migration itself.

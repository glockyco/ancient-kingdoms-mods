## Why

The compendium's reference features, level-aware zones, character/mercenary planner, trip-grouped acquisition, save import and build sharing need the same facts, relations, rules and character state. Independent interpretations caused incorrect published values and would multiply across those features.

This change records the shared direction and follow-up boundaries. Preparation, vocabulary, rules and the prose audit are already implemented. The acquisition cutover is the current implementation milestone, not a restart of those foundations.

## What Changes

- Record in `design.md` the shared model of six contracts, every decision with its status and reason, the defects found, the export gaps, the order of follow-up changes, and the open questions.
- Implement nothing by itself, apart from the working-files convention already committed in `11d13b80`. Follow-up changes implement each part and cite this design by decision number.
- Reconcile overlapping changes with the model through the boundaries in `design.md`, so acquisition, read-model and publication work do not retain competing mechanisms.

## Capabilities

### New Capabilities

None. The follow-up changes add them.

### Modified Capabilities

None.

## Impact

No code changes in this change. It sets the plan for the follow-up and overlapping changes listed in `design.md` and `tasks.md`.

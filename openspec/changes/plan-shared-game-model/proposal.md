## Why

The next features of the compendium all read the same game facts, relations, rules and character state: reference pages for stats, effects, armor sets, races and crafting stations, a level-aware zone view, a character planner with mercenaries, a trip-grouped acquisition list, save import and build sharing. Today each of those has several owners. Code reading found published facts that contradict the game because of it, such as altar reward tiers and primal essence values. Building each feature on its own copy would multiply the problem.

The decisions taken on 2026-10-16 need a durable record before the work starts, so that later changes, and later sessions, build on them instead of rediscovering or contradicting them.

## What Changes

- Record in `design.md` the shared model of six contracts, every decision with its status and reason, the defects found, the export gaps, the order of follow-up changes, and the open questions.
- Implement nothing by itself, apart from the working-files convention already committed in `11d13b80`. Follow-up changes implement each part and cite this design by decision number.
- Revise the in-flight changes that conflict with the model: `prune-unread-database-data`, `show-pack-and-random-sources-in-map-popups`, `consolidate-server-read-models` and `add-security-headers`.

## Capabilities

### New Capabilities

None. The follow-up changes add them.

### Modified Capabilities

None.

## Impact

No code changes in this change. It sets the plan for every follow-up change listed in `tasks.md` and changes the scope of four in-flight changes.

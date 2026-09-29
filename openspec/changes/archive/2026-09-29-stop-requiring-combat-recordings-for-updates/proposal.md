## Why

The combat-verification spec requires a current observation for every committed fixture before a game update is published. A full recording takes about 3.5 hours of game time, and the combat simulator is still work in progress. On 2026-09-29 the owner decided that combat recordings must not block game updates. The update skill already follows that decision, so the spec and the verification guide contradict it.

## What Changes

- Stale observations are reported and do not count as current evidence, but they no longer block a game update.
- A complete current corpus is required only for an explicit full-domain claim, through the opt-in strict gate.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `combat-verification`: Remove the update-completion requirement for current observations.

## Impact

`openspec/specs/combat-verification/spec.md` and `docs/combat-model/verification.md`. No code changes: the routine test already treats stale observations as neither pass nor fail.

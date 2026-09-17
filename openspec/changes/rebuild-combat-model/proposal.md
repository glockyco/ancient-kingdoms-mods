## Why

The combat model has stalled. Two active changes, `add-gear-and-rotation-planner` and
`add-combat-verification-harness`, hold 213 tasks that block each other, and neither can close a
single verified result. The code they produced is split: the source-cited formula modules are sound, but
the evaluator composes them as a static calculation that the current design itself rejects, and the
verification harness has never completed one end-to-end run. The game moved to 0.9.32.4 and added a
class that the planner payload drops without a stated reason. This change replaces both plans with one
plan that a single verified slice at a time can close.

## What Changes

- Replace the deterministic-expectation evaluator with one Monte Carlo event engine. The engine
  samples the engine's own random draws with a seeded generator, runs a declared number of replicates,
  and reports the mean, the standard error, and per-ability and per-entity attribution from the runs
  it made. A result is reproducible for a fixed build, scenario, seed, and replicate count.
  **BREAKING**: `evaluateDeterministicFixture`, the fractional-knapsack rotation solver, and the
  `MODEL_ERROR_CALIBRATION` boundary are removed. No published surface consumes them.
- Keep the source-cited formula modules: numeric kernel, caster stat sheet, target terms, hit
  pipeline, timing, legality, logical build, capture adapter, scenario parser, and catalog resolver.
  Refactor resources, timed effects, and companions from standalone expectation helpers into handlers
  on the engine state.
- Define one verification protocol with four diagnostic tiers: stat sheet, single hit per skill
  handler, basic-attack cadence, and sustained rotation windows with autonomous companions. The
  harness materializes a fixture and writes an observation file. A website test compares each committed
  observation against the model's predictive distribution. Committed observations are the baseline, and
  a change to one is reviewed as a diff. The reviewed-baseline promotion workflow, the retained-scratch
  reuse path, and the C# comparison engine are removed.
- State the model's class domain in the planner payload. The payload names each excluded class with a
  reason. Bard is excluded by name because its song system is a separate mechanic family that no
  current formula covers, not by a resource-type filter.
- Supersede `add-gear-and-rotation-planner` and `add-combat-verification-harness`. Their measured
  evidence moves to `docs/combat-model/evidence.md` before their change directories are deleted. The
  gear optimizer, the calculator page, and the local capture import become separate follow-up changes
  that consume this engine.

Non-goals, recorded so that later work does not treat them as omissions:

- A build optimizer, a planner or calculator route, a compute worker, permalinks, or a capture import.
- Bard mechanics. The class is an explicit exclusion until a change adds its song model.
- Party support profiles, survivability, healing, threat, multi-target, or movement simulation.
- Bit-exact reproduction of the game's random sequence.

## Capabilities

### New Capabilities

- `combat-model`: What the Monte Carlo engine guarantees about the numbers it produces. Covers source
  traceability, the sampled event timeline, reproducibility, the hit pipeline, timing, resources,
  effects, companions, learned books, the scenario contract, the explicit class domain, and the
  boundary between computed values and stated assumptions.
- `combat-verification`: What a verified fixture guarantees. Covers shared build data, fixture
  execution data, materialization through engine paths, the four diagnostic tiers, observation files,
  the comparison protocol, and the committed-observation baseline.

### Modified Capabilities

- `runtime-control`: The scratch-database redirect, the exact owned path check, and the reported-path
  translation that a verification run uses. These commands exist in `HotReplCommands` and
  `CombatVerification` but no main spec describes them.
- `game-toolchain`: The verification run lifecycle: exclusive session ownership, the verified
  player-save backup, build identity by assembly hash, one fresh scratch database per fixture, cleanup
  on every outcome, and observation persistence.

## Impact

- `website/src/lib/planner/`: `evaluate.ts`, `rotation.ts`, and `uncertainty.ts` are removed with
  their tests. `resource.ts`, `effects.ts`, and `companion.ts` become engine handlers. New modules:
  a seeded random source, the event engine, the player action policy, the companion policy, the
  result summary, and the verification comparison test that reads `verification/observations/`.
- `build-pipeline/src/compendium/planner_payload.py` and `planner_inputs.py`: explicit class-domain
  declaration replaces the resource-type filter.
- `mods/CombatVerification/`: `Comparison/` and `BaselineCommands.cs` are removed. Materialization,
  probes, and fixture validation remain. A `fixture.observe` command runs a fixture's declared
  measurement and returns the observation record.
- `build-tool/`: `VerifyCommand` writes observation files and drops scratch reuse and baseline
  handling. `VerificationScratch` loses its reuse marker.
- `verification/`: `fixtures/` is re-derived by tier. `observations/` holds committed observation
  files. `baselines/`, if present, is removed.
- `openspec/changes/`: the two superseded change directories are deleted after their evidence moves.
- `docs/combat-model/`: new evidence and verification runbook location.
- `citations.lock.json`: every constant the engine applies keeps or gains a citation.

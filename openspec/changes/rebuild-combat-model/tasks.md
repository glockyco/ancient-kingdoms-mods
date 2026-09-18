## 1. Engine core

- [x] 1.1 Add `random.ts` with `splitmix32` seeding and `xoshiro128**`, a float draw in [0, 1), a range draw, and a Bernoulli draw. Verify with tests for a known reference sequence, for identical output from identical seeds, and for a replicate stream derived from seed and index.
- [x] 1.2 Add `engine.ts` with entity state, target state, the exact-timestamp event queue with stable ordering, and the one-second tick. Verify with tests that two events at one timestamp resolve in insertion order and that recovery runs at whole seconds only.
- [x] 1.3 Move `resource.ts` to an engine handler at cast, hit, incoming-damage, and tick events. Verify the matched Rogue and Warrior transition from the evidence file reproduces per replicate.
- [x] 1.4 Move `effects.ts` to an engine handler with source and recipient entities, category replacement in the recipient's list, lazy expiry until the cleanup tick, and cooldown reduction. Verify with tests for weaker-over-stronger replacement, different-recipient isolation, and one-tick contribution after expiry.
- [x] 1.5 Add the hit event handler over `hit.ts` with sampled variance, avoidance, critical, and resist draws, projectile cast and arrival, and death voiding. Verify with tests that the sampled mean over 10,000 draws lies within three standard errors of the analytic value for one fixed hit and that a projectile arriving after death deals nothing.
- [x] 1.6 Add `policy.ts` with the fixture schedule policy and the priority-list player policy, applying legality, weapon category, assassination threshold, affordability, and cooldown gates at each decision event. Verify with tests that a declared schedule is never reordered and that a priority list skips a gated skill and records the refusal.
- [x] 1.7 Move `companion.ts` to a sampled companion policy with the 2 to 4 s timer, uniform ready-skill choice, haste-reduced follow-up cooldown, and healer reserve, and record the in-range state. Verify with tests that the sampled special-action gaps over 1,000 windows stay inside the source-cited 2 to 4 s timer bound.
- [x] 1.8 Add `simulate.ts` that runs the declared replicates over a parsed scenario and returns per-entity, per-ability, per-school totals, cast, refused, and landed counts, and effect uptimes with mean, standard error, and replicate count. Verify with tests that identical inputs produce byte-identical results and that two builds under one seed consume identical draws while their event orders agree.
- [x] 1.9 Delete `evaluate.ts`, `rotation.ts`, `uncertainty.ts`, and their tests. Verify `pnpm check` passes with no reference to the removed exports.
- [x] 1.10 Measure the default replicate count against the level-50 default build over a 60 s window and record it in `docs/combat-model/evidence.md`. Verify the standard error at that count is below one percent of the mean.

## 2. Class domain

- [x] 2.1 Replace the resource-type filter in `planner_payload.py` with declared supported and excluded class sets and emit a `classDomain` block with each exclusion reason. Verify a pipeline test fails when the export contains a class that is in neither set.
- [x] 2.2 Refuse a build of an excluded class in `catalog-resolver.ts` with the reason. Verify with a test that a Bard build is refused and names the song-system reason.
- [x] 2.3 Rebuild the payload and verify the reproducibility tests pass with the new block and the redaction check covers it.

## 3. Harness measurement

- [x] 3.1 Add the tier measurement declaration to the fixture execution data: tier, quantity list, minimum samples, and window count. Verify shape validation refuses a fixture without it and the 33 descriptors are migrated.
- [x] 3.2 Add `fixture.observe` to `CombatVerification` that runs the declared tier measurement through the existing probes and returns the observation record with achieved state, seed, units, windows, raw samples, action counts, and attribution fidelity. Verify with game-free tests for record shape and with a game-backed run for tier A on one class.
- [x] 3.3 Remove `Comparison/`, `BaselineCommands.cs`, their DTOs, and their tests. Verify the mod and test projects build.
- [x] 3.4 Remove scratch reuse from `VerificationScratch` and `VerifyCommand`; create a fresh scratch database per fixture attempt. Verify the build-tool tests cover fresh creation and removal per fixture and that no reuse marker is written.
- [x] 3.5 Write `verification/observations/<fixture>.json` from `VerifyCommand` for each completed fixture and report each failed stage without writing. Verify with a build-tool test that a readback mismatch writes no file and that the run continues.
- [x] 3.6 Run `build-tool verify` for one tier A fixture end to end and confirm the player save hash is unchanged. Verify the observation file exists and carries the current assembly hash.
- [x] 3.7 Materialize the fixture target through engine paths: resolve the declared spawn at its level, place the player in cast range with the declared facing, and read the target's state back before measurement. Verify with a game-backed run that the target-state probe reports the declared spawn and level and that a mismatch stops the measurement.
- [x] 3.8 Drive the declared actions as a priority list through `PlayerSkills.CmdUse` for the declared window count, recording attempted, accepted, completed, and landed counts from the probes, and extend `fixture.observe` to tiers B, C, and D. The window opens at the first completed action so the approach walk stays outside it. Verify with a game-backed run that one tier C window records intervals and counts.
- [x] 3.9 Use each consumable the fixture execution declares before measurement, through the game's own use path, and record the resulting effects in the observation. Verify with a game-backed run that `A-consumables` reports its food and potion buffs active and its sheet passes with them applied.

## 4. Comparison suite

- [x] 4.1 Add `verification.test.ts` that reads every fixture and observation, checks the assembly hash against `server-scripts/SNAPSHOT.toml`, and reports stale, missing, pass, fail, or inconclusive per fixture. Verify with a synthetic stale observation that it reports stale without failing.
- [x] 4.2 Implement exact comparison for deterministic quantities, the support-band check for per-hit ratios, and the Welch test for stochastic means with per-quantity minimum samples. Verify with tests for one exact mismatch, one out-of-band hit, one rejection at 0.01, and one inconclusive window.
- [ ] 4.3 Add the coverage report over executed evidence: handler, school, class, and archetype from observation traces. Verify a fixture whose trace reaches a different handler is not credited for its label. Class credit from the achieved stat sheet is in place; handler, school, and archetype credit need the tier B and D traces from task 3.8.

## 5. Tier A: stat sheet

- [x] 5.1 Re-author the tier A fixtures for six classes, veteran progression, three- and five-piece sets, caps, augments, consumables, and one learned book, and move `A-haste-floor` to the Rogue. Verify shape validation passes for each.
- [x] 5.2 Record tier A observations for every fixture. Verify each fixture passes exact comparison. All 14 pass; `A-consumables` passes as a bare sheet until task 3.9 uses its consumables.

## 6. Tier C: cadence

- [x] 6.1 Re-author the tier C fixtures for three weapon delays and the haste floor on the Rogue. Verify shape validation passes.
- [x] 6.2 Record tier C observations. Verify each interval passes under the declared timing protocol.

## 7. Tier B: one hit per handler

- [ ] 7.1 Re-author the tier B fixtures for every damaging handler and every school, including the ignored-multiplier and ignored-caster-stat handlers, a lower-level case, and one applied target debuff with settled target state. Verify shape validation passes.
- [ ] 7.2 Record tier B observations. Verify each per-hit ratio lies in the support band and the coverage report credits every handler and school.

## 8. Tier D: rotation windows and companions

- [ ] 8.1 Re-author the tier D fixtures: one repeated rotation per class with a resource transition and one maintained effect, and a bare and an equipped window per mercenary archetype. Verify shape validation passes and each declares its minimum window count.
- [ ] 8.2 Record tier D observations. Verify each fixture passes or reports inconclusive with its sample counts, and that the coverage report credits every class and archetype.

## 9. Evidence and closure

- [x] 9.1 Write `docs/combat-model/evidence.md` from the measured tables of the two superseded designs, each with its recorded game build and scope, and add the replicate measurement. Verify every cited game build and assembly hash in the file matches the source design text.
- [ ] 9.2 Delete `openspec/changes/add-gear-and-rotation-planner` and `openspec/changes/add-combat-verification-harness`. Verify `openspec list` shows neither.
- [x] 9.3 Write `docs/combat-model/verification.md` with the run procedure, the isolation guarantee, the observation format, the protocol, and how to read stale and inconclusive results. Verify `scripts/check-agent-docs.sh` passes.
- [ ] 9.4 Add the current-observation requirement to the game-version update procedure in `skill://update-game-version`. Verify the procedure names the verify command and the stale check.
- [ ] 9.5 Add or confirm a citation for every constant the engine applies. Verify the citation ledger check passes.
- [ ] 9.6 Run the planner tests, the pipeline tests, the CombatVerification tests, the build-tool build, `pnpm check`, `pnpm lint`, and `openspec validate rebuild-combat-model --strict`. Verify all pass.

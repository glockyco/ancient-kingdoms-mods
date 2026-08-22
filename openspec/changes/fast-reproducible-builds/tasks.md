## 1. Establish the baseline

- [x] 1.1 Record the current build time, the `redactions check` time, and the profile of one build, so every later claim compares against a measurement.
- [x] 1.2 Record the size of `website/static/images` and the count of published files.
- [x] 1.3 Record the published chest drop chances for the 14 chests that carry them, so the one-time shift from seeding is reviewable.

## 2. Reproducible estimates

- [ ] 2.1 Give the chest simulation a `random.Random(0)` constructed inside the call, so the estimate does not depend on how many draws earlier chests consumed.
- [ ] 2.2 Rename the function to say that it estimates, and correct the docstring that claims it matches the game exactly.
- [ ] 2.3 Add a test that the same reward list and item count produce the same numbers twice, and that changing one chest leaves another chest unchanged.
- [ ] 2.4 Compare the published chances against the task 1.3 record, and confirm every difference is below 0.004.

## 3. Encode settings

- [ ] 3.1 Lower the lossless sprite encode to method 4, leaving the lossy path at 6.
- [ ] 3.2 Record the measured encode time and the total published size against the task 1.1 and 1.2 baseline.
- [ ] 3.3 Add a test that encoding one source twice produces the same bytes, so a toolchain change that breaks determinism fails rather than passes quietly.

## 4. Recording separated from publishing

- [ ] 4.1 Split the visual asset loader so that recording the manifest rows and publishing the encoded files are separate steps, without a flag that switches off most of one function.
- [ ] 4.2 Point the redaction recomputation at the recording step, and delete the scratch static directory that compensates for the fused one.
- [ ] 4.3 Prove the recomputation publishes nothing: count the files in `website/static/images` before and after `redactions check`, and confirm the directories for removed entities stay absent.
- [ ] 4.4 Prove the build still publishes every recorded asset, by confirming `visual_assets.reconcile` reports no orphan and the file count matches the row count.

## 5. Invariant scan

- [ ] 5.1 Match every identifier in one pass per value rather than one pass per identifier, keeping the whole-identifier rule that lets `key_to_old_valorath` pass.
- [ ] 5.2 Confirm the existing scan tests still pass unchanged, including the underscore wildcard case and the allowance cases.

## 6. Close out

- [ ] 6.1 Run `cd build-pipeline && uv run pytest`, `uv run mypy .`, and `uv run ruff check`.
- [ ] 6.2 Rebuild end to end and record the new build time against the task 1.1 baseline, explaining any step that did not move as expected.
- [ ] 6.3 Run `compendium redactions check` and record its time. Confirm it is fast enough to keep in the pre-commit hook.
- [ ] 6.4 Rebuild a second time and confirm the published values are identical to the first, which is the reproducibility requirement measured rather than asserted.
- [ ] 6.5 Decide the open question on a fixture hash test, and either add it or record why not.
